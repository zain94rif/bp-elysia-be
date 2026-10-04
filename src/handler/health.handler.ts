import { Elysia } from "elysia";
import { sql } from "../db";
import { AppError } from "../apperror";

export const healthHandler = new Elysia()
  .get("/health", () => {
    return { data: { status: "ok" } };
  })
  .get("/ready", async () => {
    try {
      await sql`SELECT 1`;
      return { data: { status: "ready" } };
    } catch {
      throw AppError.internal("database not ready");
    }
  });
