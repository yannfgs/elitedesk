# backend/app/api/setores.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.config import SessionLocal
from app.models.setor import Setor
from app.schemas.setor import SetorCreate, SetorOut

router = APIRouter(prefix="/setores", tags=["setores"])


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=SetorOut, status_code=status.HTTP_201_CREATED)
def criar_setor(setor_in: SetorCreate, db: Session = Depends(get_db)):
    # Verifica se já existe setor com o mesmo nome
    existente = db.execute(
        select(Setor).where(Setor.nome == setor_in.nome)
    ).scalar_one_or_none()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um setor com esse nome.",
        )

    setor = Setor(
        nome=setor_in.nome,
        descricao=setor_in.descricao,
        ativo=setor_in.ativo,
    )
    db.add(setor)
    db.commit()
    db.refresh(setor)
    return SetorOut.model_validate(setor)


@router.get("/", response_model=list[SetorOut])
def listar_setores(ativos_apenas: bool = True, db: Session = Depends(get_db)):
    query = select(Setor)
    if ativos_apenas:
        query = query.where(Setor.ativo.is_(True))

    setores = db.execute(query).scalars().all()
    return [SetorOut.model_validate(s) for s in setores]
