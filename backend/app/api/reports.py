# backend/app/api/reports.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.config import SessionLocal
from app.models.ticket import Ticket

router = APIRouter(prefix="/reports", tags=["reports"])


# Dependência para abrir/fechar sessão de banco
def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/summary")
def tickets_summary(db: Session = Depends(get_db)):
    """
    Retorna um resumo simples dos tickets:
    - total
    - quantidade por status
    - quantidade por farol
    """
    total = db.query(func.count(Ticket.id)).scalar() or 0

    by_status_rows = (
        db.query(Ticket.status, func.count(Ticket.id))
        .group_by(Ticket.status)
        .all()
    )
    by_farol_rows = (
        db.query(Ticket.farol, func.count(Ticket.id))
        .group_by(Ticket.farol)
        .all()
    )

    by_status = {status: count for status, count in by_status_rows}
    by_farol = {farol: count for farol, count in by_farol_rows}

    return {
        "total": total,
        "by_status": by_status,
        "by_farol": by_farol,
    }
