export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at?: Date | string | null;
  created_at: Date;
}
