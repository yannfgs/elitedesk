# backend/app/api/reports.py
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import SessionLocal
from app.models.ticket import Ticket
from app.models.usuario import Usuario
from app.api.usuarios import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])


# ===== Dependência de banco =====
def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===== Helpers de datas =====
def parse_periodo(
    data_ini: Optional[str],
    data_fim: Optional[str],
) -> tuple[Optional[datetime], Optional[datetime]]:
    """
    Converte strings 'YYYY-MM-DD' em datetime.
    data_fim é ajustada para fim do dia.
    """
    dt_ini = None
    dt_fim = None

    if data_ini:
        dt_ini = datetime.strptime(data_ini, "%Y-%m-%d")
    if data_fim:
        dt_fim = datetime.strptime(data_fim, "%Y-%m-%d") + timedelta(
            hours=23, minutes=59, seconds=59, microseconds=999999
        )
    return dt_ini, dt_fim


def aplicar_filtro_periodo(query, dt_ini: Optional[datetime], dt_fim: Optional[datetime]):
    if dt_ini:
        query = query.filter(Ticket.data_abertura >= dt_ini)
    if dt_fim:
        query = query.filter(Ticket.data_abertura <= dt_fim)
    return query


# ===== Endpoints =====
@router.get("/summary")
def tickets_summary(
    data_ini: Optional[str] = None,
    data_fim: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Resumo geral:
    - total de tickets no período
    - quantidade por status
    - quantidade por farol
    """
    dt_ini, dt_fim = parse_periodo(data_ini, data_fim)

    base_query = db.query(Ticket)
    base_query = aplicar_filtro_periodo(base_query, dt_ini, dt_fim)

    total = base_query.count()

    # Por status
    by_status_rows = (
        db.query(Ticket.status, func.count(Ticket.id))
        .filter(base_query.whereclause) if base_query.whereclause is not None else db.query(Ticket.status, func.count(Ticket.id))
    )
    by_status_rows = aplicar_filtro_periodo(by_status_rows, dt_ini, dt_fim)
    by_status_rows = by_status_rows.group_by(Ticket.status).all()

    # Por farol
    by_farol_rows = (
        db.query(Ticket.farol, func.count(Ticket.id))
        .filter(base_query.whereclause) if base_query.whereclause is not None else db.query(Ticket.farol, func.count(Ticket.id))
    )
    by_farol_rows = aplicar_filtro_periodo(by_farol_rows, dt_ini, dt_fim)
    by_farol_rows = by_farol_rows.group_by(Ticket.farol).all()

    by_status = {status or "": count for status, count in by_status_rows}
    by_farol = {farol or "": count for farol, count in by_farol_rows}

    return {
        "total": total,
        "by_status": by_status,
        "by_farol": by_farol,
    }


@router.get("/by_status")
def tickets_by_status(
    data_ini: Optional[str] = None,
    data_fim: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Quantidade de tickets por status no período.
    """
    dt_ini, dt_fim = parse_periodo(data_ini, data_fim)

    query = db.query(Ticket.status, func.count(Ticket.id))
    query = aplicar_filtro_periodo(query, dt_ini, dt_fim)
    query = query.group_by(Ticket.status)

    rows = query.all()
    data = [
        {"status": status or "sem_status", "quantidade": count}
        for status, count in rows
    ]
    return {"data": data}


@router.get("/by_setor")
def tickets_by_setor(
    data_ini: Optional[str] = None,
    data_fim: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Quantidade de tickets por setor no período.
    """
    dt_ini, dt_fim = parse_periodo(data_ini, data_fim)

    query = db.query(Ticket.setor, func.count(Ticket.id))
    query = aplicar_filtro_periodo(query, dt_ini, dt_fim)
    query = query.group_by(Ticket.setor)

    rows = query.all()
    data = [
        {"setor": setor or "sem_setor", "quantidade": count}
        for setor, count in rows
    ]
    return {"data": data}


@router.get("/by_responsavel")
def tickets_by_responsavel(
    data_ini: Optional[str] = None,
    data_fim: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Quantidade de tickets por responsável no período.
    """
    dt_ini, dt_fim = parse_periodo(data_ini, data_fim)

    query = db.query(Ticket.responsavel_email, func.count(Ticket.id))
    query = aplicar_filtro_periodo(query, dt_ini, dt_fim)
    query = query.group_by(Ticket.responsavel_email)

    rows = query.all()
    data = [
        {"responsavel_email": resp or "sem_responsavel", "quantidade": count}
        for resp, count in rows
    ]
    return {"data": data}


@router.get("/export_tickets_csv")
def export_tickets_csv(
    data_ini: Optional[str] = None,
    data_fim: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Exporta tickets do período em CSV (Excel abre normalmente).
    """
    dt_ini, dt_fim = parse_periodo(data_ini, data_fim)

    query = db.query(Ticket)
    query = aplicar_filtro_periodo(query, dt_ini, dt_fim)
    tickets = query.order_by(Ticket.id).all()

    # Monta CSV
    linhas = []
    cabecalho = [
        "id",
        "numero_protocolo",
        "empresa",
        "setor",
        "categoria_nome",
        "prioridade",
        "status",
        "solicitante_email",
        "responsavel_email",
        "data_abertura",
    ]
    linhas.append(";".join(cabecalho))

    for t in tickets:
        linha = [
            str(t.id or ""),
            t.numero_protocolo or "",
            t.empresa or "",
            t.setor or "",
            t.categoria_nome or "",
            t.prioridade or "",
            t.status or "",
            t.solicitante_email or "",
            t.responsavel_email or "",
            t.data_abertura.strftime("%d-%m-%Y %H:%M:%S") if t.data_abertura else "",
        ]
        linhas.append(";".join(linha))

    csv_content = "\n".join(linhas)
    headers = {
        "Content-Disposition": 'attachment; filename="tickets.csv"'
    }
    return Response(content=csv_content, media_type="text/csv", headers=headers)
