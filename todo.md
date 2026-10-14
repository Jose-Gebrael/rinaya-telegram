# Todo

Everything still pending for rinaya-telegram, in one place. Groups are numbered roughly by
priority; inside each group, do the tasks in letter order. Tick items as they land and add new ones
as they come up.

---

## 1. Going live (the user, with Claude's help)

- [ ] **a.** The schema: push `telegram_links` and `telegram_members` to the live database from
      Rewire (`../rinaya-rewire/todo.md`, its live-push rules: SQL shown first, explicit yes).
- [ ] **b.** Telegram setup (`docs/setup.md` §1–2): the bot as group admin, the approval invite
      link, the group id.
- [ ] **c.** The GitHub repo (private) and the VPS (`docs/setup.md` §5), `.env` from `.env.prod`.
- [ ] **d.** Rewire and rinaya.org: `TELEGRAM_BOT_USERNAME=rinaya_bot` and `TELEGRAM_INVITE_URL`
      in both `.env` files on the VPS, then deploy them (their commits are on `main`, not pushed).
- [ ] **e.** Try it end to end on live with a test account: connect from Rewire, join the group,
      then let an admin grant on it end and watch the sweep remove her; give a new grant and
      watch the welcome-back message.
- [ ] **f.** Members already in the group (`docs/setup.md` §4): import, set
      `TELEGRAM_GRACE_UNTIL` 7 days out, `/announce`.

## 2. Wording to confirm (customer-facing)

- [ ] **a.** The bot's messages (`src/messages.ts`), Rewire's "Join our community" screen and
      Settings → Telegram, and rinaya.org's Telegram card: drafted by Claude 2026-10-14.
- [ ] **b.** Rewire's privacy copy says what the app keeps: it doesn't mention the Telegram name
      and id yet. A wording change there bumps `CONSENT_VERSION` (`../rinaya-rewire/CLAUDE.md`).

## 3. Later

- [ ] **a.** Idea, not asked for: each member's Telegram status in the admin app (Members). Needs
      Rewire's `/api/admin/members` to carry it first, then an item in
      `../rinaya-admin/rinaya-rewire-todo.md`.
