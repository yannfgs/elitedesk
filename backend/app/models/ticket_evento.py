# backend/app/models/ticket_evento.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey

from app.db.base import Base


class TicketEvento(Base):
    __tablename__ = "ticket_eventos"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=False, index=True)

    data_evento = Column(DateTime, nullable=False)
    tipo = Column(String(50), nullable=False)         # ex.: criado, status_alterado, assumido, transferido
    detalhe = Column(String, nullable=True)          # texto livre
    usuario_email = Column(String(200), nullable=True)
