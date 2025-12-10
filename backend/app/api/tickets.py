# backend/app/api/tickets.py

from datetime import datetime, date
from typing import List
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.config import SessionLocal
from app.models.ticket import Ticket
from app.models.ticket_evento import TicketEvento
from app.models.usuario import Usuario
from app.schemas.ticket import TicketCreate, TicketOut, TicketStatusUpdate
from app.schemas.ticket_evento import TicketEventoOut, TicketEventoCreate
from app.api.usuarios import get_current_user

router = APIRouter(prefix="/tickets", tags=["tickets"])

# ===== Fuso horário (Brasília) =====
try:
    BRAZIL_TZ = ZoneInfo("America/Sao_Paulo")
except ZoneInfoNotFoundError:
    BRAZIL_TZ = None


def agora_brasilia() -> datetime:
    """
    Retorna datetime no horário de Brasília (quando disponível).
    Se não for possível carregar a timezone, cai para datetime.now() local.
    O resultado é "naive" (sem tzinfo) para facilitar uso com o banco.
    """
    if BRAZIL_TZ is not None:
        return datetime.now(BRAZIL_TZ).replace(tzinfo=None)
    return datetime.now()


# ===== Dependência de banco =====
def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===== Funções auxiliares =====
def gerar_numero_protocolo(ticket_id: int) -> str:
    ano = agora_brasilia().year
    return f"ED-{ano}-{ticket_id:06d}"


def calcular_farol(prazo_ideal: date, prazo_limite: date) -> str:
    hoje = agora_brasilia().date()

    if hoje <= prazo_ideal:
        return "verde"
    elif hoje <= prazo_limite:
        return "amarelo"
    else:
        return "vermelho"


def get_ticket_or_404(ticket_id: int, db: Session) -> Ticket:
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket não encontrado",
        )
    return ticket


def registrar_evento(
    db: Session,
    ticket: Ticket,
    tipo: str,
    detalhe: str | None,
    usuario_email: str | None,
) -> None:
    evento = TicketEvento(
        ticket_id=ticket.id,
        data_evento=agora_brasilia(),
        tipo=tipo,
        detalhe=detalhe,
        usuario_email=usuario_email,
    )
    db.add(evento)
    db.commit()


# ===== Rotas =====
@router.post("/", response_model=TicketOut)
def criar_ticket(
    ticket: TicketCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Cria um novo ticket.
    - Solicitante = usuário logado
    - Responsável inicial = usuário logado
    """
    agora = agora_brasilia()
    farol = calcular_farol(ticket.prazo_ideal, ticket.prazo_limite)

    db_ticket = Ticket(
        empresa=ticket.empresa,
        setor=ticket.setor,
        categoria_nome=ticket.categoria_nome,
        titulo=ticket.titulo,
        descricao=ticket.descricao,
        prioridade=ticket.prioridade,
        prazo_ideal=ticket.prazo_ideal,
        prazo_limite=ticket.prazo_limite,
        contato_nome=ticket.contato_nome,
        contato_email=ticket.contato_email,
        contato_telefone=ticket.contato_telefone,
        solicitante_email=current_user.email,
        responsavel_email=current_user.email,
        status="aberto",
        data_abertura=agora,
        farol=farol,
    )

    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)

    db_ticket.numero_protocolo = gerar_numero_protocolo(db_ticket.id)
    db.commit()
    db.refresh(db_ticket)

    registrar_evento(
        db,
        db_ticket,
        tipo="criado",
        detalhe=f"Ticket criado por {current_user.email}",
        usuario_email=current_user.email,
    )

    return TicketOut.model_validate(db_ticket)


@router.get("/", response_model=List[TicketOut])
def listar_tickets(
    status: str | None = None,
    setor: str | None = None,
    prioridade: str | None = None,
    meus: bool | None = False,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Lista tickets com filtros opcionais.
    - se 'meus' = True, retorna tickets em que o usuário é responsável.
    """
    query = db.query(Ticket)

    if status is not None:
        query = query.filter(Ticket.status == status)

    if setor is not None:
        query = query.filter(Ticket.setor == setor)

    if prioridade is not None:
        query = query.filter(Ticket.prioridade == prioridade)

    if meus:
        query = query.filter(Ticket.responsavel_email == current_user.email)

    resultados = query.order_by(Ticket.id.desc()).all()
    return [TicketOut.model_validate(t) for t in resultados]


@router.get("/{ticket_id}", response_model=TicketOut)
def obter_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    ticket = get_ticket_or_404(ticket_id, db)
    return TicketOut.model_validate(ticket)


@router.get("/{ticket_id}/eventos", response_model=List[TicketEventoOut])
def listar_eventos_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Lista o histórico de eventos de um ticket.
    """
    ticket = get_ticket_or_404(ticket_id, db)
    eventos = (
        db.execute(
            select(TicketEvento)
            .where(TicketEvento.ticket_id == ticket.id)
            .order_by(TicketEvento.data_evento)
        )
        .scalars()
        .all()
    )
    return [TicketEventoOut.model_validate(e) for e in eventos]

@router.post("/{ticket_id}/eventos", response_model=TicketEventoOut)
def criar_evento_ticket(
    ticket_id: int,
    evento_in: TicketEventoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Registra manualmente um evento em um ticket (anotação, contato, etc.).
    - Apenas responsável atual, gestor ou admin podem registrar.
    """
    ticket = get_ticket_or_404(ticket_id, db)

    if (
        ticket.responsavel_email not in (None, current_user.email)
        and current_user.perfil not in ["gestor", "admin"]
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não pode registrar eventos neste ticket.",
        )

    registrar_evento(
        db,
        ticket,
        tipo=evento_in.tipo,
        detalhe=evento_in.detalhe,
        usuario_email=current_user.email,
    )

    # Busca o último evento registrado para devolver na resposta
    ultimo = (
        db.query(TicketEvento)
        .filter(TicketEvento.ticket_id == ticket.id)
        .order_by(TicketEvento.data_evento.desc(), TicketEvento.id.desc())
        .first()
    )

    return TicketEventoOut.model_validate(ultimo)



@router.patch("/{ticket_id}/status", response_model=TicketOut)
def atualizar_status_ticket(
    ticket_id: int,
    status_update: TicketStatusUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Atualiza o status de um ticket.
    - Só o responsável atual, gestor ou admin podem alterar.
    """
    ticket = get_ticket_or_404(ticket_id, db)

    if (
        ticket.responsavel_email not in (None, current_user.email)
        and current_user.perfil not in ["gestor", "admin"]
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não é o responsável por este ticket.",
        )

    status_antigo = ticket.status
    ticket.status = status_update.status
    db.commit()
    db.refresh(ticket)

    registrar_evento(
        db,
        ticket,
        tipo="status_alterado",
        detalhe=f"Status alterado de {status_antigo} para {ticket.status}",
        usuario_email=current_user.email,
    )

    return TicketOut.model_validate(ticket)


@router.patch("/{ticket_id}/assumir", response_model=TicketOut)
def assumir_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Usuário logado assume a responsabilidade pelo ticket.
    """
    ticket = get_ticket_or_404(ticket_id, db)

    ticket.responsavel_email = current_user.email
    db.commit()
    db.refresh(ticket)

    registrar_evento(
        db,
        ticket,
        tipo="assumido",
        detalhe=f"Ticket assumido por {current_user.email}",
        usuario_email=current_user.email,
    )

    return TicketOut.model_validate(ticket)
