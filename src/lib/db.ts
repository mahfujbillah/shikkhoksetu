import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * One PrismaClient per server instance.
 * In dev, Next.js hot-reload re-evaluates modules, so we cache the client on globalThis
 * to avoid exhausting database connections.
 *
 * DATABASE_URL should be Supabase's *transaction pooler* URL (port 6543) in production —
 * serverless functions open many short-lived connections and the pooler absorbs them.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  // Supabase requires TLS; its pooler certificate isn't in Node's default CA store, so encrypt without chain verification
  // unless the URL already specifies sslmode.
  const ssl = /supabase\.(co|com)/.test(connectionString) && !/sslmode=/.test(connectionString) ? { rejectUnauthorized: false } : undefined;
  const adapter = new PrismaPg({ connectionString, ssl, max: Number(process.env.DB_POOL_MAX ?? 5) });
  return new PrismaClient({ adapter, log: ["warn"] });
}

/**
 * Lazily created so that importing this module (e.g. while `next build` collects page data)
 * never requires DATABASE_URL — the connection is only opened on the first real query.
 */
function instance(): PrismaClient {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = createClient();
  return globalForPrisma.prisma;
}

export const db = new Proxy({} as PrismaClient, {
  get(_t, prop) {
    const client = instance();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
