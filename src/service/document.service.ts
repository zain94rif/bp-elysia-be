import { documentRepo } from "../repository/document.repo";
import { employeeRepo } from "../repository/employee.repo";
import { auditRepo } from "../repository/audit.repo";
import { storage } from "../storage/local";
import { config } from "../config";
import { AppError } from "../apperror";
import { EmployeeDocument } from "../model/document";

export class DocumentService {
  async getDocumentsByEmployeeId(employeeId: string): Promise<EmployeeDocument[]> {
    const employee = await employeeRepo.findById(employeeId);
    if (!employee) {
      throw AppError.notFound("employee not found");
    }
    return await documentRepo.findByEmployeeId(employeeId);
  }

  async uploadDocument(actingUserId: string, employeeId: string, file: File): Promise<EmployeeDocument> {
    const employee = await employeeRepo.findById(employeeId);
    if (!employee) {
      throw AppError.notFound("employee not found");
    }

    if (!file) {
      throw AppError.badRequest("file is required");
    }

    if (file.size > config.MAX_UPLOAD_BYTES) {
      throw AppError.badRequest(`file size exceeds maximum limit of ${config.MAX_UPLOAD_BYTES} bytes`);
    }

    const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedMimeTypes.includes(file.type)) {
      throw AppError.badRequest("document must be PDF, JPEG, or PNG format");
    }

    let ext = "bin";
    if (file.type === "application/pdf") ext = "pdf";
    else if (file.type === "image/png") ext = "png";
    else if (file.type === "image/jpeg") ext = "jpg";

    const storageFileName = `${crypto.randomUUID()}.${ext}`;
    const relativePath = await storage.save("employees/documents", storageFileName, file);

    try {
      const doc = await documentRepo.create({
        employee_id: employeeId,
        type: "diploma",
        file_name: file.name || storageFileName,
        file_path: relativePath,
        mime_type: file.type,
        file_size: file.size,
      });

      await auditRepo.create({
        user_id: actingUserId,
        action: "UPLOAD_DOCUMENT",
        entity: "document",
        entity_id: doc.id,
      });

      return doc;
    } catch (err) {
      // Rollback stored file if DB insertion failed
      await storage.delete(relativePath);
      throw err;
    }
  }

  async createMetadata(actingUserId: string, data: {
    employee_id?: string;
    type?: string;
    file_name?: string;
    file_path?: string;
    mime_type?: string;
    file_size?: number;
  }): Promise<EmployeeDocument> {
    if (!data.employee_id || !data.file_name || !data.file_path || !data.mime_type || !data.file_size) {
      throw AppError.badRequest("employee_id, file_name, file_path, mime_type, and file_size are required");
    }

    const employee = await employeeRepo.findById(data.employee_id);
    if (!employee) {
      throw AppError.notFound("employee not found");
    }

    const doc = await documentRepo.create({
      employee_id: data.employee_id,
      type: data.type || "diploma",
      file_name: data.file_name,
      file_path: data.file_path,
      mime_type: data.mime_type,
      file_size: data.file_size,
    });

    await auditRepo.create({
      user_id: actingUserId,
      action: "CREATE_DOCUMENT_METADATA",
      entity: "document",
      entity_id: doc.id,
    });

    return doc;
  }

  async updateMetadata(actingUserId: string, data: {
    id?: string;
    employee_id?: string;
    type?: string;
    file_name?: string;
    file_path?: string;
    mime_type?: string;
    file_size?: number;
  }): Promise<EmployeeDocument> {
    if (!data.id) {
      throw AppError.badRequest("document id is required in request body");
    }

    const existing = await documentRepo.findById(data.id);
    if (!existing) {
      throw AppError.notFound("document not found");
    }

    const updated = await documentRepo.update({
      id: data.id,
      employee_id: data.employee_id || existing.employee_id,
      type: data.type || existing.type,
      file_name: data.file_name || existing.file_name,
      file_path: data.file_path || existing.file_path,
      mime_type: data.mime_type || existing.mime_type,
      file_size: data.file_size !== undefined ? data.file_size : existing.file_size,
    });

    if (!updated) {
      throw AppError.internal("failed to update document metadata");
    }

    await auditRepo.create({
      user_id: actingUserId,
      action: "UPDATE_DOCUMENT_METADATA",
      entity: "document",
      entity_id: updated.id,
    });

    return updated;
  }

  async deleteMetadata(actingUserId: string, id?: string): Promise<void> {
    if (!id) {
      throw AppError.badRequest("document id is required in request body");
    }

    const existing = await documentRepo.findById(id);
    if (!existing) {
      throw AppError.notFound("document not found");
    }

    await storage.delete(existing.file_path);
    const success = await documentRepo.delete(id);
    if (!success) {
      throw AppError.internal("failed to delete document");
    }

    await auditRepo.create({
      user_id: actingUserId,
      action: "DELETE_DOCUMENT",
      entity: "document",
      entity_id: id,
    });
  }

  async getDocumentFile(employeeId: string, documentId: string) {
    const doc = await documentRepo.findById(documentId);
    if (!doc || doc.employee_id !== employeeId) {
      throw AppError.notFound("document not found for this employee");
    }

    const file = storage.getFile(doc.file_path);
    if (!(await file.exists())) {
      throw AppError.notFound("document file missing from storage");
    }

    return {
      file,
      doc,
    };
  }
}

export const documentService = new DocumentService();
