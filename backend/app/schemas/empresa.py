# backend/app/schemas/empresa.py
from pydantic import BaseModel, ConfigDict


class EmpresaBase(BaseModel):
    nome_fantasia: str
    razao_social: str | None = None
    cnpj: str | None = None
    tipo: str = "interna"  # interna, cliente, fornecedor, grupo...
    ativo: bool = True


class EmpresaCreate(EmpresaBase):
    """Dados de entrada para criar uma empresa."""
    pass


class EmpresaOut(EmpresaBase):
    """Dados de saída de uma empresa."""
    id: int
    model_config = ConfigDict(from_attributes=True)
