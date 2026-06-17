import os
import shutil
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Set test environment database
os.environ["DATABASE_URL"] = "sqlite:///./test_healthcare.db"
os.environ["SECRET_KEY"] = "test_secret_key_12345"

from app.main import app
from app.database import Base, get_db

# Create test database engine
engine = create_engine("sqlite:///./test_healthcare.db", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override get_db dependency to point to the test database
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# Initialize client
client = TestClient(app)

def setup_module():
    # Create tables
    Base.metadata.create_all(bind=engine)
    # Seed doctors table in testing DB
    from app.routes.doctors import seed_doctors
    db = TestingSessionLocal()
    try:
        seed_doctors(db)
    finally:
        db.close()
    # Clear uploads directory for tests
    uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
    if os.path.exists(uploads_dir):
        shutil.rmtree(uploads_dir)
    os.makedirs(uploads_dir, exist_ok=True)

def teardown_module():
    # Drop tables and remove test DB
    try:
        Base.metadata.drop_all(bind=engine)
    except Exception as e:
        print(f"Warning dropping tables: {e}")
    engine.dispose()
    if os.path.exists("./test_healthcare.db"):
        try:
            os.remove("./test_healthcare.db")
        except Exception as e:
            print(f"Warning removing DB file: {e}")
    # Clean up uploads directory
    uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
    if os.path.exists(uploads_dir):
        try:
            shutil.rmtree(uploads_dir)
        except Exception as e:
            print(f"Warning clearing uploads directory: {e}")

def test_healthcare_backend():
    print("\n--- Starting API Integrations Tests ---")
    setup_module()
    
    try:
        # 1. Register a Patient
        print("Testing /auth/register...")
        reg_response = client.post("/auth/register", json={
            "email": "patient@test.com",
            "password": "password123",
            "role": "patient"
        })
        assert reg_response.status_code == 201, reg_response.text
        assert reg_response.json()["email"] == "patient@test.com"
        assert reg_response.json()["role"] == "patient"
        print("[OK] Register Patient successful")

        # 2. Login the Patient
        print("Testing /auth/login...")
        login_response = client.post("/auth/login", json={
            "email": "patient@test.com",
            "password": "password123"
        })
        assert login_response.status_code == 200, login_response.text
        token_data = login_response.json()
        assert "access_token" in token_data
        assert token_data["role"] == "patient"
        patient_headers = {"Authorization": f"Bearer {token_data['access_token']}"}
        print("[OK] Login Patient successful")

        # 3. Create Patient Profile
        print("Testing POST /profile...")
        profile_response = client.post("/profile", headers=patient_headers, json={
            "name": "John Doe",
            "date_of_birth": "1990-05-15",
            "gender": "male",
            "height": 178.5,
            "weight": 75.0,
            "allergies": "Peanuts",
            "existing_conditions": "None"
        })
        assert profile_response.status_code == 201, profile_response.text
        assert profile_response.json()["name"] == "John Doe"
        print("[OK] Profile creation successful")

        # 4. Get Patient Profile
        print("Testing GET /profile...")
        get_profile_response = client.get("/profile", headers=patient_headers)
        assert get_profile_response.status_code == 200, get_profile_response.text
        assert get_profile_response.json()["allergies"] == "Peanuts"
        print("[OK] Get Profile successful")

        # 5. List Doctors and Filter by Specialization
        print("Testing GET /doctors...")
        # Since startup trigger was run on client setup, check doctors
        doctors_response = client.get("/doctors", headers=patient_headers)
        assert doctors_response.status_code == 200, doctors_response.text
        doctors_list = doctors_response.json()
        assert len(doctors_list) > 0
        doctor_id = doctors_list[0]["id"]
        
        # Test filtering
        filter_response = client.get(f"/doctors?specialization={doctors_list[0]['specialization']}", headers=patient_headers)
        assert filter_response.status_code == 200
        assert len(filter_response.json()) > 0
        print("[OK] Doctors listing and filtering successful")

        # 6. Book Appointment
        print("Testing POST /appointment/book...")
        book_response = client.post("/appointment/book", headers=patient_headers, json={
            "doctor_id": doctor_id,
            "date": "2026-07-20",
            "time": "14:30"
        })
        assert book_response.status_code == 201, book_response.text
        appointment_id = book_response.json()["id"]
        assert book_response.json()["status"] == "booked"
        print("[OK] Book Appointment successful")

        # 7. Get My Appointments
        print("Testing GET /appointment/my-appointments...")
        my_appts_response = client.get("/appointment/my-appointments", headers=patient_headers)
        assert my_appts_response.status_code == 200, my_appts_response.text
        assert len(my_appts_response.json()) == 1
        print("[OK] Get My Appointments successful")

        # 8. Analyze Routine Symptoms
        print("Testing POST /symptom/analyze (Routine)...")
        symp_response = client.post("/symptom/analyze", headers=patient_headers, json={
            "symptoms": "Mild headache and runny nose",
            "severity": "mild",
            "duration": "2 days"
        })
        assert symp_response.status_code == 200, symp_response.text
        symp_data = symp_response.json()
        assert symp_data["emergency_alert"] is False
        assert symp_data["symptom_log"]["risk_category"] in ["Self-Care", "Routine", "Urgent"]
        print("[OK] Symptom analysis (Routine) successful")

        # 9. Analyze Emergency Symptoms
        print("Testing POST /symptom/analyze (Emergency)...")
        em_response = client.post("/symptom/analyze", headers=patient_headers, json={
            "symptoms": "Severe chest pain and sudden stroke-like symptoms",
            "severity": "severe",
            "duration": "10 minutes"
        })
        assert em_response.status_code == 200, em_response.text
        em_data = em_response.json()
        assert em_data["emergency_alert"] is True
        assert em_data["symptom_log"]["risk_category"] == "Emergency"
        assert "108" in em_data["alert_message"]
        print("[OK] Symptom analysis (Emergency) successful")

        # 10. Start Conversation
        print("Testing POST /conversations...")
        conv_response = client.post("/conversations", headers=patient_headers, json={
            "title": "General Health Checkup Inquiry"
        })
        assert conv_response.status_code == 201, conv_response.text
        conv_id = conv_response.json()["id"]
        print("[OK] Start Conversation successful")

        # 11. Send Messages (Regular and Emergency)
        print("Testing POST /conversations/{id}/messages...")
        # Normal query
        msg_response = client.post(f"/conversations/{conv_id}/messages", headers=patient_headers, json={
            "content": "What are the common benefits of eating green vegetables daily?"
        })
        assert msg_response.status_code == 200, msg_response.text
        assert "Disclaimer" in msg_response.json()["content"]
        
        # Emergency query
        em_msg_response = client.post(f"/conversations/{conv_id}/messages", headers=patient_headers, json={
            "content": "Help me, I am having sudden chest pain and cannot breathe"
        })
        assert em_msg_response.status_code == 200, em_msg_response.text
        assert "EMERGENCY" in em_msg_response.json()["content"]
        print("[OK] Conversation messages and safety filters successful")

        # 12. Upload Medical Record File
        print("Testing POST /records/upload...")
        # Create a dummy file
        dummy_file_path = "test_record.pdf"
        with open(dummy_file_path, "w") as f:
            f.write("Dummy medical record content PDF")

        with open(dummy_file_path, "rb") as f:
            upload_response = client.post(
                "/records/upload",
                headers=patient_headers,
                files={"file": ("test_record.pdf", f, "application/pdf")}
            )
        assert upload_response.status_code == 201, upload_response.text
        assert upload_response.json()["file_name"] == "test_record.pdf"
        os.remove(dummy_file_path)
        print("[OK] Medical record upload successful")

        # 13. Get Dashboard Summary
        print("Testing GET /dashboard...")
        dash_response = client.get("/dashboard", headers=patient_headers)
        assert dash_response.status_code == 200, dash_response.text
        dash_data = dash_response.json()
        assert len(dash_data["upcoming_appointments"]) > 0
        assert len(dash_data["recent_symptom_logs"]) > 0
        assert len(dash_data["medical_records"]) > 0
        assert "health_tip" in dash_data
        print("[OK] Dashboard retrieval successful")

        # 14. Admin Role Checks (Register and Access Audit Logs)
        print("Testing Admin registration and Role-Based Access Control...")
        admin_reg = client.post("/auth/register", json={
            "email": "admin@test.com",
            "password": "adminpassword",
            "role": "admin"
        })
        assert admin_reg.status_code == 201
        
        admin_login = client.post("/auth/login", json={
            "email": "admin@test.com",
            "password": "adminpassword"
        })
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        # Patient attempts to access audit logs -> Expect 403 Forbidden
        patient_audit_response = client.get("/audit/logs", headers=patient_headers)
        assert patient_audit_response.status_code == 403
        
        # Admin attempts to access audit logs -> Expect 200 OK
        admin_audit_response = client.get("/audit/logs", headers=admin_headers)
        assert admin_audit_response.status_code == 200
        logs = admin_audit_response.json()
        assert len(logs) > 0
        # Verify specific actions were logged
        actions = [log["action"] for log in logs]
        assert "REGISTER" in actions
        assert "LOGIN" in actions
        assert "CREATE_PROFILE" in actions
        assert "EMERGENCY_DETECTED" in actions
        print("[OK] Admin role and audit logs verification successful")

        # 15. Cancel Appointment
        print("Testing DELETE /appointment/cancel/{id}...")
        cancel_response = client.delete(f"/appointment/cancel/{appointment_id}", headers=patient_headers)
        assert cancel_response.status_code == 200, cancel_response.text
        
        # Verify appointment is marked as cancelled
        my_appts_response2 = client.get("/appointment/my-appointments", headers=patient_headers)
        assert my_appts_response2.json()[0]["status"] == "cancelled"
        print("[OK] Cancel Appointment successful")

        print("\n=== ALL TESTS PASSED SUCCESSFULLY ===")

    except AssertionError as e:
        print(f"\n[FAIL] Test failed: {e}")
        raise
    except Exception as e:
        print(f"\n[FAIL] Unexpected error in test run: {e}")
        raise
    finally:
        teardown_module()

if __name__ == "__main__":
    test_healthcare_backend()
