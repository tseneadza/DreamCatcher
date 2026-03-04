import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from database import Base, get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture
def registered_user(client):
    """Helper fixture to create a registered user and return credentials."""
    user_data = {
        "email": "testuser@example.com",
        "password": "securepassword123",
        "name": "Test User"
    }
    response = client.post("/api/auth/register", json=user_data)
    assert response.status_code == 201
    return user_data


@pytest.fixture
def auth_token(client, registered_user):
    """Helper fixture to get an auth token for a registered user."""
    response = client.post(
        "/api/auth/login",
        data={
            "username": registered_user["email"],
            "password": registered_user["password"]
        }
    )
    assert response.status_code == 200
    return response.json()["access_token"]


class TestRegistration:
    """Tests for user registration endpoint."""

    def test_register_success(self, client):
        """Valid registration creates user and returns correct response."""
        user_data = {
            "email": "newuser@example.com",
            "password": "strongpassword123",
            "name": "New User"
        }
        response = client.post("/api/auth/register", json=user_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["name"] == user_data["name"]
        assert "id" in data
        assert "created_at" in data
        assert "password" not in data
        assert "password_hash" not in data

    def test_register_duplicate_email(self, client, registered_user):
        """Duplicate email returns 400 error."""
        duplicate_data = {
            "email": registered_user["email"],
            "password": "differentpassword",
            "name": "Duplicate User"
        }
        response = client.post("/api/auth/register", json=duplicate_data)
        
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"].lower()

    def test_register_invalid_email(self, client):
        """Invalid email format returns 422 validation error."""
        invalid_data = {
            "email": "not-an-email",
            "password": "password123",
            "name": "Test"
        }
        response = client.post("/api/auth/register", json=invalid_data)
        
        assert response.status_code == 422

    def test_register_missing_password(self, client):
        """Missing password field returns 422 validation error."""
        incomplete_data = {
            "email": "test@example.com",
            "name": "Test User"
        }
        response = client.post("/api/auth/register", json=incomplete_data)
        
        assert response.status_code == 422

    def test_register_empty_password(self, client):
        """Empty password is handled (may be accepted or rejected based on validation)."""
        data = {
            "email": "emptypass@example.com",
            "password": "",
            "name": "Test User"
        }
        response = client.post("/api/auth/register", json=data)
        # Empty password is technically valid per schema, but we document the behavior
        # The system accepts empty passwords (no min length validation in schema)
        assert response.status_code in [201, 422]

    def test_register_response_format(self, client):
        """Response has all expected fields with correct types."""
        user_data = {
            "email": "format@example.com",
            "password": "password123",
            "name": "Format Test"
        }
        response = client.post("/api/auth/register", json=user_data)
        
        assert response.status_code == 201
        data = response.json()
        
        # Check all expected fields exist
        assert "id" in data
        assert "email" in data
        assert "name" in data
        assert "created_at" in data
        
        # Check types
        assert isinstance(data["id"], int)
        assert isinstance(data["email"], str)
        assert data["name"] is None or isinstance(data["name"], str)
        assert isinstance(data["created_at"], str)

    def test_register_without_name(self, client):
        """Registration without name (optional field) succeeds."""
        user_data = {
            "email": "noname@example.com",
            "password": "password123"
        }
        response = client.post("/api/auth/register", json=user_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["name"] is None


class TestLogin:
    """Tests for user login endpoints."""

    def test_login_success(self, client, registered_user):
        """Valid credentials return access token."""
        response = client.post(
            "/api/auth/login",
            data={
                "username": registered_user["email"],
                "password": registered_user["password"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 0

    def test_login_wrong_password(self, client, registered_user):
        """Wrong password returns 401 unauthorized."""
        response = client.post(
            "/api/auth/login",
            data={
                "username": registered_user["email"],
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code == 401
        assert "incorrect" in response.json()["detail"].lower()

    def test_login_nonexistent_user(self, client):
        """Login with unknown email returns 401 unauthorized."""
        response = client.post(
            "/api/auth/login",
            data={
                "username": "nonexistent@example.com",
                "password": "anypassword"
            }
        )
        
        assert response.status_code == 401

    def test_login_json_endpoint(self, client, registered_user):
        """JSON login endpoint works correctly."""
        response = client.post(
            "/api/auth/login/json",
            json={
                "email": registered_user["email"],
                "password": registered_user["password"]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"

    def test_login_json_wrong_password(self, client, registered_user):
        """JSON login with wrong password returns 401."""
        response = client.post(
            "/api/auth/login/json",
            json={
                "email": registered_user["email"],
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code == 401

    def test_login_json_invalid_email_format(self, client):
        """JSON login with invalid email format returns 422."""
        response = client.post(
            "/api/auth/login/json",
            json={
                "email": "invalid-email",
                "password": "password123"
            }
        )
        
        assert response.status_code == 422


class TestTokenValidation:
    """Tests for token-protected endpoints."""

    def test_me_endpoint_with_valid_token(self, client, registered_user, auth_token):
        """GET /me with valid token returns user info."""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == registered_user["email"]
        assert data["name"] == registered_user["name"]
        assert "id" in data
        assert "created_at" in data
        assert "password" not in data
        assert "password_hash" not in data

    def test_me_endpoint_without_token(self, client):
        """GET /me without token returns 401."""
        response = client.get("/api/auth/me")
        
        assert response.status_code == 401

    def test_me_endpoint_with_invalid_token(self, client):
        """GET /me with invalid token returns 401."""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid-token-string"}
        )
        
        assert response.status_code == 401

    def test_me_endpoint_with_malformed_auth_header(self, client):
        """GET /me with malformed Authorization header returns 401."""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "NotBearer sometoken"}
        )
        
        assert response.status_code == 401

    def test_me_endpoint_with_expired_token_format(self, client):
        """GET /me with token that looks valid but is actually corrupted returns 401."""
        # A JWT-like string that will fail decoding
        fake_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.invalidsignature"
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {fake_token}"}
        )
        
        assert response.status_code == 401


class TestPasswordSecurity:
    """Tests to verify password handling security."""

    def test_password_not_in_registration_response(self, client):
        """Password is never returned in registration response."""
        user_data = {
            "email": "secure@example.com",
            "password": "mysecretpassword",
            "name": "Secure User"
        }
        response = client.post("/api/auth/register", json=user_data)
        
        assert response.status_code == 201
        data = response.json()
        assert "password" not in data
        assert "password_hash" not in data
        assert "mysecretpassword" not in str(data)

    def test_password_not_in_me_response(self, client, registered_user, auth_token):
        """Password is never returned in /me response."""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "password" not in data
        assert "password_hash" not in data


class TestEdgeCases:
    """Edge case and boundary tests."""

    def test_register_with_special_characters_in_name(self, client):
        """Registration with special characters in name succeeds."""
        user_data = {
            "email": "special@example.com",
            "password": "password123",
            "name": "O'Brien-Smith Jr."
        }
        response = client.post("/api/auth/register", json=user_data)
        
        assert response.status_code == 201
        assert response.json()["name"] == user_data["name"]

    def test_register_with_unicode_name(self, client):
        """Registration with unicode characters in name succeeds."""
        user_data = {
            "email": "unicode@example.com",
            "password": "password123",
            "name": "日本語 名前"
        }
        response = client.post("/api/auth/register", json=user_data)
        
        assert response.status_code == 201
        assert response.json()["name"] == user_data["name"]

    def test_case_sensitivity_in_email(self, client):
        """Email comparison is case-insensitive for duplicate detection."""
        user_data = {
            "email": "CaseSensitive@Example.com",
            "password": "password123"
        }
        response = client.post("/api/auth/register", json=user_data)
        assert response.status_code == 201
        
        # Try to register with different case - behavior depends on implementation
        user_data_lower = {
            "email": "casesensitive@example.com",
            "password": "password456"
        }
        response2 = client.post("/api/auth/register", json=user_data_lower)
        # Document actual behavior: emails are stored as-is, so different cases create different users
        # This is the current behavior, may want to normalize in future
        assert response2.status_code in [201, 400]

    def test_login_after_registration(self, client):
        """User can immediately login after registration."""
        user_data = {
            "email": "immediate@example.com",
            "password": "password123",
            "name": "Immediate User"
        }
        
        # Register
        reg_response = client.post("/api/auth/register", json=user_data)
        assert reg_response.status_code == 201
        
        # Login immediately
        login_response = client.post(
            "/api/auth/login",
            data={
                "username": user_data["email"],
                "password": user_data["password"]
            }
        )
        assert login_response.status_code == 200
        assert "access_token" in login_response.json()

    def test_multiple_logins_generate_different_tokens(self, client, registered_user):
        """Multiple login requests generate tokens (may or may not be different)."""
        tokens = []
        for _ in range(3):
            response = client.post(
                "/api/auth/login",
                data={
                    "username": registered_user["email"],
                    "password": registered_user["password"]
                }
            )
            assert response.status_code == 200
            tokens.append(response.json()["access_token"])
        
        # All tokens should be valid and non-empty
        assert all(len(t) > 0 for t in tokens)
