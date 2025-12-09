# backend/app/models/__init__.py
from app.models.ticket import Ticket
from app.models.setor import Setor
from app.models.categoria import Categoria
from app.models.empresa import Empresa
from app.models.usuario import Usuario
from app.models.ticket_evento import TicketEvento

__all__ = ["Ticket", "Setor", "Categoria", "Empresa", "Usuario", "TicketEvento"]
