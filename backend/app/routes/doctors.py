from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app import models
from app.routes.auth import get_current_user, get_password_hash

router = APIRouter(prefix="/doctors", tags=["Doctors"])

# --- Pydantic Schemas ---
class DoctorResponse(BaseModel):
    id: int
    name: str
    specialization: str
    location: str
    experience_years: int
    available: bool
    contact: str

    class Config:
        from_attributes = True

# --- Database Seeding Helper ---
def seed_doctors(db: Session):
    count = db.query(models.Doctor).count()
    if count == 0:
        sample_doctors = [
            models.Doctor(
                name="Dr. Alice Smith",
                specialization="Cardiology",
                location="Building A, Room 102, City General Hospital",
                experience_years=15,
                available=True,
                contact="alice.smith@hospital.com"
            ),
            models.Doctor(
                name="Dr. Bob Johnson",
                specialization="Dermatology",
                location="Skin Care Clinic, 45 Park Ave",
                experience_years=8,
                available=True,
                contact="bob.johnson@skincare.com"
            ),
            models.Doctor(
                name="Dr. Charlie Brown",
                specialization="General Medicine",
                location="Suite 300, Medical Plaza",
                experience_years=12,
                available=True,
                contact="charlie.brown@medplaza.com"
            ),
            models.Doctor(
                name="Dr. Diana Prince",
                specialization="Neurology",
                location="Neuroscience Center, 88 Grand St",
                experience_years=20,
                available=True,
                contact="diana.prince@neurocenter.com"
            ),
            models.Doctor(
                name="Dr. Evan Wright",
                specialization="Pediatrics",
                location="Children's Clinic, 12 Maple St",
                experience_years=10,
                available=False, # Seed one as unavailable
                contact="evan.wright@childrens.com"
            )
        ]
        db.add_all(sample_doctors)
        db.commit()
        print("Doctor table successfully seeded with sample records.")
        
        # Seed matching User records for these doctors so they can log in
        default_pwd = get_password_hash("password123")
        for doc in sample_doctors:
            existing_user = db.query(models.User).filter(models.User.email == doc.contact).first()
            if not existing_user:
                new_user = models.User(
                    email=doc.contact,
                    password=default_pwd,
                    role="doctor"
                )
                db.add(new_user)
        db.commit()
        print("Doctor User credentials successfully seeded.")

# --- Endpoints ---

@router.get("", response_model=List[DoctorResponse])
def get_doctors(
    specialization: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        query = db.query(models.Doctor)
        if specialization:
            # Case-insensitive partial matching
            query = query.filter(models.Doctor.specialization.ilike(f"%{specialization}%"))
        
        doctors = query.all()
        return doctors
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching the doctors list: {str(e)}"
        )
