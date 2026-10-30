import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  initialized: boolean | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

if (typeof window === "undefined" && !globalForPrisma.initialized) {
  globalForPrisma.initialized = true;
  // Verify that SQLite tables exist; if missing, push schema automatically
  try {
    prisma.$queryRawUnsafe("SELECT 1 FROM ChitMember LIMIT 1").catch((err: any) => {
      const msg = String(err?.message || "");
      if (msg.includes("no such table") || msg.includes("does not exist")) {
        console.log("[Prisma] Missing tables detected. Running prisma db push...");
        try {
          execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
          console.log("[Prisma] Database tables initialized successfully.");
        } catch (e) {
          console.error("[Prisma] db push error:", e);
        }
      }
    });
  } catch (e) {
    // ignore
  }
}

export default prisma;
