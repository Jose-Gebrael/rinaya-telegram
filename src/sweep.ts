// The sweep, every few minutes: removes members whose Rewire access closed,
// tells removed members when their access is back, and, once the grace period
// is over, removes members who never connected. Access changes come from
// rinaya.org's billing, Rewire's grants and the admin app; reading the
// database on a timer covers all of them without touching any of that code.
import type { Api, RawApi } from "grammy";
import { openAccess } from "./access";
import { config } from "./config";
import { dm, isAdminStatus, isInGroupStatus, memberNow, removeFromGroup, seen } from "./group";
import { log } from "./log";
import { msg } from "./messages";
import { prisma } from "./prisma";

export type SweepAction = "remove-closed" | "remove-not-connected" | "welcome-back" | null;

// What to do about one Telegram account. Admins are never touched.
export function sweepAction(p: {
  inGroup: boolean;
  isAdmin: boolean;
  connected: boolean; // a Rewire account is linked to this Telegram account
  open: boolean; // that account's access is open
  status: string | null; // telegram_links.status
  graceOver: boolean;
}): SweepAction {
  if (p.isAdmin) return null;
  if (p.connected) {
    if (p.inGroup && !p.open) return "remove-closed";
    if (!p.inGroup && p.open && p.status === "suspended") return "welcome-back";
    return null;
  }
  return p.inGroup && p.graceOver ? "remove-not-connected" : null;
}

let running = false;

export async function sweep(api: Api<RawApi>, now = new Date()) {
  if (running) return;
  running = true;
  try {
    await refreshAdmins(api);
    const [members, links] = await Promise.all([
      prisma.telegram_members.findMany({ where: { in_group: true } }),
      prisma.telegram_links.findMany({ where: { telegram_id: { not: null } } }),
    ]);
    const open = await openAccess(links.map((l) => l.user_id));
    const linkOf = new Map(links.map((l) => [l.telegram_id!.toString(), l]));
    const memberOf = new Map(members.map((m) => [m.telegram_id.toString(), m]));
    const ids = new Set([...memberOf.keys(), ...links.filter((l) => l.status === "suspended" || l.status === "member").map((l) => l.telegram_id!.toString())]);
    const graceOver = !!config.graceUntil && now >= config.graceUntil;

    for (const id of ids) {
      const link = linkOf.get(id) ?? null;
      const member = memberOf.get(id) ?? null;
      const action = sweepAction({
        inGroup: !!member || link?.status === "member",
        isAdmin: !!member?.is_admin,
        connected: !!link,
        open: !!link && open.has(link.user_id),
        status: link?.status ?? null,
        graceOver,
      });
      if (!action) continue;
      await act(api, BigInt(id), action, link?.user_id ?? null);
    }
  } catch (e) {
    log("sweep_failed", { error: (e as Error).message });
  } finally {
    running = false;
  }
}

async function act(api: Api<RawApi>, telegramId: bigint, action: SweepAction, userId: number | null) {
  if (action === "welcome-back") {
    await prisma.telegram_links.update({ where: { user_id: userId! }, data: { status: "linked" } });
    await dm(api, telegramId, msg.welcomeBack());
    log("welcome_back", { userId, telegramId });
    return;
  }
  // Before removing anyone, ask Telegram: she may have left, or become an admin.
  const now = await memberNow(api, telegramId);
  if (!now || !isInGroupStatus(now)) {
    await prisma.telegram_members.updateMany({ where: { telegram_id: telegramId }, data: { in_group: false } });
    if (userId && action === "remove-closed") {
      await prisma.telegram_links.updateMany({ where: { user_id: userId, status: "member" }, data: { status: "left" } });
    }
    return;
  }
  if (isAdminStatus(now)) {
    await prisma.telegram_members.updateMany({ where: { telegram_id: telegramId }, data: { is_admin: true } });
    return;
  }
  if (action === "remove-closed") {
    // Marked first, so the "left the group" update Telegram sends next doesn't overwrite it.
    await prisma.telegram_links.update({ where: { user_id: userId! }, data: { status: "suspended", kicked_at: new Date() } });
    if (await removeFromGroup(api, telegramId, "access_closed")) await dm(api, telegramId, msg.removedClosed());
    else await prisma.telegram_links.update({ where: { user_id: userId! }, data: { status: "member", kicked_at: null } });
  } else if (action === "remove-not-connected") {
    if (await removeFromGroup(api, telegramId, "not_connected")) await dm(api, telegramId, msg.removedNotConnected());
  }
}

// The group's admins as Telegram lists them, so the sweep never removes one.
async function refreshAdmins(api: Api<RawApi>) {
  const admins = await api.getChatAdministrators(config.groupId);
  const ids = admins.filter((a) => !a.user.is_bot).map((a) => BigInt(a.user.id));
  await prisma.telegram_members.updateMany({ where: { is_admin: true, telegram_id: { notIn: ids } }, data: { is_admin: false } });
  for (const a of admins) await seen(a.user, true, true);
}
