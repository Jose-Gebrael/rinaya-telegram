// One-off: records everyone already in the group in telegram_members, so the
// grace period can remove the ones who never connect. The Bot API can't list
// a group's members, so this logs in as the bot over MTProto (GramJS), which
// can. Needs TELEGRAM_API_ID and TELEGRAM_API_HASH (my.telegram.org → API
// development tools) next to the bot's own variables in .env.
//
//   npm run import-members            # shows what it found, writes nothing
//   npm run import-members -- --write # records them
//
// Safe to run again: it only adds or refreshes rows.
import "dotenv/config";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { config } from "../src/config";
import { prisma } from "../src/prisma";

const write = process.argv.includes("--write");
const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
if (!apiId || !apiHash) throw new Error("TELEGRAM_API_ID and TELEGRAM_API_HASH are missing from .env");

const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 3 });
client.setLogLevel("error" as never);
await client.start({ botAuthToken: config.botToken });

let people = 0, admins = 0, bots = 0;
const now = new Date();
for await (const u of client.iterParticipants(config.groupId)) {
  if (u.bot) { bots++; continue; }
  const p = (u as unknown as { participant?: unknown }).participant;
  const isAdmin = p instanceof Api.ChannelParticipantAdmin || p instanceof Api.ChannelParticipantCreator;
  people++;
  if (isAdmin) admins++;
  if (!write) continue;
  const fields = {
    username: u.username?.slice(0, 64) ?? null,
    first_name: (u.firstName ?? "").slice(0, 128),
    in_group: true,
    is_admin: isAdmin,
    last_seen_at: now,
  };
  const id = BigInt(u.id.toString());
  await prisma.telegram_members.upsert({ where: { telegram_id: id }, create: { telegram_id: id, first_seen_at: now, ...fields }, update: fields });
}

console.log(`${people} members (${admins} admins), ${bots} bots skipped. ${write ? "Recorded." : "Nothing written: add --write to record them."}`);
await client.disconnect();
await prisma.$disconnect();
process.exit(0);
