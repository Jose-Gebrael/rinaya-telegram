// Connecting her Telegram account to her Rewire account: Rewire or rinaya.org
// writes a one-time code on her telegram_links row and opens
// t.me/<bot>?start=<code>; the bot reads it here and saves her Telegram id.
import type { Api, RawApi } from "grammy";
import type { User } from "grammy/types";
import { isOpen } from "./access";
import { dm, isInGroupStatus, memberNow, removeFromGroup, seen } from "./group";
import { log } from "./log";
import { msg, type Reply } from "./messages";
import { prisma } from "./prisma";

// The codes Rewire and rinaya.org write: 43 base64url characters.
const CODE = /^[A-Za-z0-9_-]{20,64}$/;

export async function redeem(api: Api<RawApi>, code: string, from: User): Promise<Reply> {
  if (!CODE.test(code)) return msg.badLink();
  const link = await prisma.telegram_links.findUnique({ where: { link_token: code } });
  if (!link || !link.link_token_expires_at || link.link_token_expires_at.getTime() < Date.now()) {
    log("link_bad_code", { telegramId: from.id, found: !!link });
    return msg.badLink();
  }
  const telegramId = BigInt(from.id);

  // One Telegram account per Rewire account: if this one was connected to
  // another Rewire account, it moves here (it is the same person either way).
  const other = await prisma.telegram_links.findUnique({ where: { telegram_id: telegramId } });
  if (other && other.user_id !== link.user_id) {
    await prisma.telegram_links.update({ where: { user_id: other.user_id }, data: { telegram_id: null, telegram_username: null, status: "none" } });
    log("link_moved", { telegramId: from.id, fromUser: other.user_id, toUser: link.user_id });
  }
  // She connected a different Telegram account than before: the old one leaves the group.
  if (link.telegram_id && link.telegram_id !== telegramId) {
    const old = await memberNow(api, link.telegram_id);
    if (old && isInGroupStatus(old) && old.status !== "creator" && old.status !== "administrator") {
      if (await removeFromGroup(api, link.telegram_id, "replaced")) await dm(api, link.telegram_id, msg.replaced());
    }
  }

  const member = await memberNow(api, from.id);
  const inGroup = !!member && isInGroupStatus(member);
  if (member) await seen(from, inGroup, member.status === "administrator" || member.status === "creator");
  const open = await isOpen(link.user_id);
  const now = new Date();
  await prisma.telegram_links.update({
    where: { user_id: link.user_id },
    data: {
      telegram_id: telegramId,
      telegram_username: from.username?.slice(0, 64) ?? null,
      status: inGroup ? "member" : "linked",
      link_token: null,
      link_token_expires_at: null,
      linked_at: now,
      ...(inGroup ? { joined_at: link.joined_at ?? now } : {}),
    },
  });
  log("linked", { userId: link.user_id, telegramId: from.id, inGroup, open });
  // In the group with closed access: the next sweep removes her.
  return msg.connected(open, inGroup);
}

// /start without a code.
export async function hello(from: User): Promise<Reply> {
  const link = await prisma.telegram_links.findUnique({ where: { telegram_id: BigInt(from.id) } });
  return link ? msg.helloConnected(await isOpen(link.user_id)) : msg.hello();
}

// A join request: in only when connected with open access.
export async function decideJoin(from: User): Promise<{ approve: boolean; userId: number | null; reply?: Reply }> {
  const link = await prisma.telegram_links.findUnique({ where: { telegram_id: BigInt(from.id) } });
  if (!link) return { approve: false, userId: null, reply: msg.declinedNotConnected() };
  if (!(await isOpen(link.user_id))) return { approve: false, userId: link.user_id, reply: msg.declinedClosed() };
  return { approve: true, userId: link.user_id };
}

// Telegram told us her membership changed (joined, left, removed, promoted).
export async function membershipChanged(user: User, inGroup: boolean, isAdmin: boolean) {
  await seen(user, inGroup, isAdmin);
  const link = await prisma.telegram_links.findUnique({ where: { telegram_id: BigInt(user.id) } });
  if (!link) return;
  if (inGroup && link.status !== "member") {
    await prisma.telegram_links.update({ where: { user_id: link.user_id }, data: { status: "member", joined_at: new Date() } });
    log("joined", { userId: link.user_id, telegramId: user.id });
  } else if (!inGroup && link.status === "member") {
    // A removal by the sweep is marked "suspended" before it happens, so this is her leaving.
    await prisma.telegram_links.update({ where: { user_id: link.user_id }, data: { status: "left" } });
    log("left", { userId: link.user_id, telegramId: user.id });
  }
}
