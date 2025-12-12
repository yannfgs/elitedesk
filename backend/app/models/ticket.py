# app/models/ticket.py
from datetime import datetime, date

from sqlalchemy import Column, Integer, String, Date, DateTime
from app.db.base import Base


class Ticket(Base):
    """
    Modelo principal de Ticket no banco de dados.

    Mantém compatibilidade com o que você já tinha,
    acrescentando Natureza, Canal e Transportadora.
    """
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    numero_protocolo = Column(String(30), unique=True, nullable=True, index=True)

    # Dados de contexto
    empresa = Column(String(200), nullable=False)
    setor = Column(String(100), nullable=False)
    categoria_nome = Column(String(150), nullable=True)

    natureza = Column(String(50), nullable=True)        # ex.: "Venda"
    canal = Column(String(80), nullable=True)           # ex.: "D2C - Amazon"
    transportadora = Column(String(80), nullable=True)  # ex.: "BRASPRESS"

    # Conteúdo do ticket
    titulo = Column(String(255), nullable=False)
    descricao = Column(String, nullable=False)

    # Prioridade e prazos
    prioridade = Column(String(20), nullable=False)  # "baixa", "media", "alta", "critica"
    prazo_ideal = Column(Date, nullable=False)
    prazo_limite = Column(Date, nullable=False)

    # Contato
    contato_nome = Column(String(200), nullable=False)
    contato_email = Column(String(200), nullable=False)
    contato_telefone = Column(String(50), nullable=False)

    # Status e controle
    status = Column(String(20), nullable=False, default="aberto")
    data_abertura = Column(DateTime, nullable=False)
    farol = Column(String(20), nullable=False)  # "verde", "amarelo", "vermelho"

    # Controle de usuários
    solicitante_email = Column(String(200), nullable=True)
    responsavel_email = Column(String(200), nullable=True)


# Alias opcional caso em algum lugar ainda se use TicketORM
TicketORM = Ticket
