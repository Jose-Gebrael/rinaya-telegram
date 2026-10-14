# rinaya-telegram

@rinaya_bot, the gatekeeper of the Rinaya community group on Telegram: Rewire members connect
their Telegram from the app, the bot lets them in, and removes them when their plan stops.

- How it works and the rules for working on it: [CLAUDE.md](CLAUDE.md)
- Setting up the bot, the group and the VPS: [docs/setup.md](docs/setup.md)
- What's pending: [todo.md](todo.md)

Node 22, TypeScript (run by tsx), grammY, Prisma 7 on the shared MariaDB.

```bash
npm ci && npx prisma generate
npm run dev
```
