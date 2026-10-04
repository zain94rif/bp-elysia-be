import { Elysia } from "elysia";
import { authPlugin, requireAdmin } from "../middleware/auth";
import { userService } from "../service/user.service";

export const userHandler = new Elysia({ prefix: "/api/v1/users" })
  .use(authPlugin)
  .get("", async ({ getAuthUser }) => {
    await requireAdmin(getAuthUser);
    const users = await userService.listUsers();
    return { data: users };
  })
  .post("", async ({ getAuthUser, body }) => {
    const admin = await requireAdmin(getAuthUser);
    const newUser = await userService.createUser(admin.id, (body || {}) as any);
    return { data: newUser };
  })
  .put("", async ({ getAuthUser, body }) => {
    const admin = await requireAdmin(getAuthUser);
    const updated = await userService.updateUser(admin.id, (body || {}) as any);
    return { data: updated };
  })
  .delete("", async ({ getAuthUser, body }) => {
    const admin = await requireAdmin(getAuthUser);
    const b = (body || {}) as any;
    await userService.deactivateUser(admin.id, b.id);
    return { data: { message: "user deactivated successfully" } };
  });
