import { Elysia } from "elysia";
import { authPlugin, requireAdmin } from "../middleware/auth";
import { authService } from "../service/auth.service";
import { userService } from "../service/user.service";
import { captchaService } from "../service/captcha.service";

function getClientIp(headers: Record<string, string | undefined>): string | undefined {
  return headers["x-forwarded-for"] || headers["x-real-ip"];
}

export const authHandler = new Elysia({ prefix: "/api/v1/auth" })
  .use(authPlugin)
  .get("/captcha", () => {
    const challenge = captchaService.createChallenge();
    return { data: challenge };
  })
  .post("/login", async ({ jwt, body, headers }) => {
    const b = (body || {}) as any;
    const signJwt = async (payload: { id: string; email: string; role: string }) => {
      return await jwt.sign(payload);
    };
    const ipAddress = getClientIp(headers);
    const result = await authService.login(b, signJwt, ipAddress);
    return { data: result };
  })
  .post("/refresh", async ({ jwt, body }) => {
    const b = (body || {}) as any;
    const signJwt = async (payload: { id: string; email: string; role: string }) => {
      return await jwt.sign(payload);
    };
    const result = await authService.refreshToken(b.refresh_token, signJwt);
    return { data: result };
  })
  .post("/logout", async ({ getAuthUser, body, headers }) => {
    let userId: string | undefined;
    try {
      const user = await getAuthUser();
      userId = user.id;
    } catch {
      // Allow logout even if access token is expired
    }
    const b = (body || {}) as any;
    const ipAddress = getClientIp(headers);
    await authService.logout(b.refresh_token, userId, ipAddress);
    return { data: { message: "logged out successfully" } };
  })
  .post("/register", async ({ getAuthUser, body }) => {
    const user = await requireAdmin(getAuthUser);
    const b = (body || {}) as any;
    const newUser = await userService.createUser(user.id, b);
    return { data: newUser };
  });
