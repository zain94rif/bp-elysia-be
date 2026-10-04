import { employeeRepo } from "../repository/employee.repo";
import { auditRepo } from "../repository/audit.repo";
import { storage } from "../storage/local";
import { config } from "../config";
import { AppError } from "../apperror";
import { Employee, EmployeeQuery } from "../model/employee";

export class EmployeeService {
  private validateEmployeeData(data: Partial<Employee>, isUpdate = false) {
    if (!isUpdate || data.nik !== undefined) {
      if (!data.nik || !/^\d{16}$/.test(data.nik)) {
        throw AppError.badRequest("NIK must be exactly 16 digits");
      }
    }

    if (!isUpdate || data.kpj !== undefined) {
      if (!data.kpj || !data.kpj.trim()) {
        throw AppError.badRequest("KPJ is required");
      }
    }

    if (!isUpdate || data.full_name !== undefined) {
      if (!data.full_name || !data.full_name.trim()) {
        throw AppError.badRequest("full_name is required");
      }
    }

    if (!isUpdate || data.phone !== undefined) {
      if (!data.phone || !data.phone.trim()) {
        throw AppError.badRequest("phone is required");
      }
    }

    if (!isUpdate || data.email !== undefined) {
      if (!data.email || !data.email.includes("@")) {
        throw AppError.badRequest("valid email is required");
      }
    }

    if (!isUpdate || data.birth_place !== undefined) {
      if (!data.birth_place || !data.birth_place.trim()) {
        throw AppError.badRequest("birth_place is required");
      }
    }

    if (!isUpdate || data.birth_date !== undefined) {
      if (!data.birth_date) {
        throw AppError.badRequest("birth_date is required");
      }
      const bDateStr = typeof data.birth_date === "string" 
        ? data.birth_date 
        : data.birth_date instanceof Date 
          ? data.birth_date.toISOString().split("T")[0] 
          : "";

      if (!/^\d{4}-\d{2}-\d{2}$/.test(bDateStr)) {
        throw AppError.badRequest("birth_date must be in YYYY-MM-DD format");
      }

      const dateObj = new Date(bDateStr);
      if (isNaN(dateObj.getTime())) {
        throw AppError.badRequest("invalid birth_date");
      }
      if (dateObj.getTime() > Date.now()) {
        throw AppError.badRequest("birth_date cannot be in the future");
      }
    }

    if (!isUpdate || data.address !== undefined) {
      if (!data.address || !data.address.trim()) {
        throw AppError.badRequest("address is required");
      }
    }
  }

  private async checkUniqueness(
    data: { nik: string; kpj: string; phone: string; email: string },
    excludeId?: string
  ) {
    const nikDup = await employeeRepo.findActiveByUniqueField("nik", data.nik, excludeId);
    if (nikDup) throw AppError.conflict("NIK already exists", "DUPLICATE_NIK");

    const kpjDup = await employeeRepo.findActiveByUniqueField("kpj", data.kpj, excludeId);
    if (kpjDup) throw AppError.conflict("KPJ already exists", "DUPLICATE_KPJ");

    const phoneDup = await employeeRepo.findActiveByUniqueField("phone", data.phone, excludeId);
    if (phoneDup) throw AppError.conflict("phone number already exists", "DUPLICATE_PHONE");

    const emailDup = await employeeRepo.findActiveByUniqueField("email", data.email, excludeId);
    if (emailDup) throw AppError.conflict("email already exists", "DUPLICATE_EMAIL");
  }

  async searchEmployees(query: EmployeeQuery) {
    const result = await employeeRepo.search(query);
    return {
      data: result.data,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    };
  }

  async getEmployeeById(id: string): Promise<Employee> {
    const employee = await employeeRepo.findById(id);
    if (!employee) {
      throw AppError.notFound("employee not found");
    }
    return employee;
  }

