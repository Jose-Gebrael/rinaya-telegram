import { defineConfig } from "vitest/config";

// The tests check pure rules only: they never reach Telegram or the database,
// but importing the bot's modules needs these set.
export default defineConfig({
  test: {
    env: {
      TELEGRAM_BOT_TOKEN: "test",
      TELEGRAM_GROUP_ID: "-1000000000000",
      TELEGRAM_INVITE_URL: "https://t.me/+test",
      DATABASE_URL: "mysql://test:test@127.0.0.1:1/test",
    },
  },
});
