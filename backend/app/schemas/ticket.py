# backend/app/schemas/ticket.py
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator, field_serializer, ConfigDict


# Status válidos (MVP)
STATUS_VALIDOS = ["aberto", "em_atendimento", "aguardando", "concluido", "cancelado"]


class TicketBase(BaseModel):
    # CONTEXTO
    empresa: str
    setor: str
    categoria_nome: Optional[str] = None

    natureza: Optional[str] = None
    canal: Optional[str] = None
    transportadora: Optional[str] = None

    # CONTEÚDO
    titulo: str
    descricao: str

    # PRIORIDADE e PRAZOS
    prioridade: str  # "baixa", "media", "alta", "critica"
    prazo_ideal: date
    prazo_limite: date

    # CONTATO
    contato_nome: str
    contato_email: EmailStr
    contato_telefone: str

    # Aceitar datas dd-mm-aaaa ou yyyy-mm-dd
    @field_validator("prazo_ideal", "prazo_limite", mode="before")
    @classmethod
    def parse_date(cls, v):
        if isinstance(v, date):
            return v
        if isinstance(v, str):
            from datetime import datetime as dt

            for fmt in ("%d-%m-%Y", "%Y-%m-%d"):
                try:
                    return dt.strptime(v, fmt).date()
                except ValueError:
                    pass
        raise ValueError("Data inválida. Use YYYY-MM-DD ou DD-MM-YYYY.")

    # ✅ Saída em ISO (melhor para filtros no front)
    @field_serializer("prazo_ideal", "prazo_limite", mode="plain")
    def serialize_date(self, v: date) -> str:
        return v.isoformat()


class TicketCreate(TicketBase):
    pass


class TicketOut(TicketBase):
    id: int
    numero_protocolo: Optional[str] = None

    status: str
    data_abertura: datetime
    farol: str

    solicitante_email: Optional[EmailStr] = None
    responsavel_email: Optional[EmailStr] = None

    model_config = ConfigDict(from_attributes=True)

    # ✅ data_abertura em ISO (YYYY-MM-DDTHH:MM:SS)
    @field_serializer("data_abertura", mode="plain")
    def serialize_data_abertura(self, v: datetime) -> str:
        return v.isoformat(timespec="seconds")


class TicketStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validar_status(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in STATUS_VALIDOS:
            raise ValueError(f"Status inválido. Use um de: {', '.join(STATUS_VALIDOS)}")
        return v
