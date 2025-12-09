# backend/app/models/usuario.py
from sqlalchemy import Column, Integer, String, Boolean

from app.db.base import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    perfil = Column(String(50), nullable=False, default="solicitante")  # solicitante, operador, gestor, admin
    setor_nome = Column(String(100), nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
