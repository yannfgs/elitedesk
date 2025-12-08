# backend/app/models/__init__.py
from app.models.ticket import Ticket
from app.models.setor import Setor
from app.models.categoria import Categoria

__all__ = ["Ticket", "Setor", "Categoria"]
