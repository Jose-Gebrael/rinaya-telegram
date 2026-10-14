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

1. **Private, not public.** Group info → Edit → *Group type*: **Private**. A public group (one with
   an @username) lets anyone in without a link, so the bot couldn't gatekeep it. If it must stay
   public, turn on *Approve new members* there instead.
2. **Add @rinaya_bot as an admin.** Group info → Edit → *Administrators* → *Add Admin* → search
   `rinaya_bot` (if it isn't offered, add it as a member first, then promote it). Rights:
   - **Ban users**: on (how it removes people).
   - **Invite users via link**: on (approving join requests needs it).
   - **Delete messages**: on, optional (it deletes the `/announce` command after posting).
   - Everything else off; *Remain anonymous* off.
   A small group may become a supergroup at this point: its id changes, so take the id after this
   step.
3. **The approval link.** Group info → Edit → *Invite links* → *Create a new link*: turn on
   **Request admin approval**, name it e.g. "Rewire members", no limit, no expiry. That link is
   `TELEGRAM_INVITE_URL`, in all three `.env` files.
4. **Close the other doors.** In the same *Invite links* screen, revoke every other link,
   including the primary one (⋮ → *Revoke*; Telegram replaces it with a new primary link: don't
   share that one). Anyone who still gets in another way is removed after the grace period.
5. **The group id** (`TELEGRAM_GROUP_ID`): send any message in the group after step 2, then read
   it from the bot's updates, while the bot isn't running anywhere:
   ```bash
   node -e 'require("dotenv").config({quiet:true});fetch("https://api.telegram.org/bot"+process.env.TELEGRAM_BOT_TOKEN+"/getUpdates").then(r=>r.json()).then(j=>console.log([...new Set((j.result||[]).map(u=>(u.message||u.my_chat_member||u.chat_member||{}).chat).filter(c=>c&&c.type!=="private").map(c=>c.id+" "+c.title))]))'
   ```
   It starts with `-100`. (Or add @RawDataBot to the group for a moment and read `chat.id`.)

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
