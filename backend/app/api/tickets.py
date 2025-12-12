# backend/app/api/tickets.py
from datetime import datetime, date, time
from zoneinfo import ZoneInfo
from typing import Generator, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.config import SessionLocal
from app.models.ticket import Ticket
from app.models.ticket_evento import TicketEvento
from app.schemas.ticket import TicketCreate, TicketOut, TicketStatusUpdate
from app.schemas.ticket_evento import TicketEventoOut

from app.api.usuarios import get_current_user
from app.models.usuario import Usuario

BRAZIL_TZ = ZoneInfo("America/Sao_Paulo")


def agora_brasilia() -> datetime:
    return datetime.now(BRAZIL_TZ).replace(tzinfo=None)


router = APIRouter(prefix="/tickets", tags=["tickets"])


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def gerar_numero_protocolo(ticket_id: int) -> str:
    ano = datetime.now(BRAZIL_TZ).year
    return f"ED-{ano}-{ticket_id:06d}"


def calcular_farol(prazo_ideal: date, prazo_limite: date) -> str:
    hoje = agora_brasilia().date()
    if hoje <= prazo_ideal:
        return "verde"
    if hoje <= prazo_limite:
        return "amarelo"
    return "vermelho"


def get_ticket_or_404(ticket_id: int, db: Session) -> Ticket:
    ticket = db.get(Ticket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado.")
    return ticket


def registrar_evento(
    db: Session,
    ticket: Ticket,
    tipo: str,
    detalhe: Optional[str],
    usuario_email: Optional[str],
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


@router.post("/", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
def criar_ticket(
    ticket_in: TicketCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    agora = agora_brasilia()
    farol = calcular_farol(ticket_in.prazo_ideal, ticket_in.prazo_limite)

    db_ticket = Ticket(
        numero_protocolo=None,
        empresa=ticket_in.empresa,
        setor=ticket_in.setor,
        categoria_nome=ticket_in.categoria_nome,
        natureza=ticket_in.natureza,
        canal=ticket_in.canal,
        transportadora=ticket_in.transportadora,
        titulo=ticket_in.titulo,
        descricao=ticket_in.descricao,
        prioridade=ticket_in.prioridade,
        prazo_ideal=ticket_in.prazo_ideal,
        prazo_limite=ticket_in.prazo_limite,
        contato_nome=ticket_in.contato_nome,
        contato_email=str(ticket_in.contato_email),
        contato_telefone=ticket_in.contato_telefone,
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
    status: Optional[str] = None,
    setor: Optional[str] = None,
    prioridade: Optional[str] = None,
    protocolo: Optional[str] = None,
    solicitante: Optional[str] = None,
    responsavel: Optional[str] = None,
    data_ini: Optional[date] = None,
    data_fim: Optional[date] = None,
    prazo_ini: Optional[date] = None,
    prazo_fim: Optional[date] = None,
    meus: bool = False,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    ✅ Agora suporta TODOS os filtros do front:
    - status / setor / prioridade / meus
    - protocolo (contém)
    - solicitante (contém)
    - responsavel (contém)
    - data_ini / data_fim (data de abertura)
    - prazo_ini / prazo_fim (prazo_limite)
    """
    query = db.query(Ticket)

    if status:
        query = query.filter(Ticket.status == status)

    if setor:
        query = query.filter(Ticket.setor == setor)

    if prioridade:
        query = query.filter(Ticket.prioridade == prioridade)

    if protocolo:
        query = query.filter(Ticket.numero_protocolo.ilike(f"%{protocolo}%"))

    if solicitante:
        query = query.filter(Ticket.solicitante_email.ilike(f"%{solicitante}%"))

    if responsavel:
        query = query.filter(Ticket.responsavel_email.ilike(f"%{responsavel}%"))

    if data_ini:
        query = query.filter(Ticket.data_abertura >= datetime.combine(data_ini, time.min))

    if data_fim:
        query = query.filter(Ticket.data_abertura <= datetime.combine(data_fim, time.max))

    if prazo_ini:
        query = query.filter(Ticket.prazo_limite >= prazo_ini)

    if prazo_fim:
        query = query.filter(Ticket.prazo_limite <= prazo_fim)

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


@router.get("/{ticket_id}/eventos", response_model=list[TicketEventoOut])
def listar_eventos_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
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
def registrar_evento_manual(
    ticket_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Espera payload: {"tipo": "...", "detalhe": "..."}
    """
    ticket = get_ticket_or_404(ticket_id, db)
    tipo = (payload.get("tipo") or "anotacao").lower()
    detalhe = payload.get("detalhe") or ""

    evento = TicketEvento(
        ticket_id=ticket.id,
        data_evento=agora_brasilia(),
        tipo=tipo,
        detalhe=detalhe,
        usuario_email=current_user.email,
    )
    db.add(evento)
    db.commit()
    db.refresh(evento)
    return TicketEventoOut.model_validate(evento)


@router.patch("/{ticket_id}/status", response_model=TicketOut)
def atualizar_status_ticket(
    ticket_id: int,
    status_update: TicketStatusUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    ticket = get_ticket_or_404(ticket_id, db)

    status_antigo = ticket.status
    ticket.status = status_update.status

    # Recalcula farol (evita “farol velho”)
    ticket.farol = calcular_farol(ticket.prazo_ideal, ticket.prazo_limite)

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
    ✅ Rota que o front usa quando clica no botão “Assumir”.
    """
    ticket = get_ticket_or_404(ticket_id, db)

    responsavel_antigo = ticket.responsavel_email or ""
    ticket.responsavel_email = current_user.email

    db.commit()
    db.refresh(ticket)

    registrar_evento(
        db,
        ticket,
        tipo="assumido",
        detalhe=f"Responsável alterado de {responsavel_antigo or '—'} para {current_user.email}",
        usuario_email=current_user.email,
    )

    return TicketOut.model_validate(ticket)
