import { sql } from "../db";
import { EmployeeDocument } from "../model/document";

export class DocumentRepository {
  async findByEmployeeId(employeeId: string): Promise<EmployeeDocument[]> {
    return await sql<EmployeeDocument[]>`
      SELECT id, employee_id, type, file_name, file_path, mime_type, file_size, created_at FROM employee_documents
      WHERE employee_id = ${employeeId}
      ORDER BY created_at DESC
    `;
  }

  async findById(id: string): Promise<EmployeeDocument | null> {
    const rows = await sql<EmployeeDocument[]>`
      SELECT id, employee_id, type, file_name, file_path, mime_type, file_size, created_at FROM employee_documents WHERE id = ${id} LIMIT 1
    `;
    return rows[0] || null;
  }

  async create(data: Omit<EmployeeDocument, "id" | "created_at">): Promise<EmployeeDocument> {
    const rows = await sql<EmployeeDocument[]>`
      INSERT INTO employee_documents (
        employee_id, type, file_name, file_path, mime_type, file_size
      ) VALUES (
        ${data.employee_id}, ${data.type}, ${data.file_name}, ${data.file_path}, ${data.mime_type}, ${data.file_size}
      )
      RETURNING id, employee_id, type, file_name, file_path, mime_type, file_size, created_at
    `;
    return rows[0];
  }

  async update(data: {
    id: string;
    employee_id: string;
    type: string;
    file_name: string;
    file_path: string;
    mime_type: string;
    file_size: number;
  }): Promise<EmployeeDocument | null> {
    const rows = await sql<EmployeeDocument[]>`
      UPDATE employee_documents
      SET employee_id = ${data.employee_id},
          type = ${data.type},
          file_name = ${data.file_name},
          file_path = ${data.file_path},
          mime_type = ${data.mime_type},
          file_size = ${data.file_size}
      WHERE id = ${data.id}
      RETURNING id, employee_id, type, file_name, file_path, mime_type, file_size, created_at
    `;
    return rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await sql`
      DELETE FROM employee_documents WHERE id = ${id} RETURNING id
    `;
    return rows.length > 0;
  }
}

export const documentRepo = new DocumentRepository();
