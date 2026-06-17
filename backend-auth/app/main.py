from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.database import Base, engine
from app.auth.router import router as auth_router
from app.dependencies.roles import require_role

# Automatically create SQLAlchemy database tables (SQLite initialization code)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Healthcare Assistant Auth API",
    description="Epic 1: Authentication and Authorization service using JWT & RBAC",
    version="1.0.0"
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    """Override default 422 validation errors to return 400 Bad Request."""
    from fastapi.encoders import jsonable_encoder
    return JSONResponse(
        status_code=400,
        content={"detail": jsonable_encoder(exc.errors()), "message": "Validation Error"}
    )

# Include Authentication routers
app.include_router(auth_router)

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

# RBAC Test Endpoints
@app.get("/protected/admin", dependencies=[require_role(["ADMIN"])])
def admin_only_route():
    """Endpoint restricted only to ADMIN role."""
    return {"message": "Access granted: Admin only"}

@app.get("/protected/doctor-or-admin", dependencies=[require_role(["DOCTOR", "ADMIN"])])
def doctor_or_admin_route():
    """Endpoint restricted to DOCTOR and ADMIN roles."""
    return {"message": "Access granted: Doctor or Admin"}

@app.get("/protected/patient", dependencies=[require_role(["PATIENT"])])
def patient_only_route():
    """Endpoint restricted only to PATIENT role."""
    return {"message": "Access granted: Patient only"}
