# Maintenance

Ongoing checks for the bot, never ticked off. Run them every few weeks. Record each run under
"Last run" below. One-off work goes in `todo.md` instead.

---

## 1. Keep grammY and Prisma current

- `npm outdated`. grammY follows the Bot API: a new Bot API version is no reason to upgrade unless
  the bot needs it, but a grammY fix release is. To upgrade: `npm install --save-exact grammy@<v>`,
  `npm run typecheck`, `npm test`, then run the bot against a test group.
- **Prisma upgrades together with Rewire and rinaya.org**, same version and same overrides: the
  three share one database and one schema file.

## 2. `npm audit`

Run `npm audit` and `npm audit --omit=dev` (what ships). For each finding: fix it, or list it
below with why it stays. Never run `npm audit fix --force`: its "fix" for Prisma is a downgrade to
6.x.

**Overrides** (`package.json` → `overrides`): the same as Rewire and rinaya.org, for Prisma 7.10's
vulnerable pins: `mariadb` 3.5.4 (the runtime driver), `mysql2` 3.24.5 and `deepmerge-ts` 8.0.2
(Prisma CLI only). Drop one once Prisma's own pin has caught up, in all three repos.

---

## Last run

- **2026-10-14:** first install. grammY 1.46.0, Prisma 7.10.0 with the overrides: 0 vulnerabilities.
- **2026-10-28:** `npm audit`: 1 moderate, `fast-uri` 3.1.8 (four URI-handling advisories,
  GHSA-w74x-v6f9-j3xg and others), under the Prisma CLI's `@prisma/dev` → `ajv`. `npm audit fix`
  (lockfile only): 0 vulnerabilities. Typecheck and the 18 tests pass.
