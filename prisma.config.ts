import "dotenv/config";
import { defineConfig } from "prisma/config";

// DIRECT_URL (non-pooled) is used for schema operations; the app itself connects with DATABASE_URL (pooled).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "" },
});