  async createEmployee(actingUserId: string, data: Omit<Employee, "id" | "created_at" | "updated_at" | "deleted_at">): Promise<Employee> {
    this.validateEmployeeData(data);
    await this.checkUniqueness({
      nik: data.nik,
      kpj: data.kpj.trim(),
      phone: data.phone.trim(),
      email: data.email.trim().toLowerCase(),
    });

    const birthDateStr = typeof data.birth_date === "string" 
      ? data.birth_date 
      : (data.birth_date as Date).toISOString().split("T")[0];

    const employee = await employeeRepo.create({
      ...data,
      nik: data.nik.trim(),
      kpj: data.kpj.trim(),
      full_name: data.full_name.trim(),
      phone: data.phone.trim(),
      email: data.email.trim().toLowerCase(),
      birth_place: data.birth_place.trim(),
      birth_date: birthDateStr,
      address: data.address.trim(),
    });

    await auditRepo.create({
      user_id: actingUserId,
      action: "CREATE",
      entity: "employee",
      entity_id: employee.id,
    });

    return employee;
  }

  async updateEmployee(actingUserId: string, data: {
    id?: string;
    nik: string;
    kpj: string;
    full_name: string;
    phone: string;
    email: string;
    birth_place: string;
    birth_date: string;
    address: string;
  }): Promise<Employee> {
    if (!data.id) {
      throw AppError.badRequest("employee id is required in request body");
    }

    const existing = await employeeRepo.findById(data.id);
    if (!existing) {
      throw AppError.notFound("employee not found");
    }

    this.validateEmployeeData(data, true);

    await this.checkUniqueness({
      nik: data.nik.trim(),
      kpj: data.kpj.trim(),
      phone: data.phone.trim(),
      email: data.email.trim().toLowerCase(),
    }, data.id);

    const updated = await employeeRepo.update({
      id: data.id,
      nik: data.nik.trim(),
      kpj: data.kpj.trim(),
      full_name: data.full_name.trim(),
      phone: data.phone.trim(),
      email: data.email.trim().toLowerCase(),
      birth_place: data.birth_place.trim(),
      birth_date: data.birth_date,
      address: data.address.trim(),
    });

    if (!updated) {
      throw AppError.internal("failed to update employee");
    }

    await auditRepo.create({
      user_id: actingUserId,
      action: "UPDATE",
      entity: "employee",
      entity_id: updated.id,
    });

    return updated;
  }

  async deleteEmployee(actingUserId: string, id?: string): Promise<void> {
    if (!id) {
      throw AppError.badRequest("employee id is required in request body");
    }

    const existing = await employeeRepo.findById(id);
    if (!existing) {
      throw AppError.notFound("employee not found");
    }

    const success = await employeeRepo.softDelete(id);
    if (!success) {
      throw AppError.internal("failed to delete employee");
    }

    await auditRepo.create({
      user_id: actingUserId,
      action: "DELETE",
      entity: "employee",
      entity_id: id,
    });
  }

  async uploadPhoto(actingUserId: string, employeeId: string, file: File): Promise<Employee> {
    const employee = await employeeRepo.findById(employeeId);
    if (!employee) {
      throw AppError.notFound("employee not found");
    }

    if (!file) {
      throw AppError.badRequest("photo file is required");
    }

    if (file.size > config.MAX_UPLOAD_BYTES) {
      throw AppError.badRequest(`file size exceeds maximum limit of ${config.MAX_UPLOAD_BYTES} bytes`);
    }

    const allowedMimeTypes = ["image/jpeg", "image/png"];
    if (!allowedMimeTypes.includes(file.type)) {
      throw AppError.badRequest("photo must be JPEG or PNG format");
    }

    const ext = file.type === "image/png" ? "png" : "jpg";
    const fileName = `${crypto.randomUUID()}.${ext}`;

    const relativePath = await storage.save("employees/photos", fileName, file);

    const updated = await employeeRepo.updatePhoto(employeeId, relativePath);
    if (!updated) {
      // Rollback saved file if DB update failed
      await storage.delete(relativePath);
      throw AppError.internal("failed to update employee photo path in database");
    }

    await auditRepo.create({
      user_id: actingUserId,
      action: "UPLOAD_PHOTO",
      entity: "employee",
      entity_id: employeeId,
    });

    return updated;
  }

  async getPhotoFile(employeeId: string) {
    const employee = await employeeRepo.findById(employeeId);
    if (!employee || !employee.photo_path) {
      throw AppError.notFound("photo not found for this employee");
    }

    const file = storage.getFile(employee.photo_path);
    if (!(await file.exists())) {
      throw AppError.notFound("photo file missing from storage");
    }

    return file;
  }
}

export const employeeService = new EmployeeService();
