# backend/app/schemas/ticket.py
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, field_validator, field_serializer, ConfigDict

# Status permitidos no sistema (MVP)
STATUS_VALIDOS = ["aberto", "em_atendimento", "aguardando", "concluido", "cancelado"]


class TicketBase(BaseModel):
    empresa: str
    setor: str
    categoria_nome: str | None = None
    titulo: str
    descricao: str
    prioridade: str            # "baixa", "media", "alta", "critica"
    prazo_ideal: date
    prazo_limite: date
    contato_nome: str
    contato_email: EmailStr
    contato_telefone: str

    # Novos campos (preenchidos pelo servidor normalmente)
    solicitante_email: EmailStr | None = None
    responsavel_email: EmailStr | None = None

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
                    continue
        raise ValueError("Formato de data inválido. Use dd-mm-aaaa.")

    @field_serializer("prazo_ideal", "prazo_limite", mode="plain")
    def serialize_date(self, v: date) -> str:
        return v.strftime("%d-%m-%Y")


class TicketCreate(TicketBase):
    """Entrada para criação de ticket.
    solicitante_email e responsavel_email serão preenchidos pelo servidor.
    """
    pass


class TicketOut(TicketBase):
    id: int
    numero_protocolo: str
    status: str
    data_abertura: datetime
    farol: str

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("data_abertura", mode="plain")
    def serialize_data_abertura(self, v: datetime) -> str:
        return v.strftime("%d-%m-%Y %H:%M:%S")


class TicketStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validar_status(cls, v: str) -> str:
        v = v.lower()
        if v not in STATUS_VALIDOS:
            raise ValueError(f"Status inválido. Use um de: {', '.join(STATUS_VALIDOS)}")
        return v
