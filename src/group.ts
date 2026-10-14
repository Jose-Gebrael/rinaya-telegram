// The community group: who is in it, and removing people from it.
import type { Api, RawApi } from "grammy";
import type { ChatMember, User } from "grammy/types";
import { config } from "./config";
import { log } from "./log";
import type { Reply } from "./messages";
import { prisma } from "./prisma";

type BotApi = Api<RawApi>;

export function isInGroupStatus(m: ChatMember): boolean {
  return m.status === "member" || m.status === "administrator" || m.status === "creator" || (m.status === "restricted" && m.is_member);
}

export function isAdminStatus(m: ChatMember): boolean {
  return m.status === "administrator" || m.status === "creator";
}

// Her membership as Telegram sees it right now, or null if Telegram doesn't know her.
export async function memberNow(api: BotApi, telegramId: number | bigint): Promise<ChatMember | null> {
  try {
    return await api.getChatMember(config.groupId, Number(telegramId));
  } catch {
    return null;
  }
}

// Remembers someone seen in the group (bots are never recorded, so never removed).
export async function seen(user: User, inGroup: boolean, isAdmin?: boolean) {
  if (user.is_bot) return;
  const now = new Date();
  const fields = {
    username: user.username?.slice(0, 64) ?? null,
    first_name: user.first_name.slice(0, 128),
    in_group: inGroup,
    last_seen_at: now,
    ...(isAdmin === undefined ? {} : { is_admin: isAdmin }),
  };
  await prisma.telegram_members.upsert({
    where: { telegram_id: BigInt(user.id) },
    create: { telegram_id: BigInt(user.id), first_seen_at: now, ...fields },
    update: fields,
  });
}

// Removes her from the group without banning her: a ban, then an unban, so she
// can ask to join again later (the bot decides then).
export async function removeFromGroup(api: BotApi, telegramId: number | bigint, reason: string): Promise<boolean> {
  const id = Number(telegramId);
  try {
    await api.banChatMember(config.groupId, id);
    await api.unbanChatMember(config.groupId, id, { only_if_banned: true });
  } catch (e) {
    log("remove_failed", { telegramId: id, reason, error: (e as Error).message });
    return false;
  }
  await prisma.telegram_members.updateMany({ where: { telegram_id: BigInt(id) }, data: { in_group: false } });
  log("removed", { telegramId: id, reason });
  return true;
}

// A direct message; fails quietly when she never started the bot or blocked it.
export async function dm(api: BotApi, chatId: number | bigint, reply: Reply) {
  try {
    await api.sendMessage(Number(chatId), reply.text, reply.keyboard ? { reply_markup: reply.keyboard } : {});
    return true;
  } catch {
    return false;
  }
}
