# backend/app/api/tickets.py
from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import SessionLocal
from app.models.ticket import Ticket
from app.schemas.ticket import TicketCreate, TicketOut, TicketStatusUpdate

router = APIRouter(prefix="/tickets", tags=["tickets"])


# ===== Dependência de banco =====
def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===== Funções auxiliares =====
def gerar_numero_protocolo(ticket_id: int) -> str:
    ano = datetime.now().year
    return f"ED-{ano}-{ticket_id:06d}"


def calcular_farol(prazo_ideal: date, prazo_limite: date) -> str:
    hoje = datetime.utcnow().date()

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


# ===== Rotas =====
@router.post("/", response_model=TicketOut)
def criar_ticket(ticket: TicketCreate, db: Session = Depends(get_db)):
    """
    Cria um novo ticket.
    """
    agora = datetime.utcnow()
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

    return TicketOut.model_validate(db_ticket)


@router.get("/", response_model=list[TicketOut])
def listar_tickets(
    status: str | None = None,
    setor: str | None = None,
    prioridade: str | None = None,
    db: Session = Depends(get_db),
):
    """
    Lista tickets com filtros opcionais.
    """
    query = db.query(Ticket)

    if status is not None:
        query = query.filter(Ticket.status == status)

    if setor is not None:
        query = query.filter(Ticket.setor == setor)

    if prioridade is not None:
        query = query.filter(Ticket.prioridade == prioridade)

    resultados = query.order_by(Ticket.id.desc()).all()
    return [TicketOut.model_validate(t) for t in resultados]


@router.get("/{ticket_id}", response_model=TicketOut)
def obter_ticket(ticket_id: int, db: Session = Depends(get_db)):
    """
    Retorna os detalhes de um ticket específico.
    """
    ticket = get_ticket_or_404(ticket_id, db)
    return TicketOut.model_validate(ticket)


@router.patch("/{ticket_id}/status", response_model=TicketOut)
def atualizar_status_ticket(
    ticket_id: int,
    status_update: TicketStatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Atualiza apenas o status de um ticket.
    """
    ticket = get_ticket_or_404(ticket_id, db)

    ticket.status = status_update.status
    db.commit()
    db.refresh(ticket)

    return TicketOut.model_validate(ticket)
