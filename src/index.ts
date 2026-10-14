// Starts the bot (long polling: no public port, no webhook) and the sweep.
import { createBot } from "./bot";
import { config } from "./config";
import { log } from "./log";
import { prisma } from "./prisma";
import { sweep } from "./sweep";

const bot = createBot();
let timer: NodeJS.Timeout | undefined;

async function stop() {
  clearInterval(timer);
  await bot.stop();
  await prisma.$disconnect();
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);

await bot.init();
log("started", { bot: bot.botInfo.username, groupId: config.groupId, sweepMinutes: config.sweepMinutes, graceUntil: config.graceUntil?.toISOString() ?? null });

timer = setInterval(() => void sweep(bot.api), config.sweepMinutes * 60 * 1000);
void sweep(bot.api);

await bot.start({
  allowed_updates: ["message", "chat_member", "chat_join_request"],
  drop_pending_updates: false,
});
