# backend/app/main.py
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import engine
from app.db.base import Base
from app import models  # noqa: F401 -> registra models

from app.api.tickets import router as tickets_router
from app.api.reports import router as reports_router
from app.api.setores import router as setores_router
from app.api.categorias import router as categorias_router
from app.api.empresa import router as empresas_router
from app.api.usuarios import router as usuarios_router

# IMPORT DIRETO DO ROUTER (mais seguro do que "from app.api import reference")
from app.api.reference import router as reference_router


app = FastAPI(title="EliteDesk API", version="0.5.0")

# Para token via Authorization header, não precisa allow_credentials=True
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # DEV (depois restrinja)
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def ensure_ticket_columns():
    insp = inspect(engine)
    if not insp.has_table("tickets"):
        return

    existing = {c["name"] for c in insp.get_columns("tickets")}
    
    needed = {
    "categoria_nome": "VARCHAR(150)",
    "natureza": "VARCHAR(80)",
    "canal": "VARCHAR(150)",
    "transportadora": "VARCHAR(150)",
    "solicitante_email": "VARCHAR(200)",
    "responsavel_email": "VARCHAR(200)",
    }

    dialect = engine.dialect.name

    with engine.begin() as conn:
        for col, coltype in needed.items():
            if col in existing:
                continue

            # Postgres aceita IF NOT EXISTS; SQLite geralmente não
            if dialect == "postgresql":
                sql = f"ALTER TABLE tickets ADD COLUMN IF NOT EXISTS {col} {coltype};"
            else:
                sql = f"ALTER TABLE tickets ADD COLUMN {col} {coltype};"

            conn.execute(text(sql))


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    try:
        ensure_ticket_columns()
    except SQLAlchemyError as e:
        # Em DEV é melhor logar e subir do que derrubar a API inteira
        print("WARNING: falha ao ajustar colunas tickets:", repr(e))


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "app": "EliteDesk",
        "timestamp": datetime.utcnow().isoformat(),
    }


# Rotas
app.include_router(tickets_router)
app.include_router(reports_router)
app.include_router(setores_router)
app.include_router(categorias_router)
app.include_router(empresas_router)
app.include_router(usuarios_router)
app.include_router(reference_router)