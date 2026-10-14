// The bot's handlers. It only acts in private chats and in the one community
// group (TELEGRAM_GROUP_ID); anything else is ignored.
import { Bot } from "grammy";
import { config } from "./config";
import { dm, isAdminStatus, isInGroupStatus, memberNow, seen } from "./group";
import { decideJoin, hello, membershipChanged, redeem } from "./linking";
import { log } from "./log";
import { msg, type Reply } from "./messages";

export function createBot() {
  const bot = new Bot(config.botToken);
  const options = (r: Reply) => (r.keyboard ? { reply_markup: r.keyboard } : {});

  // t.me/<bot>?start=<code> from Rewire or rinaya.org, or a plain /start.
  bot.chatType("private").command("start", async (ctx) => {
    const code = ctx.match.trim();
    const reply = code ? await redeem(ctx.api, code, ctx.from) : await hello(ctx.from);
    await ctx.reply(reply.text, options(reply));
  });

  bot.on("chat_join_request", async (ctx) => {
    const req = ctx.chatJoinRequest;
    if (req.chat.id !== config.groupId) return;
    const d = await decideJoin(req.from);
    if (d.approve) await ctx.api.approveChatJoinRequest(config.groupId, req.from.id);
    else await ctx.api.declineChatJoinRequest(config.groupId, req.from.id);
    if (d.reply) await dm(ctx.api, req.user_chat_id, d.reply);
    log(d.approve ? "join_approved" : "join_declined", { userId: d.userId, telegramId: req.from.id });
  });

  // Joins, leaves, removals and promotions (needs the bot to be an admin, and
  // "chat_member" in allowed_updates, see index.ts).
  bot.on("chat_member", async (ctx) => {
    const u = ctx.chatMember;
    if (u.chat.id !== config.groupId) return;
    await membershipChanged(u.new_chat_member.user, isInGroupStatus(u.new_chat_member), isAdminStatus(u.new_chat_member));
  });

  // Anyone who talks in the group is in it: how the bot learns about members
  // who were there before it.
  bot.chatType(["group", "supergroup"]).on("message", async (ctx, next) => {
    if (ctx.chat.id === config.groupId && ctx.from) await seen(ctx.from, true);
    await next();
  });

  // /announce in the group, by an admin: tells members to connect, with the grace date.
  bot.chatType(["group", "supergroup"]).command("announce", async (ctx) => {
    if (ctx.chat.id !== config.groupId) return;
    const me = await memberNow(ctx.api, ctx.from.id);
    if (!me || !isAdminStatus(me)) return;
    const reply = msg.announcement(config.graceUntil);
    await ctx.reply(reply.text, options(reply));
    try { await ctx.deleteMessage(); } catch {} // the /announce command itself
  });

  bot.catch((err) => log("handler_failed", { update: err.ctx.update.update_id, error: err.error instanceof Error ? err.error.message : String(err.error) }));
  return bot;
}
