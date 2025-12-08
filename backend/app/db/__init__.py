# backend/app/schemas/ticket.py
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, field_validator, field_serializer, ConfigDict

# Status permitidos no sistema (MVP)
STATUS_VALIDOS = ["aberto", "em_atendimento", "aguardando", "concluido", "cancelado"]


class TicketBase(BaseModel):
    """
    Campos básicos de um ticket.
    Esses campos são usados tanto na entrada quanto na saída.
    """
    empresa: str
    setor: str
    titulo: str
    descricao: str
    prioridade: str            # "baixa", "media", "alta", "critica"
    prazo_ideal: date
    prazo_limite: date
    contato_nome: str
    contato_email: EmailStr
    contato_telefone: str

    # ----- Validação de entrada das datas (aceita dd-mm-aaaa ou aaaa-mm-dd) -----
    @field_validator("prazo_ideal", "prazo_limite", mode="before")
    @classmethod
    def parse_date(cls, v):
        """
        Aceita string em 'dd-mm-aaaa' (padrão BR) ou 'aaaa-mm-dd' (ISO).
        Converte para objeto date interno.
        """
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

    # ----- Saída das datas sempre em dd-mm-aaaa -----
    @field_serializer("prazo_ideal", "prazo_limite", mode="plain")
    def serialize_date(self, v: date) -> str:
        return v.strftime("%d-%m-%Y")


class TicketCreate(TicketBase):
    """Modelo para criação de ticket (entrada)."""
    pass


class TicketOut(TicketBase):
    """
    Modelo de saída de ticket.
    Inclui campos gerados pelo sistema.
    """
    id: int
    numero_protocolo: str
    status: str
    data_abertura: datetime
    farol: str                   # "verde", "amarelo" ou "vermelho"

    # Permite criar esse modelo a partir de objetos ORM
    model_config = ConfigDict(from_attributes=True)

    # Saída do datetime no formato dd-mm-aaaa hh:mm:ss
    @field_serializer("data_abertura", mode="plain")
    def serialize_data_abertura(self, v: datetime) -> str:
        return v.strftime("%d-%m-%Y %H:%M:%S")


class TicketStatusUpdate(BaseModel):
    """
    Modelo para atualização de status do ticket.
    """
    status: str

    @field_validator("status")
    @classmethod
    def validar_status(cls, v: str) -> str:
        v = v.lower()
        if v not in STATUS_VALIDOS:
            raise ValueError(f"Status inválido. Use um de: {', '.join(STATUS_VALIDOS)}")
        return v
