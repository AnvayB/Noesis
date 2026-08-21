import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? `file:${process.env.DATABASE_PATH ?? "./noesis.db"}`,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
