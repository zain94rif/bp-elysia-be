export type UserRole = "ADMIN" | "VIEWER";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  active: boolean;
  created_at: Date;
}

export interface UserResponse {
  id: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: Date;
}

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    active: user.active,
    created_at: user.created_at,
  };
}
