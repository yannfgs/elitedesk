# backend/app/models/setor.py
from sqlalchemy import Column, Integer, String, Boolean

from app.db.base import Base


class Setor(Base):
    __tablename__ = "setores"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), unique=True, nullable=False)
    descricao = Column(String(255), nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
