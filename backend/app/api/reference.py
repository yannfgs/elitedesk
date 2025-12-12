from fastapi import APIRouter
from app.core.reference_data import (
    EMPRESAS, SETORES, CATEGORIAS,
    NATUREZAS, CANAIS, TRANSPORTADORAS,
    PRIORIDADE_LABELS, STATUS_LABELS
)

router = APIRouter(prefix="/reference", tags=["Reference"])

@router.get("")
def get_reference():
    return {
        "empresas": EMPRESAS,
        "setores": SETORES,
        "categorias": CATEGORIAS,
        "naturezas": NATUREZAS,
        "canais": CANAIS,
        "transportadoras": TRANSPORTADORAS,
        "prioridade_labels": PRIORIDADE_LABELS,
        "status_labels": STATUS_LABELS,
    }