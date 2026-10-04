import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { config } from "./config";
import { runMigrations } from "./db";
import { authService } from "./service/auth.service";
import { AppError } from "./apperror";
import { logger } from "./logger";

import { healthHandler } from "./handler/health.handler";
import { authHandler } from "./handler/auth.handler";
import { userHandler } from "./handler/user.handler";
import { employeeHandler } from "./handler/employee.handler";
import { employeeDocumentHandler, documentHandler } from "./handler/document.handler";

// Initialize database and seed initial admin
try {
  logger.info("Initializing database migrations...");
  await runMigrations();
  logger.info("Database migrations completed successfully.");
  await authService.seedAdmin();
} catch (err: any) {
  logger.error("Failed to initialize database/migrations:", err?.message || err);
}

const app = new Elysia()
  .use(
    cors({
      origin: config.FRONTEND_URL || true,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    })
  )
  .onRequest(({ request }) => {
    (request as any)._startTime = Date.now();
  })
  .onAfterResponse(({ request, set }) => {
    const startTime = (request as any)._startTime || Date.now();
    const duration = Date.now() - startTime;
    const url = new URL(request.url);
    logger.info(`HTTP ${request.method} ${url.pathname} ${set.status || 200} - ${duration}ms`);
  })
  .onError(({ request, error, set }) => {
    const url = request?.url ? new URL(request.url).pathname : "";
    if (error instanceof AppError) {
      set.status = error.status;
      logger.warn(`HTTP ${request?.method} ${url} ${error.status} - [${error.code}] ${error.message}`);
      return {
        error: {
          code: error.code,
          message: error.message,
        },
      };
    }

    const errMsg = error instanceof Error ? error.message : String(error);

    // Map PostgreSQL unique constraint errors if uncaught
    if (errMsg.includes("idx_employees_nik_active") || (errMsg.includes("nik") && errMsg.includes("unique"))) {
      set.status = 409;
      return { error: { code: "DUPLICATE_NIK", message: "NIK already exists" } };
    }
    if (errMsg.includes("idx_employees_kpj_active") || (errMsg.includes("kpj") && errMsg.includes("unique"))) {
      set.status = 409;
      return { error: { code: "DUPLICATE_KPJ", message: "KPJ already exists" } };
    }
    if (errMsg.includes("idx_employees_phone_active") || (errMsg.includes("phone") && errMsg.includes("unique"))) {
      set.status = 409;
      return { error: { code: "DUPLICATE_PHONE", message: "phone number already exists" } };
    }
    if (errMsg.includes("idx_employees_email_active") || (errMsg.includes("email") && errMsg.includes("unique"))) {
      set.status = 409;
      return { error: { code: "DUPLICATE_EMAIL", message: "email already exists" } };
    }

    const status = (error as any)?.status || 500;
    set.status = status;
    const code = status === 404 ? "NOT_FOUND" : status === 401 ? "UNAUTHORIZED" : "INTERNAL_ERROR";
    const message = error instanceof Error ? error.message : "internal server error";

    logger.error(`HTTP ${request?.method} ${url} ${status} - [${code}] ${message}`);

    return {
      error: {
        code,
        message,
      },
    };
  })
  .use(healthHandler)
  .use(authHandler)
  .use(userHandler)
  .use(employeeHandler)
  .use(employeeDocumentHandler)
  .use(documentHandler)
  .listen(config.APP_PORT);

logger.info(`Elysia server started on port ${config.APP_PORT} (env: ${config.APP_ENV}, schema: ${config.DATABASE_SCHEMA})`);
console.log(`🦊 Elysia server is running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
