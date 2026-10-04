import { Elysia } from "elysia";
import { authPlugin, requireAdmin, requireAuth } from "../middleware/auth";
import { employeeService } from "../service/employee.service";
import { AppError } from "../apperror";

export const employeeHandler = new Elysia({ prefix: "/api/v1/employees" })
  .use(authPlugin)
  .get("", async ({ getAuthUser, query }) => {
    await requireAuth(getAuthUser);
    const q = query || {};
    const result = await employeeService.searchEmployees({
      search: q.search as string,
      field: q.field as string,
      page: q.page ? parseInt(q.page as string, 10) : undefined,
      limit: q.limit ? parseInt(q.limit as string, 10) : undefined,
    });
    return result;
  })
  .get("/:id", async ({ getAuthUser, params }) => {
    await requireAuth(getAuthUser);
    const employee = await employeeService.getEmployeeById(params.id);
    return { data: employee };
  })
  .get("/:id/photo", async ({ getAuthUser, params, set }) => {
    await requireAuth(getAuthUser);
    const file = await employeeService.getPhotoFile(params.id);
    set.headers["content-type"] = file.type || "image/jpeg";
    return file;
  })
  .post("", async ({ getAuthUser, body }) => {
    const admin = await requireAdmin(getAuthUser);
    const newEmployee = await employeeService.createEmployee(admin.id, (body || {}) as any);
    return { data: newEmployee };
  })
  .put("", async ({ getAuthUser, body }) => {
    const admin = await requireAdmin(getAuthUser);
    const updated = await employeeService.updateEmployee(admin.id, (body || {}) as any);
    return { data: updated };
  })
  .delete("", async ({ getAuthUser, body }) => {
    const admin = await requireAdmin(getAuthUser);
    const b = (body || {}) as any;
    await employeeService.deleteEmployee(admin.id, b.id);
    return { data: { message: "employee deleted successfully" } };
  })
  .post("/:id/photo", async ({ getAuthUser, params, body }) => {
    const admin = await requireAdmin(getAuthUser);
    const b = (body || {}) as any;
    const file = b.file as File;
    if (!file) {
      throw AppError.badRequest("file field is required in form-data");
    }
    const updated = await employeeService.uploadPhoto(admin.id, params.id, file);
    return { data: updated };
  });
