import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Use database URL from environment variable, or default to a local SQLite database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./healthcare.db")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """
    FastAPI dependency to provide a database session per request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
