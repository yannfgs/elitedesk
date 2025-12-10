from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TicketEventoBase(BaseModel):
    tipo: str
    detalhe: str | None = None


class TicketEventoCreate(TicketEventoBase):
    """Dados para criar um novo evento de ticket (entrada da API)."""
    pass


class TicketEventoOut(TicketEventoBase):
    """Evento retornado pela API."""
    id: int
    ticket_id: int
    data_evento: datetime
    usuario_email: str | None = None

    model_config = ConfigDict(from_attributes=True)
