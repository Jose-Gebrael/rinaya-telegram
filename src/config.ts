// Everything the bot reads from .env (every variable is explained in .env.example).
import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is missing from .env`);
  return v;
}

function graceUntil(): Date | null {
  const v = process.env.TELEGRAM_GRACE_UNTIL;
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) throw new Error("TELEGRAM_GRACE_UNTIL is not a date (use 2026-10-21T12:00:00Z)");
  return d;
}

export const config = {
  botToken: required("TELEGRAM_BOT_TOKEN"),
  // The community supergroup's id (-100…).
  groupId: Number(required("TELEGRAM_GROUP_ID")),
  // The group's invite link with "approve new members" on: anyone can open it,
  // the bot decides who gets in.
  inviteUrl: required("TELEGRAM_INVITE_URL"),
  // Members already in the group who never connect are removed after this
  // date. Empty: nobody is removed for not connecting.
  graceUntil: graceUntil(),
  sweepMinutes: Number(process.env.TELEGRAM_SWEEP_MINUTES || 10),
  rewireUrl: process.env.REWIRE_APP_URL || "https://rewire.rinaya.org",
  billingUrl: process.env.BILLING_URL || "https://rinaya.org/rewire/account",
};
