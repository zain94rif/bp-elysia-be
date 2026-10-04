import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { config } from "../config";
import { AppError } from "../apperror";

export interface AuthUser {
  id: string;
  email: string;
  role: "ADMIN" | "VIEWER";
}

export const authPlugin = new Elysia({ name: "authPlugin" })
  .use(
    jwt({
      name: "jwt",
      secret: config.JWT_SECRET,
    })
  )
  .derive({ as: "global" }, ({ jwt, headers }) => {
    return {
      getAuthUser: async (): Promise<AuthUser> => {
        const authorization = headers["authorization"];
        if (!authorization || !authorization.startsWith("Bearer ")) {
          throw AppError.unauthorized("missing or invalid authorization header");
        }
        const token = authorization.substring(7).trim();
        const payload = await jwt.verify(token);
        if (!payload || !payload.id || !payload.role) {
          throw AppError.unauthorized("invalid or expired access token");
        }
        return {
          id: payload.id as string,
          email: payload.email as string,
          role: payload.role as "ADMIN" | "VIEWER",
        };
      },
    };
  });

export async function requireAuth(getAuthUser?: () => Promise<AuthUser>): Promise<AuthUser> {
  if (typeof getAuthUser !== "function") {
    throw AppError.unauthorized("missing or invalid authorization header");
  }
  return await getAuthUser();
}

export async function requireAdmin(getAuthUser?: () => Promise<AuthUser>): Promise<AuthUser> {
  if (typeof getAuthUser !== "function") {
    throw AppError.unauthorized("missing or invalid authorization header");
  }
  const user = await getAuthUser();
  if (user.role !== "ADMIN") {
    throw AppError.forbidden("ADMIN role required for this action");
  }
  return user;
}
