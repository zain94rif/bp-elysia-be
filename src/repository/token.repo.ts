import { sql } from "../db";
import { RefreshToken } from "../model/token";

export class TokenRepository {
  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshToken> {
    const rows = await sql<RefreshToken[]>`
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (${userId}, ${tokenHash}, ${expiresAt})
      RETURNING *
    `;
    return rows[0];
  }

  async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    const rows = await sql<RefreshToken[]>`
      SELECT * FROM refresh_tokens
      WHERE token_hash = ${tokenHash} AND revoked_at IS NULL
      LIMIT 1
    `;
    return rows[0] || null;
  }

  async revoke(id: string): Promise<void> {
    await sql`
      UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ${id}
    `;
  }

  async revokeByHash(tokenHash: string): Promise<void> {
    await sql`
      UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ${tokenHash}
    `;
  }
}

export const tokenRepo = new TokenRepository();
