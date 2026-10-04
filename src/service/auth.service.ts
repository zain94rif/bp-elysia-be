import { userRepo } from "../repository/user.repo";
import { tokenRepo } from "../repository/token.repo";
import { auditRepo } from "../repository/audit.repo";
import { captchaService } from "./captcha.service";
import { config } from "../config";
import { AppError } from "../apperror";
import { toUserResponse, UserResponse } from "../model/user";

export function hashToken(token: string): string {
  return new Bun.CryptoHasher("sha256").update(token).digest("hex");
}

export class AuthService {
  async seedAdmin() {
    const existing = await userRepo.findByEmail(config.SEED_ADMIN_EMAIL);
    if (!existing) {
      const passwordHash = await Bun.password.hash(config.SEED_ADMIN_PASSWORD, {
        algorithm: "bcrypt",
        cost: 10,
      });
      await userRepo.create({
        email: config.SEED_ADMIN_EMAIL,
        password_hash: passwordHash,
        role: "ADMIN",
        active: true,
      });
      console.log(`[Seed] Initial admin created: ${config.SEED_ADMIN_EMAIL}`);
    }
  }

  async login(
    body: {
      email?: string;
      password?: string;
      captcha_id?: string;
      captcha_answer?: string;
      captcha_token?: string;
    },
    signJwt: (payload: { id: string; email: string; role: string }) => Promise<string>,
    ipAddress?: string
  ): Promise<{
    access_token: string;
    refresh_token: string;
    user: UserResponse;
  }> {
    if (!body.email || !body.password) {
      throw AppError.badRequest("email and password are required");
    }

    // Verify Captcha
    await captchaService.verify(body.captcha_id, body.captcha_answer, body.captcha_token);

    const user = await userRepo.findByEmail(body.email.trim().toLowerCase());
    if (!user) {
      throw AppError.unauthorized("invalid credentials");
    }

    if (!user.active) {
      throw AppError.forbidden("user account is inactive");
    }

    const validPassword = await Bun.password.verify(body.password, user.password_hash);
    if (!validPassword) {
      throw AppError.unauthorized("invalid credentials");
    }

    // Sign Access Token
    const accessToken = await signJwt({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Issue Refresh Token
    const rawRefreshToken = crypto.randomUUID();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + config.refreshTokenTtlSeconds * 1000);

    await tokenRepo.create(user.id, tokenHash, expiresAt);

    await auditRepo.create({
      user_id: user.id,
      action: "LOGIN",
      entity: "user",
      entity_id: user.id,
      ip_address: ipAddress,
    });

    return {
      access_token: accessToken,
      refresh_token: rawRefreshToken,
      user: toUserResponse(user),
    };
  }

  async refreshToken(
    rawRefreshToken: string,
    signJwt: (payload: { id: string; email: string; role: string }) => Promise<string>
  ): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    if (!rawRefreshToken) {
      throw AppError.badRequest("refresh token is required");
    }

    const tokenHash = hashToken(rawRefreshToken);
    const existingToken = await tokenRepo.findByHash(tokenHash);

    if (
      !existingToken ||
      existingToken.revoked_at != null ||
      new Date(existingToken.expires_at).getTime() < Date.now()
    ) {
      throw AppError.unauthorized("invalid or expired refresh token");
    }

    const user = await userRepo.findById(existingToken.user_id);
    if (!user || !user.active) {
      throw AppError.unauthorized("user not found or inactive");
    }

    // Revoke current token (rotation)
    await tokenRepo.revoke(existingToken.id);

    // Issue new pair
    const newAccessToken = await signJwt({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const newRawRefreshToken = crypto.randomUUID();
    const newTokenHash = hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + config.refreshTokenTtlSeconds * 1000);

    await tokenRepo.create(user.id, newTokenHash, expiresAt);

    return {
      access_token: newAccessToken,
      refresh_token: newRawRefreshToken,
    };
  }

  async logout(rawRefreshToken: string, userId?: string, ipAddress?: string) {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await tokenRepo.revokeByHash(tokenHash);
    }
    if (userId) {
      await auditRepo.create({
        user_id: userId,
        action: "LOGOUT",
        entity: "user",
        entity_id: userId,
        ip_address: ipAddress,
      });
    }
  }
}

export const authService = new AuthService();
