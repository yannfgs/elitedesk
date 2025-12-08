# backend/app/schemas/setor.py
from pydantic import BaseModel, ConfigDict


class SetorBase(BaseModel):
    nome: str
    descricao: str | None = None
    ativo: bool = True


class SetorCreate(SetorBase):
    """Dados de entrada para criar um setor."""
    pass


class SetorOut(SetorBase):
    """Dados de saída de um setor."""
    id: int
    model_config = ConfigDict(from_attributes=True)
