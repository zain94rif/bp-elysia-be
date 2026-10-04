import { userRepo } from "../repository/user.repo";
import { auditRepo } from "../repository/audit.repo";
import { AppError } from "../apperror";
import { toUserResponse, UserResponse, UserRole } from "../model/user";

export class UserService {
  async listUsers(): Promise<UserResponse[]> {
    const users = await userRepo.findAll();
    return users.map(toUserResponse);
  }

  async createUser(actingUserId: string, data: {
    email?: string;
    password?: string;
    role?: UserRole;
    active?: boolean;
  }): Promise<UserResponse> {
    if (!data.email || !data.password || !data.role) {
      throw AppError.badRequest("email, password, and role are required");
    }

    const email = data.email.trim().toLowerCase();
    if (!email.includes("@")) {
      throw AppError.badRequest("invalid email format");
    }

    if (data.password.length < 8) {
      throw AppError.badRequest("password must be at least 8 characters long");
    }

    if (data.role !== "ADMIN" && data.role !== "VIEWER") {
      throw AppError.badRequest("role must be ADMIN or VIEWER");
    }

    const existing = await userRepo.findByEmail(email);
    if (existing) {
      throw AppError.conflict("email already exists", "DUPLICATE_EMAIL");
    }

    const passwordHash = await Bun.password.hash(data.password, {
      algorithm: "bcrypt",
      cost: 10,
    });

    const user = await userRepo.create({
      email,
      password_hash: passwordHash,
      role: data.role,
      active: data.active !== undefined ? data.active : true,
    });

    await auditRepo.create({
      user_id: actingUserId,
      action: "CREATE",
      entity: "user",
      entity_id: user.id,
    });

    return toUserResponse(user);
  }

  async updateUser(actingUserId: string, data: {
    id?: string;
    email?: string;
    role?: UserRole;
    active?: boolean;
    password?: string;
  }): Promise<UserResponse> {
    if (!data.id) {
      throw AppError.badRequest("user id is required in request body");
    }

    const existing = await userRepo.findById(data.id);
    if (!existing) {
      throw AppError.notFound("user not found");
    }

    const email = data.email ? data.email.trim().toLowerCase() : existing.email;
    if (!email.includes("@")) {
      throw AppError.badRequest("invalid email format");
    }

    if (email !== existing.email) {
      const duplicate = await userRepo.findByEmail(email);
      if (duplicate) {
        throw AppError.conflict("email already exists", "DUPLICATE_EMAIL");
      }
    }

    const role = data.role || existing.role;
    if (role !== "ADMIN" && role !== "VIEWER") {
      throw AppError.badRequest("role must be ADMIN or VIEWER");
    }

    const active = data.active !== undefined ? data.active : existing.active;

    let passwordHash: string | undefined;
    if (data.password) {
      if (data.password.length < 8) {
        throw AppError.badRequest("password must be at least 8 characters long");
      }
      passwordHash = await Bun.password.hash(data.password, {
        algorithm: "bcrypt",
        cost: 10,
      });
    }

    const updated = await userRepo.update({
      id: data.id,
      email,
      role,
      active,
      password_hash: passwordHash,
    });

    if (!updated) {
      throw AppError.internal("failed to update user");
    }

    await auditRepo.create({
      user_id: actingUserId,
      action: "UPDATE",
      entity: "user",
      entity_id: updated.id,
    });

    return toUserResponse(updated);
  }

  async deactivateUser(actingUserId: string, id?: string): Promise<void> {
    if (!id) {
      throw AppError.badRequest("user id is required in request body");
    }

    const existing = await userRepo.findById(id);
    if (!existing) {
      throw AppError.notFound("user not found");
    }

    const success = await userRepo.deactivate(id);
    if (!success) {
      throw AppError.internal("failed to deactivate user");
    }

    await auditRepo.create({
      user_id: actingUserId,
      action: "DEACTIVATE",
      entity: "user",
      entity_id: id,
    });
  }
}

export const userService = new UserService();
