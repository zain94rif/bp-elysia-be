import { Elysia } from "elysia";
import { authPlugin, requireAdmin, requireAuth } from "../middleware/auth";
import { documentService } from "../service/document.service";
import { AppError } from "../apperror";

// Document routes scoped to employee
export const employeeDocumentHandler = new Elysia({ prefix: "/api/v1/employees" })
  .use(authPlugin)
  .get("/:id/documents", async ({ getAuthUser, params }) => {
    await requireAuth(getAuthUser);
    const docs = await documentService.getDocumentsByEmployeeId(params.id);
    return { data: docs };
  })
  .get("/:id/documents/:docId/preview", async ({ getAuthUser, params, set }) => {
    await requireAuth(getAuthUser);
    const { file, doc } = await documentService.getDocumentFile(params.id, params.docId);
    set.headers["content-type"] = doc.mime_type || "application/octet-stream";
    set.headers["content-disposition"] = `inline; filename="${encodeURIComponent(doc.file_name)}"`;
    return file;
  })
  .get("/:id/documents/:docId/download", async ({ getAuthUser, params, set }) => {
    await requireAuth(getAuthUser);
    const { file, doc } = await documentService.getDocumentFile(params.id, params.docId);
    set.headers["content-type"] = doc.mime_type || "application/octet-stream";
    set.headers["content-disposition"] = `attachment; filename="${encodeURIComponent(doc.file_name)}"`;
    return file;
  })
  .post("/:id/documents/upload", async ({ getAuthUser, params, body }) => {
    const admin = await requireAdmin(getAuthUser);
    const b = (body || {}) as any;
    const file = b.file as File;
    if (!file) {
      throw AppError.badRequest("file field is required in form-data");
    }
    const doc = await documentService.uploadDocument(admin.id, params.id, file);
    return { data: doc };
  })
  // Legacy route for metadata creation
  .post("/:id/documents", async ({ getAuthUser, params, body }) => {
    const admin = await requireAdmin(getAuthUser);
    const b = (body || {}) as any;
    const doc = await documentService.createMetadata(admin.id, {
      ...b,
      employee_id: params.id,
    });
    return { data: doc };
  });

// Document metadata routes
export const documentHandler = new Elysia({ prefix: "/api/v1/documents" })
  .use(authPlugin)
  .post("", async ({ getAuthUser, body }) => {
    const admin = await requireAdmin(getAuthUser);
    const doc = await documentService.createMetadata(admin.id, (body || {}) as any);
    return { data: doc };
  })
  .put("", async ({ getAuthUser, body }) => {
    const admin = await requireAdmin(getAuthUser);
    const doc = await documentService.updateMetadata(admin.id, (body || {}) as any);
    return { data: doc };
  })
  .delete("", async ({ getAuthUser, body }) => {
    const admin = await requireAdmin(getAuthUser);
    const b = (body || {}) as any;
    await documentService.deleteMetadata(admin.id, b.id);
    return { data: { message: "document deleted successfully" } };
  });
