import { sql } from "../db";

export interface AuditLogInsert {
  user_id?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  ip_address?: string | null;
}

export class AuditRepository {
  async create(log: AuditLogInsert): Promise<void> {
    await sql`
      INSERT INTO audit_logs (user_id, action, entity, entity_id, ip_address)
      VALUES (${log.user_id || null}, ${log.action}, ${log.entity}, ${log.entity_id || null}, ${log.ip_address || null})
    `;
  }
}

export const auditRepo = new AuditRepository();
