# DreamCatcher Authentication

## Overview

DreamCatcher uses **JWT (JSON Web Tokens)** for authentication. Users register or log in to receive an access token, which is sent in the `Authorization: Bearer <token>` header for protected endpoints. Tokens use HS256 and expire after 7 days (configurable).

**Flow:** Register → Login → Receive JWT → Include token in `Authorization` header for `/api/auth/me` and other protected routes.

---

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | OAuth2 form login (form-urlencoded) |
| POST | `/api/auth/login/json` | JSON login |
| GET | `/api/auth/me` | Get current user (requires auth) |

### POST /api/auth/register

**Request body (JSON):**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "Optional Name"
}
```

- `email`: Valid email (required)
- `password`: 6–128 characters (required)
- `name`: Optional

### POST /api/auth/login (OAuth2 form)

Form-urlencoded body:
- `username`: Email address
- `password`: Password

### POST /api/auth/login/json

**Request body (JSON):**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

### GET /api/auth/me

Requires `Authorization: Bearer <access_token>` header. Returns current user (id, email, name, created_at).

---

## Security Features

| Feature | Implementation |
|---------|----------------|
| Password hashing | bcrypt, 12 rounds |
| JWT algorithm | HS256 |
| Email normalization | Lowercase + strip on registration |
| Transaction safety | Rollback on errors |
| Race conditions | IntegrityError handling for duplicate email |
| Password validation | 6–128 characters (registration) |

---

## Error Codes

| Code | Meaning |
|------|---------|
| 200 | Login successful |
| 201 | Registration successful |
| 400 | Email already registered |
| 401 | Invalid credentials (wrong email/password or invalid token) |
| 422 | Validation error (invalid email, password length, missing fields) |
| 500 | Internal server error (e.g. registration failure) |

---

## Testing

Run auth tests:

```bash
pytest tests/test_auth.py -v
```

**25 unit tests** cover:
- Registration (success, duplicate email, validation, edge cases)
- Login (form and JSON, wrong password, nonexistent user)
- Token validation (`/me` with valid/invalid/missing token)
- Password security (never returned in responses)

---

## CORS Configuration

CORS is configured in `backend/main.py`. Allowed origins for development:

| Origin | Purpose |
|--------|---------|
| `http://localhost:5173` | Vite dev server (web frontend) |
| `http://127.0.0.1:5173` | Vite (127.0.0.1) |
| `http://localhost:5111` | Backend dev tools |
| `http://127.0.0.1:5111` | Backend (127.0.0.1) |
| `http://localhost:8081` | Expo web |
| `http://127.0.0.1:8081` | Expo web |
| `http://localhost:19006` | Expo alternate port |
| `http://localhost:19000` | Expo Go |

**To add a new origin:** Add the URL to the `allow_origins` list in `app.add_middleware(CORSMiddleware, ...)` in `main.py`.

---

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `secret_key` | `dev-secret-key-change-in-production` | JWT signing key (set in production) |
| `algorithm` | `HS256` | JWT algorithm |
| `access_token_expire_minutes` | 10080 (7 days) | Token expiry |

Configure via `.env` or environment variables.
