export function parseDurationToSeconds(durationStr: string | undefined, defaultSeconds: number): number {
  if (!durationStr) return defaultSeconds;
  const match = durationStr.trim().match(/^(\d+)([smhd])?$/i);
  if (!match) return defaultSeconds;
  const value = parseInt(match[1], 10);
  const unit = (match[2] || "s").toLowerCase();
  switch (unit) {
    case "s": return value;
    case "m": return value * 60;
    case "h": return value * 3600;
    case "d": return value * 86400;
    default: return value;
  }
}

export const config = {
  APP_PORT: parseInt(Bun.env.APP_PORT || "3000", 10),
  APP_ENV: Bun.env.APP_ENV || "development",
  FRONTEND_URL: Bun.env.FRONTEND_URL || "http://localhost:5173",

  DATABASE_URL: Bun.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/be_elysia",
  DATABASE_SCHEMA: Bun.env.DATABASE_SCHEMA || "public",

  JWT_SECRET: Bun.env.JWT_SECRET || "super-secret-jwt-key-change-me",
  ACCESS_TOKEN_TTL: Bun.env.ACCESS_TOKEN_TTL || "15m",
  REFRESH_TOKEN_TTL: Bun.env.REFRESH_TOKEN_TTL || "720h",

  CAPTCHA_MODE: (Bun.env.CAPTCHA_MODE || "internal") as "internal" | "provider" | "disabled",
  CAPTCHA_REQUIRED: Bun.env.CAPTCHA_REQUIRED === "true",
  CAPTCHA_VERIFY_URL: Bun.env.CAPTCHA_VERIFY_URL || "",
  CAPTCHA_SECRET: Bun.env.CAPTCHA_SECRET || "",

  STORAGE_DRIVER: Bun.env.STORAGE_DRIVER || "local",
  STORAGE_PATH: Bun.env.STORAGE_PATH || "./storage",
  MAX_UPLOAD_BYTES: parseInt(Bun.env.MAX_UPLOAD_BYTES || "26214400", 10), // 25MB

  LOG_FILE_PATH: Bun.env.LOG_FILE_PATH || "./logs/app.log",

  SEED_ADMIN_EMAIL: Bun.env.SEED_ADMIN_EMAIL || "admin@example.com",
  SEED_ADMIN_PASSWORD: Bun.env.SEED_ADMIN_PASSWORD || "change-me",

  get accessTokenTtlSeconds(): number {
    return parseDurationToSeconds(this.ACCESS_TOKEN_TTL, 900); // 15 mins default
  },

  get refreshTokenTtlSeconds(): number {
    return parseDurationToSeconds(this.REFRESH_TOKEN_TTL, 2592000); // 30 days default
  }
};
