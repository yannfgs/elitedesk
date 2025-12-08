# backend/app/schemas/categoria.py
from pydantic import BaseModel, ConfigDict


class CategoriaBase(BaseModel):
    nome: str
    descricao: str | None = None
    setor_nome: str
    sla_dias_ideal: int = 1
    sla_dias_limite: int = 3
    ativo: bool = True


class CategoriaCreate(CategoriaBase):
    """Dados de entrada para criar uma categoria."""
    pass


class CategoriaOut(CategoriaBase):
    """Dados de saída de uma categoria."""
    id: int
    model_config = ConfigDict(from_attributes=True)
