// Prisma 7 configuration. NOTE: Prisma 7 no longer reads package.json#prisma,
// no longer auto-loads .env, and no longer accepts `url` in schema.prisma —
// all of that is configured here instead.
import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: databaseUrl },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
