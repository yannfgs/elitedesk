# backend/app/api/categorias.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Generator
from sqlalchemy import select

from app.core.config import SessionLocal
from app.models.categoria import Categoria
from app.schemas.categoria import CategoriaCreate, CategoriaOut

router = APIRouter(prefix="/categorias", tags=["categorias"])


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=CategoriaOut, status_code=status.HTTP_201_CREATED)
def criar_categoria(categoria_in: CategoriaCreate, db: Session = Depends(get_db)):
    # Verifica se já existe categoria com o mesmo nome
    existente = db.execute(
        select(Categoria).where(Categoria.nome == categoria_in.nome)
    ).scalar_one_or_none()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe uma categoria com esse nome.",
        )

    categoria = Categoria(
        nome=categoria_in.nome,
        descricao=categoria_in.descricao,
        setor_nome=categoria_in.setor_nome,
        sla_dias_ideal=categoria_in.sla_dias_ideal,
        sla_dias_limite=categoria_in.sla_dias_limite,
        ativo=categoria_in.ativo,
    )
    db.add(categoria)
    db.commit()
    db.refresh(categoria)
    return CategoriaOut.model_validate(categoria)


@router.get("/", response_model=list[CategoriaOut])
def listar_categorias(
    ativos_apenas: bool = True,
    setor_nome: str | None = None,
    db: Session = Depends(get_db),
):
    query = select(Categoria)

    if ativos_apenas:
        query = query.where(Categoria.ativo.is_(True))

    if setor_nome:
        query = query.where(Categoria.setor_nome == setor_nome)

    categorias = db.execute(query).scalars().all()
    return [CategoriaOut.model_validate(c) for c in categorias]
