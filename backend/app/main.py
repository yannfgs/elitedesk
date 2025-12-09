# backend/app/main.py
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import engine
from app.db.base import Base
from app import models  # noqa: F401  -> garante que Ticket, Setor, Categoria, etc. sejam registrados

from app.api.tickets import router as tickets_router
from app.api.reports import router as reports_router
from app.api.setores import router as setores_router
from app.api.categorias import router as categorias_router
from app.api.empresa import router as empresas_router
from app.api.usuarios import router as usuarios_router

# Cria as tabelas no banco (se ainda não existirem)
Base.metadata.create_all(bind=engine)

# "Migração" simples: garante que algumas colunas existam na tabela tickets
with engine.begin() as conn:
    conn.execute(
        text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS categoria_nome VARCHAR(150);")
    )
    conn.execute(
        text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS solicitante_email VARCHAR(200);")
    )
    conn.execute(
        text("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS responsavel_email VARCHAR(200);")
    )

app = FastAPI(title="EliteDesk API", version="0.5.0")

# ===== CORS (libera o front local acessar a API) =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """Rota simples para testar se a API está no ar."""
    return {
        "status": "ok",
        "app": "EliteDesk",
        "timestamp": datetime.utcnow().isoformat()
    }


# Inclui as rotas
app.include_router(tickets_router)
app.include_router(reports_router)
app.include_router(setores_router)
app.include_router(categorias_router)
app.include_router(empresas_router)
app.include_router(usuarios_router)
