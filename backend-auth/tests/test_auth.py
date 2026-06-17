import os
import pytest
import uuid
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models.user import User, UserRole
from app.auth.security import hash_token

from sqlalchemy.pool import StaticPool

# Define test database URL (in-memory SQLite)
TEST_DATABASE_URL = "sqlite://"

# Create test engine and sessionmaker with StaticPool
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function", name="db_session")
def db_session_fixture():
    # Setup: Create tables
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        # Teardown: Drop tables
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function", name="client")
def client_fixture(db_session):
    # Override get_db dependency
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


# --- REGISTRATION TESTS ---

def test_register_patient_success(client):
    response = client.post(
        "/auth/register",
        json={
            "email": "patient@example.com",
            "password": "Password123!",
            "role": "PATIENT"
        }
    )
    assert response.status_code == 201
    json_data = response.json()
    assert json_data["message"] == "User registered successfully. Please verify your account."
    assert "verification_token" in json_data
    assert json_data["user"]["email"] == "patient@example.com"
    assert json_data["user"]["role"] == "PATIENT"
    assert "id" in json_data["user"]

def test_register_phone_success(client):
    response = client.post(
        "/auth/register",
        json={
            "phone_number": "+1234567890",
            "password": "Password123!",
            "role": "PATIENT"
        }
    )
    assert response.status_code == 201
    json_data = response.json()
    assert json_data["user"]["phone_number"] == "+1234567890"

def test_register_missing_email_and_phone(client):
    response = client.post(
        "/auth/register",
        json={
            "password": "Password123!",
            "role": "PATIENT"
        }
    )
    # Validation error maps to 400
    assert response.status_code == 400
    assert "detail" in response.json()

def test_register_weak_password(client):
    response = client.post(
        "/auth/register",
        json={
            "email": "weak@example.com",
            "password": "simple",  # under 8 chars, no upper/number/special
            "role": "PATIENT"
        }
    )
    assert response.status_code == 400

def test_register_duplicate_email(client):
    # Register once
    response1 = client.post(
        "/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "Password123!",
            "role": "PATIENT"
        }
    )
    assert response1.status_code == 201

    # Register again with same email
    response2 = client.post(
        "/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "DifferentPassword123!",
            "role": "PATIENT"
        }
    )
    assert response2.status_code == 409
    assert response2.json()["detail"] == "Email address already registered"


# --- VERIFICATION TESTS ---

def test_verification_success(client, db_session):
    # Register
    reg_resp = client.post(
        "/auth/register",
        json={
            "email": "verify@example.com",
            "password": "Password123!",
            "role": "PATIENT"
        }
    )
    token = reg_resp.json()["verification_token"]
    user_id = reg_resp.json()["user"]["id"]

    # Check initially not verified in DB
    user = db_session.query(User).filter(User.email == "verify@example.com").first()
    assert user.is_verified is False

    # Verify
    verify_resp = client.post("/auth/verify", json={"verification_token": token})
    assert verify_resp.status_code == 200
    assert verify_resp.json()["message"] == "Account verified successfully"

    # Check database status
    db_session.refresh(user)
    assert user.is_verified is True

def test_verification_invalid_token(client):
    response = client.post("/auth/verify", json={"verification_token": "invalid-token-string"})
    assert response.status_code == 400


# --- LOGIN TESTS ---

def test_login_unverified_account(client):
    # Register
    client.post(
        "/auth/register",
        json={
            "email": "unverified@example.com",
            "password": "Password123!",
            "role": "PATIENT"
        }
    )
    # Login immediately without verification
    login_resp = client.post(
        "/auth/login",
        json={
            "email": "unverified@example.com",
            "password": "Password123!"
        }
    )
    assert login_resp.status_code == 403
    assert "not verified" in login_resp.json()["detail"]

def test_login_success_and_audit(client):
    # Register and verify
    reg_resp = client.post(
        "/auth/register",
        json={
            "email": "login@example.com",
            "password": "Password123!",
            "role": "PATIENT"
        }
    )
    token = reg_resp.json()["verification_token"]
    client.post("/auth/verify", json={"verification_token": token})

    # Login
    login_resp = client.post(
        "/auth/login",
        json={
            "email": "login@example.com",
            "password": "Password123!"
        }
    )
    assert login_resp.status_code == 200
    data = login_resp.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "login@example.com"
    assert data["user"]["role"] == "PATIENT"

def test_login_invalid_credentials(client):
    # Register and verify
    reg_resp = client.post(
        "/auth/register",
        json={
            "email": "badcreds@example.com",
            "password": "Password123!",
            "role": "PATIENT"
        }
    )
    token = reg_resp.json()["verification_token"]
    client.post("/auth/verify", json={"verification_token": token})

    # Bad password
    login_resp = client.post(
        "/auth/login",
        json={
            "email": "badcreds@example.com",
            "password": "WrongPassword123!"
        }
    )
    assert login_resp.status_code == 401
    assert "Invalid email/phone" in login_resp.json()["detail"]


# --- REFRESH TOKEN TESTS ---

