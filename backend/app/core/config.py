# backend/app/core/config.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base

# ⚠️ Ajuste SUA_SENHA para a senha real do usuário postgres
DATABASE_URL = "postgresql+psycopg2://postgres:Mac5311!@localhost:5432/elitedesk"

engine = create_engine(DATABASE_URL, echo=False)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)
