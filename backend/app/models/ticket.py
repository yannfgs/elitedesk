# backend/app/models/ticket.py
from sqlalchemy import Column, Integer, String, Date, DateTime

from app.db.base import Base


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    numero_protocolo = Column(String(30), unique=True, nullable=True, index=True)

    empresa = Column(String(200), nullable=False)
    setor = Column(String(100), nullable=False)
    categoria_nome = Column(String(150), nullable=True)  # nova coluna
    titulo = Column(String(255), nullable=False)
    descricao = Column(String, nullable=False)
    prioridade = Column(String(20), nullable=False)

    prazo_ideal = Column(Date, nullable=False)
    prazo_limite = Column(Date, nullable=False)

    contato_nome = Column(String(200), nullable=False)
    contato_email = Column(String(200), nullable=False)
    contato_telefone = Column(String(50), nullable=False)

    status = Column(String(50), nullable=False, default="aberto")
    data_abertura = Column(DateTime, nullable=False)
    farol = Column(String(20), nullable=False)
