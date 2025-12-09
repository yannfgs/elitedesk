# backend/app/schemas/ticket_evento.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TicketEventoOut(BaseModel):
    id: int
    ticket_id: int
    data_evento: datetime
    tipo: str
    detalhe: str | None
    usuario_email: str | None

    model_config = ConfigDict(from_attributes=True)
