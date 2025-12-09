# backend/app/models/empresa.py
from sqlalchemy import Column, Integer, String, Boolean

from app.db.base import Base


class Empresa(Base):
    __tablename__ = "empresas"

    id = Column(Integer, primary_key=True, index=True)
    nome_fantasia = Column(String(200), nullable=False)
    razao_social = Column(String(200), nullable=True)
    cnpj = Column(String(20), nullable=True)
    tipo = Column(String(50), nullable=False, default="interna")
    ativo = Column(Boolean, default=True, nullable=False)
