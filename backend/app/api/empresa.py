# backend/app/api/empresas.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.config import SessionLocal
from app.models.empresa import Empresa
from app.schemas.empresa import EmpresaCreate, EmpresaOut

router = APIRouter(prefix="/empresas", tags=["empresas"])


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=EmpresaOut, status_code=status.HTTP_201_CREATED)
def criar_empresa(empresa_in: EmpresaCreate, db: Session = Depends(get_db)):
    # Se quiser, pode validar CNPJ e/ou unicidade do nome_fantasia
    existente = db.execute(
        select(Empresa).where(Empresa.nome_fantasia == empresa_in.nome_fantasia)
    ).scalar_one_or_none()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe uma empresa com esse nome fantasia.",
        )

    empresa = Empresa(
        nome_fantasia=empresa_in.nome_fantasia,
        razao_social=empresa_in.razao_social,
        cnpj=empresa_in.cnpj,
        tipo=empresa_in.tipo,
        ativo=empresa_in.ativo,
    )
    db.add(empresa)
    db.commit()
    db.refresh(empresa)
    return EmpresaOut.model_validate(empresa)


@router.get("/", response_model=list[EmpresaOut])
def listar_empresas(
    ativos_apenas: bool = True,
    tipo: str | None = None,
    db: Session = Depends(get_db),
):
    query = select(Empresa)

    if ativos_apenas:
        query = query.where(Empresa.ativo.is_(True))

    if tipo:
        query = query.where(Empresa.tipo == tipo)

    empresas = db.execute(query).scalars().all()
    return [EmpresaOut.model_validate(e) for e in empresas]
