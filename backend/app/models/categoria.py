# backend/app/models/categoria.py
from sqlalchemy import Column, Integer, String, Boolean

from app.db.base import Base


class Categoria(Base):
    __tablename__ = "categorias"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(150), unique=True, nullable=False)
    descricao = Column(String(255), nullable=True)
    setor_nome = Column(String(100), nullable=False)  # vinculado ao nome do setor
    sla_dias_ideal = Column(Integer, nullable=False, default=1)
    sla_dias_limite = Column(Integer, nullable=False, default=3)
    ativo = Column(Boolean, default=True, nullable=False)
