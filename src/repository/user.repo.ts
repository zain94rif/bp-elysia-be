import { sql } from "../db";
import { User, UserRole } from "../model/user";

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const rows = await sql<User[]>`
      SELECT id, email, password_hash, role, active, created_at FROM users WHERE email = ${email} LIMIT 1
    `;
    return rows[0] || null;
  }

  async findById(id: string): Promise<User | null> {
    const rows = await sql<User[]>`
      SELECT id, email, password_hash, role, active, created_at FROM users WHERE id = ${id} LIMIT 1
    `;
    return rows[0] || null;
  }

  async findAll(): Promise<User[]> {
    return await sql<User[]>`
      SELECT id, email, password_hash, role, active, created_at FROM users ORDER BY created_at DESC
    `;
  }

  async create(data: { email: string; password_hash: string; role: UserRole; active?: boolean }): Promise<User> {
    const active = data.active !== undefined ? data.active : true;
    const rows = await sql<User[]>`
      INSERT INTO users (email, password_hash, role, active)
      VALUES (${data.email}, ${data.password_hash}, ${data.role}, ${active})
      RETURNING id, email, password_hash, role, active, created_at
    `;
    return rows[0];
  }

  async update(data: { id: string; email: string; role: UserRole; active: boolean; password_hash?: string }): Promise<User | null> {
    if (data.password_hash) {
      const rows = await sql<User[]>`
        UPDATE users
        SET email = ${data.email},
            role = ${data.role},
            active = ${data.active},
            password_hash = ${data.password_hash}
        WHERE id = ${data.id}
        RETURNING id, email, password_hash, role, active, created_at
      `;
      return rows[0] || null;
    } else {
      const rows = await sql<User[]>`
        UPDATE users
        SET email = ${data.email},
            role = ${data.role},
            active = ${data.active}
        WHERE id = ${data.id}
        RETURNING id, email, password_hash, role, active, created_at
      `;
      return rows[0] || null;
    }
  }

  async deactivate(id: string): Promise<boolean> {
    const rows = await sql`
      UPDATE users
      SET active = false
      WHERE id = ${id}
      RETURNING id
    `;
    return rows.length > 0;
  }
}

export const userRepo = new UserRepository();
