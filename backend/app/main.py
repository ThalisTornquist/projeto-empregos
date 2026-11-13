from __future__ import annotations

import os
from datetime import date, datetime
from enum import Enum
from pathlib import Path
from urllib.parse import urlsplit

import httpx
from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import Date, DateTime, Integer, String, Text, create_engine, inspect, select, text
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
DATABASE_URL = os.getenv("DATABASE_URL") or f"sqlite:///{(DATA_DIR / 'trampofacil.db').as_posix()}"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

AUTH_MODE = os.getenv("TRAMPOFACIL_AUTH_MODE", "supabase").lower()
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
LOCAL_USER_ID = "local-dev-user"
DEFAULT_ORIGINS = [
    "http://localhost:5500", "http://127.0.0.1:5500",
    "http://localhost:5501", "http://127.0.0.1:5501",
    "http://localhost:8000", "http://127.0.0.1:8000",
]
cors_origins = [origin.strip() for origin in os.getenv("TRAMPOFACIL_CORS_ORIGINS", "").split(",") if origin.strip()]

if DATABASE_URL.startswith("sqlite"):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False, "timeout": 10})
else:
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class ApplicationRecord(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    company: Mapped[str] = mapped_column(String(80), nullable=False)
    role: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    application_date: Mapped[date] = mapped_column(Date, nullable=False)
    link: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class ApplicationStatus(str, Enum):
    applied = "applied"
    interview = "interview"
    test = "test"
    offer = "offer"
    rejected = "rejected"


class ApplicationCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    company: str = Field(min_length=1, max_length=80)
    role: str = Field(min_length=1, max_length=100)
    status: ApplicationStatus = ApplicationStatus.applied
    date: date
    link: str | None = Field(default=None, max_length=2048)

    @field_validator("company", "role")
    @classmethod
    def require_non_blank(cls, value: str) -> str:
        if not value:
            raise ValueError("Este campo não pode ficar vazio.")
        return value

    @field_validator("link")
    @classmethod
    def validate_link(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        parsed = urlsplit(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("O link precisa começar com http:// ou https://.")
        return value


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus


class ApplicationOut(BaseModel):
    id: int
    company: str
    role: str
    status: ApplicationStatus
    date: date
    link: str | None


def initialize_database() -> None:
    Base.metadata.create_all(engine)
    # Preserve older local databases and assign their existing rows to the local dev profile.
    columns = {column["name"] for column in inspect(engine).get_columns("applications")}
    if "user_id" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE applications ADD COLUMN user_id VARCHAR(128) NOT NULL DEFAULT 'local-dev-user'"))
    with engine.begin() as connection:
        connection.execute(text("CREATE INDEX IF NOT EXISTS ix_applications_user_id ON applications (user_id)"))


def get_db():
    with SessionLocal() as db:
        yield db


bearer = HTTPBearer(auto_error=False)


async def current_user_id(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> str:
    if AUTH_MODE == "local":
        if request.client is None or request.client.host not in {"127.0.0.1", "::1", "localhost", "testclient"}:
            raise HTTPException(status_code=503, detail="A API está em modo local. Configure autenticação Supabase antes de publicá-la.")
        return LOCAL_USER_ID
    if AUTH_MODE != "supabase" or not SUPABASE_URL or not SUPABASE_PUBLISHABLE_KEY:
        raise HTTPException(status_code=503, detail="Autenticação Supabase não configurada na API.")
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Entre na sua conta para acessar suas candidaturas.", headers={"WWW-Authenticate": "Bearer"})
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={"apikey": SUPABASE_PUBLISHABLE_KEY, "Authorization": f"Bearer {credentials.credentials}"},
            )
        if response.status_code != 200:
            raise ValueError("token inválido")
        user_id = response.json().get("id")
        if not user_id:
            raise ValueError("identidade ausente")
        return str(user_id)
    except (httpx.HTTPError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada. Entre novamente.", headers={"WWW-Authenticate": "Bearer"})


def to_application(row: ApplicationRecord) -> ApplicationOut:
    return ApplicationOut(id=row.id, company=row.company, role=row.role, status=row.status, date=row.application_date, link=row.link)


app = FastAPI(
    title="TrampoFácil API",
    description="API multiusuário para acompanhamento pessoal de candidaturas.",
    version="2.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins or DEFAULT_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "apikey"],
)


@app.on_event("startup")
def on_startup() -> None:
    if AUTH_MODE not in {"local", "supabase"}:
        raise RuntimeError("TRAMPOFACIL_AUTH_MODE deve ser 'local' ou 'supabase'.")
    initialize_database()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "trampofacil-api"}


@app.get("/applications", response_model=list[ApplicationOut])
def list_applications(
    application_status: ApplicationStatus | None = Query(default=None, alias="status"),
    user_id: str = Depends(current_user_id),
    db: Session = Depends(get_db),
) -> list[ApplicationOut]:
    query = select(ApplicationRecord).where(ApplicationRecord.user_id == user_id)
    if application_status:
        query = query.where(ApplicationRecord.status == application_status.value)
    rows = db.scalars(query.order_by(ApplicationRecord.created_at.desc(), ApplicationRecord.id.desc())).all()
    return [to_application(row) for row in rows]


@app.post("/applications", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
def create_application(
    application: ApplicationCreate,
    user_id: str = Depends(current_user_id),
    db: Session = Depends(get_db),
) -> ApplicationOut:
    record = ApplicationRecord(
        user_id=user_id, company=application.company, role=application.role,
        status=application.status.value, application_date=application.date, link=application.link,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return to_application(record)


@app.patch("/applications/{application_id}", response_model=ApplicationOut)
def update_application_status(
    application_id: int,
    update: ApplicationStatusUpdate,
    user_id: str = Depends(current_user_id),
    db: Session = Depends(get_db),
) -> ApplicationOut:
    record = db.scalar(select(ApplicationRecord).where(ApplicationRecord.id == application_id, ApplicationRecord.user_id == user_id))
    if record is None:
        raise HTTPException(status_code=404, detail="Candidatura não encontrada.")
    record.status = update.status.value
    db.commit()
    db.refresh(record)
    return to_application(record)


@app.delete("/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    application_id: int,
    user_id: str = Depends(current_user_id),
    db: Session = Depends(get_db),
) -> Response:
    record = db.scalar(select(ApplicationRecord).where(ApplicationRecord.id == application_id, ApplicationRecord.user_id == user_id))
    if record is None:
        raise HTTPException(status_code=404, detail="Candidatura não encontrada.")
    db.delete(record)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
