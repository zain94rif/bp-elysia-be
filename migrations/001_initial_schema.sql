-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nik          VARCHAR(16)   NOT NULL,
  kpj          TEXT          NOT NULL,
  full_name    TEXT          NOT NULL,
  phone        TEXT          NOT NULL,
  email        TEXT          NOT NULL,
  birth_place  TEXT          NOT NULL,
  birth_date   DATE          NOT NULL,
  address      TEXT          NOT NULL,
  photo_path   TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

-- Ensure optional/added columns exist if table pre-existed
ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo_path TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Active employee uniqueness indexes (soft delete awareness)
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_nik_active ON employees (nik) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_kpj_active ON employees (kpj) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_phone_active ON employees (phone) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_email_active ON employees (email) WHERE deleted_at IS NULL;

-- Trigram indexes for employee search
CREATE INDEX IF NOT EXISTS idx_employees_full_name_trgm ON employees USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_employees_nik_trgm ON employees USING gin (nik gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_employees_kpj_trgm ON employees USING gin (kpj gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_employees_phone_trgm ON employees USING gin (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_employees_email_trgm ON employees USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_employees_birth_place_trgm ON employees USING gin (birth_place gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_employees_address_trgm ON employees USING gin (address gin_trgm_ops);

-- Users table (without updated_at)
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT          NOT NULL UNIQUE,
  password_hash TEXT          NOT NULL,
  role          TEXT          NOT NULL CHECK (role IN ('ADMIN', 'VIEWER')),
  active        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

-- Refresh tokens table (with revoked_at instead of revoked)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT          NOT NULL,
  expires_at   TIMESTAMPTZ   NOT NULL,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens (token_hash);

-- Employee documents table (without updated_at)
CREATE TABLE IF NOT EXISTS employee_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID          NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type         TEXT          NOT NULL DEFAULT 'diploma',
  file_name    TEXT          NOT NULL,
  file_path    TEXT          NOT NULL,
  mime_type    TEXT          NOT NULL,
  file_size    BIGINT        NOT NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_id ON employee_documents (employee_id);

-- Audit logs table (with ip_address)
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID,
  action       TEXT          NOT NULL,
  entity       TEXT          NOT NULL,
  entity_id    UUID,
  ip_address   TEXT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity, entity_id);
