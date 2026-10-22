# Rinaya Telegram (@rinaya_bot)

The gatekeeper of the Rinaya community group on Telegram: only Modern Dating members with open
access are in it (Modern Dating, moderndating.me, is the app whose repo is `../rinaya-rewire`; its
members see Modern Dating, never "Rewire", and so do the bot's messages). The bot lets people in (join requests), removes them when their access closes, and tells
them when they can come back. No roles, nothing else.

**Start here:** `todo.md` is everything still pending, as a checklist: tick items as they land and
add new ones as they come up. How to set the bot and the group up on Telegram: `docs/setup.md`.

**Sister app:** **Modern Dating** (moderndating.me, `../rinaya-rewire`): the "Join our community"
onboarding step and Settings → Telegram, where she connects, and the billing that decides her
access. Its CLAUDE.md has the contract ("Telegram"). Work it needs goes in its `todo.md`.

**Guidelines** (`docs/guidelines/`): [naming-conventions.md](docs/guidelines/naming-conventions.md)
for every new file, folder, branch, commit and env var; [maintenance.md](docs/guidelines/maintenance.md)
for the recurring checks.

## How it works

1. Modern Dating writes a one-time code on her `telegram_links` row (30 minutes) and opens
   `t.me/rinaya_bot?start=<code>`.
2. `/start <code>` (`src/linking.ts`): the bot saves her Telegram id on that row, clears the code,
   and answers with the group's link. One Telegram account per Modern Dating account: connecting it to
   another account moves it there; connecting a new one removes the old one from the group.
3. The group's invite link has "approve new members" on, so anyone can open it and the bot answers
   each join request (`src/bot.ts`): approved when connected with open access, otherwise declined
   with a message saying what to do.
4. The sweep (`src/sweep.ts`, every `TELEGRAM_SWEEP_MINUTES`) reads access from the database:
   - connected, in the group, access closed → removed (ban then unban, so she can come back),
     `status = suspended`, and told why;
   - `suspended` and access open again → told she can rejoin, `status = linked`;
   - in the group, not connected, after `TELEGRAM_GRACE_UNTIL` → removed.
   - Group admins (refreshed every sweep) and bots are never removed.
5. Membership updates (`chat_member`) keep `telegram_members` and her `status` current.

Access is Modern Dating's rule: `src/access.ts` is a copy of `../rinaya-rewire/src/lib/billing/plan.ts`'s
`accessOf`, `latestGrant`, `isLive` and `planRow`. Change them there first, then copy them here
unchanged.

`telegram_members` is how the bot knows who is in the group: the Bot API can't list members, so it
records everyone it sees (joins, messages, admins), and `npm run import-members` records the ones
already there once, over MTProto (`scripts/importMembers.ts`).

## The database is Modern Dating's, and live

Since 2026-10-22 the bot reads Modern Dating's database, `rinaya_rewire_db` (before, the one it
shared with rinaya.org). It takes the `DATABASE_URL` from Modern Dating's `.env`, next to this repo
(`/var/www/rinaya-rewire/.env` on the VPS, `../rinaya-rewire/.env` here; `REWIRE_ENV_FILE` names
another; this repo's own `DATABASE_URL` only without one), so the two never point at different
databases (`src/prisma.ts`).

- **`prisma/schema.prisma` holds only the models the bot uses** (`rewire_subscriptions`,
  `rewire_grants`, `telegram_links`, `telegram_members`), copied unchanged from
  `../rinaya-rewire/prisma/schema.prisma`, which a change to one of them is made in first.
- **This repo never pushes the schema.** It only generates its client from the file. Never run
  `prisma db push` or `prisma migrate` from here: with four models, a push would drop every other
  table.
- The bot writes only `telegram_links` (everything but `link_token`, `link_token_expires_at` and
  `skipped_at`, which the app writes) and `telegram_members`. It only reads `rewire_subscriptions`
  and `rewire_grants`.
- Development runs against the local `rinaya-db` container (`127.0.0.1:3307`, `rinaya_rewire_db`).
- **Never print, log or echo `DATABASE_URL`, `TELEGRAM_BOT_TOKEN` or any other `.env` value.**
- **Never read, open, edit or reference `.env.prod`.**

## Env files

`.env.example` (committed) lists every variable with what it does. `.env` (gitignored) is this PC's,
with the same headers and no comments; on the VPS the file is also `.env`. A new variable goes in
`.env.example` and `.env`; the user adds it to `.env.prod` and the VPS.

## Never delete anything

"Delete", "remove", "clean up" and the like mean: **move it to `trash/`** at the repo root, keeping
its relative path. If the destination exists, add a timestamp. Never use `rm`, `del`,
`Remove-Item`, `rmdir` or `git rm` (use `git mv <path> trash/<path>`). Never empty `trash/`.

## Git

- Work on `main`. Commit each finished piece with a type prefix: `feature:`, `fix:`, `docs:`,
  `refactor:`, `chore:`.
- **Never push** without the user asking: a push to `main` deploys (`.github/workflows/deploy.yml`).
- Before committing code: `npm run typecheck` and `npm test`.

## Asking first

Anything a member sees (the bot's messages in `src/messages.ts`, who gets removed and when) is the
user's call: ask, with a recommendation.

## Running it

```bash
npm run dev                          # the bot, restarting on changes (needs the Telegram values in .env)
npm test                             # the access rule and the sweep's decisions
npm run typecheck
npm run import-members               # members already in the group: shows the count
npm run import-members -- --write    # ... and records them
```

Only one copy of the bot can poll Telegram at a time: stop the VPS one (or use a second test bot)
before running it here.
