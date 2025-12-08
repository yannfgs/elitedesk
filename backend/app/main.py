# backend/app/main.py
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.categorias import router as categorias_router

from app.core.config import engine
from app.db.base import Base
from app import models  # noqa: F401  -> garante que Ticket e Setor sejam registrados
from app.api.tickets import router as tickets_router
from app.api.reports import router as reports_router
from app.api.setores import router as setores_router

# Cria as tabelas no banco (se ainda não existirem)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="EliteDesk API", version="0.5.0")

# ===== CORS (libera o front local acessar a API) =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # depois podemos restringir
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


# Inclui as rotas de tickets
app.include_router(tickets_router)

# Inclui as rotas de relatórios
app.include_router(reports_router)

# Inclui as rotas de setores
app.include_router(setores_router)

# Inclui as rotas de categorias
app.include_router(categorias_router)
