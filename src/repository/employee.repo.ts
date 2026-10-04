import { sql } from "../db";
import { Employee, EmployeeQuery } from "../model/employee";

export class EmployeeRepository {
  async findById(id: string): Promise<Employee | null> {
    const rows = await sql<Employee[]>`
      SELECT * FROM employees WHERE id = ${id} AND deleted_at IS NULL LIMIT 1
    `;
    return rows[0] || null;
  }

  async findActiveByUniqueField(field: "nik" | "kpj" | "phone" | "email", value: string, excludeId?: string): Promise<Employee | null> {
    if (excludeId) {
      const rows = await sql.unsafe(
        `SELECT * FROM employees WHERE ${field} = $1 AND id != $2 AND deleted_at IS NULL LIMIT 1`,
        [value, excludeId]
      );
      return rows[0] || null;
    } else {
      const rows = await sql.unsafe(
        `SELECT * FROM employees WHERE ${field} = $1 AND deleted_at IS NULL LIMIT 1`,
        [value]
      );
      return rows[0] || null;
    }
  }

  async search(query: EmployeeQuery): Promise<{ data: Employee[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const search = query.search?.trim();
    const field = query.field?.trim().toLowerCase() || "all";

    let countQuery = "SELECT COUNT(*) as count FROM employees WHERE deleted_at IS NULL";
    let dataQuery = "SELECT * FROM employees WHERE deleted_at IS NULL";
    const params: any[] = [];

    if (search && search.length <= 100) {
      const pattern = `%${search}%`;
      const validFields = ["nik", "kpj", "full_name", "phone", "email", "birth_place", "birth_date", "address"];
      
      if (field !== "all" && validFields.includes(field)) {
        params.push(pattern);
        countQuery += ` AND ${field}::text ILIKE $${params.length}`;
        dataQuery += ` AND ${field}::text ILIKE $${params.length}`;
      } else {
        params.push(pattern);
        const pIndex = params.length;
        const searchClause = ` AND (
          nik ILIKE $${pIndex} OR 
          kpj ILIKE $${pIndex} OR 
          full_name ILIKE $${pIndex} OR 
          phone ILIKE $${pIndex} OR 
          email ILIKE $${pIndex} OR 
          birth_place ILIKE $${pIndex} OR 
          address ILIKE $${pIndex}
        )`;
        countQuery += searchClause;
        dataQuery += searchClause;
      }
    }

    dataQuery += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    
    const countResult = await sql.unsafe(countQuery, params);
    const total = parseInt(countResult[0]?.count || "0", 10);

    const rows = await sql.unsafe(dataQuery, [...params, limit, offset]);

    return {
      data: rows as Employee[],
      total,
      page,
      limit,
    };
  }

  async create(data: Omit<Employee, "id" | "created_at" | "updated_at" | "deleted_at">): Promise<Employee> {
    const rows = await sql<Employee[]>`
      INSERT INTO employees (
        nik, kpj, full_name, phone, email, birth_place, birth_date, address, photo_path
      ) VALUES (
        ${data.nik}, ${data.kpj}, ${data.full_name}, ${data.phone}, ${data.email},
        ${data.birth_place}, ${data.birth_date}, ${data.address}, ${data.photo_path || null}
      )
      RETURNING *
    `;
    return rows[0];
  }

  async update(data: {
    id: string;
    nik: string;
    kpj: string;
    full_name: string;
    phone: string;
    email: string;
    birth_place: string;
    birth_date: string;
    address: string;
  }): Promise<Employee | null> {
    const rows = await sql<Employee[]>`
      UPDATE employees
      SET nik = ${data.nik},
          kpj = ${data.kpj},
          full_name = ${data.full_name},
          phone = ${data.phone},
          email = ${data.email},
          birth_place = ${data.birth_place},
          birth_date = ${data.birth_date},
          address = ${data.address},
          updated_at = NOW()
      WHERE id = ${data.id} AND deleted_at IS NULL
      RETURNING *
    `;
    return rows[0] || null;
  }

  async updatePhoto(id: string, photoPath: string): Promise<Employee | null> {
    const rows = await sql<Employee[]>`
      UPDATE employees
      SET photo_path = ${photoPath}, updated_at = NOW()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING *
    `;
    return rows[0] || null;
  }

  async softDelete(id: string): Promise<boolean> {
    const rows = await sql`
      UPDATE employees
      SET deleted_at = NOW()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING id
    `;
    return rows.length > 0;
  }
}

export const employeeRepo = new EmployeeRepository();