def test_refresh_token_rotation(client, db_session):
    # Register and verify
    reg_resp = client.post(
        "/auth/register",
        json={
            "email": "refresh@example.com",
            "password": "Password123!",
            "role": "PATIENT"
        }
    )
    token = reg_resp.json()["verification_token"]
    client.post("/auth/verify", json={"verification_token": token})

    # Login
    login_resp = client.post(
        "/auth/login",
        json={
            "email": "refresh@example.com",
            "password": "Password123!"
        }
    )
    refresh_token = login_resp.json()["refresh_token"]
    user_id = login_resp.json()["user"]["id"]

    # Verify refresh token hash is saved in DB
    user = db_session.query(User).filter(User.id == uuid.UUID(user_id)).first()
    assert user.refresh_token_hash == hash_token(refresh_token)

    # Refresh tokens (Rotation)
    ref_resp = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert ref_resp.status_code == 200
    ref_data = ref_resp.json()
    new_access_token = ref_data["access_token"]
    new_refresh_token = ref_data["refresh_token"]

    assert new_access_token != login_resp.json()["access_token"]
    assert new_refresh_token != refresh_token

    # Verify new refresh token hash is saved in DB
    db_session.refresh(user)
    assert user.refresh_token_hash == hash_token(new_refresh_token)

    # Verify old refresh token is now rejected (rotation invalidates old ones)
    fail_resp = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert fail_resp.status_code == 401


# --- LOGOUT TESTS ---

def test_logout(client, db_session):
    # Register, verify, login
    reg_resp = client.post(
        "/auth/register",
        json={
            "email": "logout@example.com",
            "password": "Password123!",
            "role": "PATIENT"
        }
    )
    token = reg_resp.json()["verification_token"]
    client.post("/auth/verify", json={"verification_token": token})

    login_resp = client.post(
        "/auth/login",
        json={
            "email": "logout@example.com",
            "password": "Password123!"
        }
    )
    access_token = login_resp.json()["access_token"]
    user_id = login_resp.json()["user"]["id"]

    # Verify DB has hash
    user = db_session.query(User).filter(User.id == uuid.UUID(user_id)).first()
    assert user.refresh_token_hash is not None

    # Logout
    headers = {"Authorization": f"Bearer {access_token}"}
    logout_resp = client.post("/auth/logout", headers=headers)
    assert logout_resp.status_code == 200
    assert logout_resp.json()["message"] == "Logged out successfully"

    # Verify DB refresh token hash is cleared
    db_session.refresh(user)
    assert user.refresh_token_hash is None


# --- AUTHORIZATION (RBAC) TESTS ---

def test_rbac_admin_only_endpoint(client):
    # Register, verify, and login as ADMIN
    reg_resp = client.post(
        "/auth/register",
        json={
            "email": "admin@example.com",
            "password": "Password123!",
            "role": "ADMIN"
        }
    )
    token = reg_resp.json()["verification_token"]
    client.post("/auth/verify", json={"verification_token": token})

    login_resp = client.post(
        "/auth/login",
        json={
            "email": "admin@example.com",
            "password": "Password123!"
        }
    )
    admin_token = login_resp.json()["access_token"]

    # Register, verify, and login as PATIENT
    reg_resp_pat = client.post(
        "/auth/register",
        json={
            "email": "pat@example.com",
            "password": "Password123!",
            "role": "PATIENT"
        }
    )
    token_pat = reg_resp_pat.json()["verification_token"]
    client.post("/auth/verify", json={"verification_token": token_pat})

    login_resp_pat = client.post(
        "/auth/login",
        json={
            "email": "pat@example.com",
            "password": "Password123!"
        }
    )
    patient_token = login_resp_pat.json()["access_token"]

    # 1. Admin accesses admin route -> success 200
    resp1 = client.get("/protected/admin", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp1.status_code == 200
    assert resp1.json()["message"] == "Access granted: Admin only"

    # 2. Patient accesses admin route -> forbidden 403
    resp2 = client.get("/protected/admin", headers={"Authorization": f"Bearer {patient_token}"})
    assert resp2.status_code == 403
    assert "insufficient role" in resp2.json()["detail"]

    # 3. Unauthenticated accesses admin route -> unauthorized 401
    resp3 = client.get("/protected/admin")
    assert resp3.status_code == 401

def test_rbac_doctor_or_admin_endpoint(client):
    # Register, verify, and login as DOCTOR
    reg_resp = client.post(
        "/auth/register",
        json={
            "email": "doctor@example.com",
            "password": "Password123!",
            "role": "DOCTOR"
        }
    )
    token = reg_resp.json()["verification_token"]
    client.post("/auth/verify", json={"verification_token": token})

    login_resp = client.post(
        "/auth/login",
        json={
            "email": "doctor@example.com",
            "password": "Password123!"
        }
    )
    doctor_token = login_resp.json()["access_token"]

    # Register, verify, and login as PATIENT
    reg_resp_pat = client.post(
        "/auth/register",
        json={
            "email": "patient_rbac@example.com",
            "password": "Password123!",
            "role": "PATIENT"
        }
    )
    token_pat = reg_resp_pat.json()["verification_token"]
    client.post("/auth/verify", json={"verification_token": token_pat})

    login_resp_pat = client.post(
        "/auth/login",
        json={
            "email": "patient_rbac@example.com",
            "password": "Password123!"
        }
    )
    patient_token = login_resp_pat.json()["access_token"]

    # Doctor accessing -> 200 OK
    resp1 = client.get("/protected/doctor-or-admin", headers={"Authorization": f"Bearer {doctor_token}"})
    assert resp1.status_code == 200

    # Patient accessing -> 403 Forbidden
    resp2 = client.get("/protected/doctor-or-admin", headers={"Authorization": f"Bearer {patient_token}"})
    assert resp2.status_code == 403
