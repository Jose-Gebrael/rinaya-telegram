// Everything the bot says, in one place. Customer-facing: wording changes are
// the user's call.
import { InlineKeyboard } from "grammy";
import { config } from "./config";

export type Reply = { text: string; keyboard?: InlineKeyboard };

const joinButton = () => new InlineKeyboard().url("Join the group", config.inviteUrl);
const renewButton = () => new InlineKeyboard().url("Renew my plan", config.billingUrl);
const connectButton = () => new InlineKeyboard().url("Connect in Modern Dating", `${config.rewireUrl}/telegram`);

export const msg = {
  // /start with no code, from someone not connected.
  hello: (): Reply => ({
    text: "Hi! I let Modern Dating members into the Rinaya community group.\n\nTo join, open Modern Dating and connect your Telegram from Settings → Telegram.",
    keyboard: connectButton(),
  }),
  // /start with no code, from someone already connected.
  helloConnected: (open: boolean): Reply =>
    open
      ? { text: "You're connected. Tap below to join the group, and I'll let you in.", keyboard: joinButton() }
      : { text: "You're connected, but your Modern Dating plan isn't active right now, so the group is closed to you. Renew it and you're back in.", keyboard: renewButton() },
  // The code in the link expired or was already used.
  badLink: (): Reply => ({
    text: "This link has expired or was already used. Open Modern Dating → Settings → Telegram to get a new one.",
    keyboard: connectButton(),
  }),
  connected: (open: boolean, inGroup: boolean): Reply =>
    !open
      ? { text: "Your Telegram is connected to Modern Dating. Your plan isn't active right now, so the group is closed to you. Renew it and you're back in.", keyboard: renewButton() }
      : inGroup
        ? { text: "Your Telegram is connected to Modern Dating. You're already in the group, so there's nothing else to do." }
        : { text: "Your Telegram is connected to Modern Dating. Tap below to join the group, and I'll let you in.", keyboard: joinButton() },
  // A join request from a Telegram account that isn't connected.
  declinedNotConnected: (): Reply => ({
    text: "The Rinaya community is for Modern Dating members. Connect your Telegram from Modern Dating first (Settings → Telegram), then ask to join again.",
    keyboard: connectButton(),
  }),
  // A join request, or a removal, while her plan isn't active.
  declinedClosed: (): Reply => ({
    text: "Your Modern Dating plan isn't active right now, so the group is closed to you. Renew it and you can join again.",
    keyboard: renewButton(),
  }),
  removedClosed: (): Reply => ({
    text: "Your Modern Dating plan isn't active right now, so you've been removed from the Rinaya community group. Your progress is saved: renew your plan and I'll send you the link back.",
    keyboard: renewButton(),
  }),
  removedNotConnected: (): Reply => ({
    text: "The Rinaya community group is now for Modern Dating members only, and your Telegram isn't connected to a Modern Dating account, so you've been removed. If you're a member, connect from Modern Dating (Settings → Telegram) and join again.",
    keyboard: connectButton(),
  }),
  // Her access came back after a removal.
  welcomeBack: (): Reply => ({
    text: "Welcome back! Your Modern Dating plan is active again. Tap below to rejoin the group.",
    keyboard: joinButton(),
  }),
  // Her Telegram account moved to another Modern Dating account, or she connected a new one.
  replaced: (): Reply => ({
    text: "Your Modern Dating account is now connected to a different Telegram account, so this one has been removed from the group.",
  }),
  // /announce in the group (admins only).
  announcement: (graceUntil: Date | null): Reply => ({
    text:
      "The Rinaya community group is now for Modern Dating members.\n\nIf you're a member, open Modern Dating and connect your Telegram (Settings → Telegram). It takes a few seconds." +
      (graceUntil
        ? `\n\nMembers who haven't connected by ${graceUntil.toUTCString().slice(0, 16)} will be removed from the group. You can always join again once connected.`
        : ""),
    keyboard: connectButton(),
  }),
};
