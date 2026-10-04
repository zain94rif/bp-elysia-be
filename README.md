# BE Elysia – Employee Management REST API

Backend API for employee management built with **Bun 1.4**, **ElysiaJS**, and **PostgreSQL**.

## Tech Stack & Features

- **Runtime**: Bun 1.4
- **Framework**: ElysiaJS
- **Database**: PostgreSQL (using Bun's native `Bun.sql`)
- **Password Hashing**: `Bun.password` (bcrypt)
- **JWT**: `@elysiajs/jwt`
- **CORS**: `@elysiajs/cors`
- **CAPTCHA**: `svg-captcha` (`internal` SVG mode), `provider` mode, or `disabled` mode
- **File Storage**: Local filesystem via `Bun.file` abstraction

## Prerequisites

- Bun 1.4+
- PostgreSQL database

## Environment Variables

Create `.env` file (or pass environment variables):

```env
APP_PORT=3000
APP_ENV=development
FRONTEND_URL=http://localhost:5173

DATABASE_URL=postgres://postgres:postgres@localhost:5432/be_elysia
DATABASE_SCHEMA=public

JWT_SECRET=super-secret-jwt-key-change-me
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=720h

CAPTCHA_MODE=internal
CAPTCHA_REQUIRED=false

STORAGE_PATH=./storage
MAX_UPLOAD_BYTES=26214400

SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=change-me
```

## Running locally

```bash
# Install dependencies (if not already installed)
bun install

# Start development server
bun dev
```

## API Routes Overview

- `GET /health` - Liveness check
- `GET /ready` - Database readiness check
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/captcha` - Get CAPTCHA challenge
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/employees` - Search & list employees (ADMIN/VIEWER)
- `GET /api/v1/employees/:id` - Employee details (ADMIN/VIEWER)
- `POST /api/v1/employees` - Create employee (ADMIN)
- `PUT /api/v1/employees` - Update employee (ADMIN, ID in body)
- `DELETE /api/v1/employees` - Soft delete employee (ADMIN, ID in body)
- `POST /api/v1/employees/:id/photo` - Upload employee photo (ADMIN, multipart `file`)
- `POST /api/v1/employees/:id/documents/upload` - Upload document (ADMIN, multipart `file`)
- `GET /api/v1/users` - List users (ADMIN)
- `POST /api/v1/users` - Create user (ADMIN)
- `PUT /api/v1/users` - Update user (ADMIN, ID in body)
- `DELETE /api/v1/users` - Deactivate user (ADMIN, ID in body)