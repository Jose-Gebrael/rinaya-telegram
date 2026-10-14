# Setting up the bot and the group

Done once, by hand, in Telegram and on the VPS. Values go in the bot's `.env` (and two of them in
Rewire's and rinaya.org's).

## 1. The bot (@rinaya_bot)

Already created in @BotFather; its token is `TELEGRAM_BOT_TOKEN`. In @BotFather → the bot:

- **Bot Settings → Allow Groups:** on.
- **Edit Bot → Description** (shown before someone presses Start), e.g. "I let Rewire members into
  the Rinaya community group."

Privacy mode can stay on: as a group admin the bot sees every message anyway.

## 2. The group

1. Use the existing community group (it must be a **supergroup**: any group with a public link, or
   over 200 members, already is; otherwise Telegram converts it when you turn on the setting in
   step 3).
2. **Add @rinaya_bot as an admin** with these rights: *Ban users* and *Invite users via link*.
   Nothing else is needed.
3. **Group settings → Invite links → Create a new link**, with **"Request admin approval"** on.
   That link is `TELEGRAM_INVITE_URL`, in all three `.env` files. Revoke any other invite links,
   or people can still walk in through them (the grace period would then remove them).
4. **The group id** (`TELEGRAM_GROUP_ID`): add @RawDataBot to the group for a moment, read
   `chat.id` from its message (it starts with `-100`), then remove it.

## 3. The values

| Variable | Bot | Rewire | rinaya.org |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | ✓ | | |
| `TELEGRAM_GROUP_ID` | ✓ | | |
| `TELEGRAM_INVITE_URL` | ✓ | ✓ | ✓ |
| `TELEGRAM_BOT_USERNAME` (`rinaya_bot`) | | ✓ | ✓ |
| `TELEGRAM_GRACE_UNTIL` | ✓ | | |
| `TELEGRAM_API_ID`, `TELEGRAM_API_HASH` | ✓ (import only) | | |

Rewire and rinaya.org show nothing about Telegram until both of their values are set, so they can
be deployed first.

## 4. Members already in the group

1. Get `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` at https://my.telegram.org → API development tools.
2. `npm run import-members` (shows the count), then `npm run import-members -- --write`.
3. Pick the end of the grace period (2 days, user decision 2026-10-14), set `TELEGRAM_GRACE_UNTIL`,
   restart the bot.
4. In the group, an admin sends `/announce`: the bot posts how to connect and the date.

Members who are in `telegram_members` are the ones the grace period can remove; anyone who joins,
speaks or is promoted is added automatically.

## 5. The VPS

```bash
cd /var/www && git clone <repo> rinaya-telegram && cd rinaya-telegram
# put .env in place (from .env.prod), then:
npm ci && npx prisma generate
pm2 start "npm start" --name rinaya-telegram && pm2 save
pm2 logs rinaya-telegram   # "started bot=rinaya_bot ..."
```

After that, every push to `main` redeploys it (`.github/workflows/deploy.yml`, the same GitHub
secrets as the other two repos).
