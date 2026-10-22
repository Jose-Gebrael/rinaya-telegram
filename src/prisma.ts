import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// Modern Dating's database (rinaya_rewire_db), where its members, plans and
// Telegram links are: the DATABASE_URL in its .env, next to this repo
// (/var/www/rinaya-rewire/.env on the VPS, ../rinaya-rewire/.env here), so
// the two never point at different databases. REWIRE_ENV_FILE names another
// file; without one, this repo's own DATABASE_URL. Never printed.
export function databaseUrl(): string {
  const file = process.env.REWIRE_ENV_FILE || path.resolve(import.meta.dirname, "..", "..", "rinaya-rewire", ".env");
  if (existsSync(file)) {
    const line = readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
    if (line) return line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
  }
  return process.env.DATABASE_URL!;
}

export const prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseUrl()) });
