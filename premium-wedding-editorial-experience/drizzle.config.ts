import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Never hardcode credentials here: this file is committed.
    url: process.env.DATABASE_URL ?? "",
  },
});
