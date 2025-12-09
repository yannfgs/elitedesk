# backend/app/api/usuarios.py
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import select

from typing import List

from app.core.config import SessionLocal
from app.core.security import (
    verificar_senha,
    gerar_hash_senha,
    criar_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioOut, Token, TokenData

router = APIRouter(tags=["auth"])


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_usuario_by_email(db: Session, email: str) -> Usuario | None:
    email = email.lower()
    return db.execute(
        select(Usuario).where(Usuario.email == email)
    ).scalar_one_or_none()



def autenticar_usuario(db: Session, email: str, senha: str) -> Usuario | None:
    usuario = get_usuario_by_email(db, email.lower())
    if not usuario:
        return None
    if not usuario.ativo:
        return None
    if not verificar_senha(senha, usuario.senha_hash):
        return None
    return usuario



async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    cred_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas ou token expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    from jose import JWTError
    from app.schemas.usuario import TokenData
    from app.core.security import decodificar_token

    payload = decodificar_token(token)
    if payload is None:
        raise cred_exception

    email: str | None = payload.get("sub")
    if email is None:
        raise cred_exception

    token_data = TokenData(email=email)

    usuario = get_usuario_by_email(db, token_data.email)
    if usuario is None:
        raise cred_exception

    return usuario


def require_perfil(perfis_permitidos: list[str]):
    def inner(usuario: Usuario = Depends(get_current_user)) -> Usuario:
        if usuario.perfil not in perfis_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuário sem permissão para esta operação.",
            )
        return usuario

    return inner


@router.post("/auth/register", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def registrar_usuario(usuario_in: UsuarioCreate, db: Session = Depends(get_db)):
    # Impede e-mails duplicados
    existente = get_usuario_by_email(db, usuario_in.email)
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe usuário com este e-mail.",
        )

    usuario = Usuario(
        nome=usuario_in.nome,
        email=usuario_in.email,
        senha_hash=gerar_hash_senha(usuario_in.senha),
        perfil=usuario_in.perfil,
        setor_nome=usuario_in.setor_nome,
        ativo=usuario_in.ativo,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return UsuarioOut.model_validate(usuario)


@router.post("/auth/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    usuario = autenticar_usuario(db, form_data.username, form_data.password)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha inválidos.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = criar_access_token(
        dados={"sub": usuario.email},
        expires_delta=access_token_expires,
    )
    return Token(access_token=access_token, token_type="bearer")


@router.get("/users/me", response_model=UsuarioOut)
def ler_usuario_atual(current_user: Usuario = Depends(get_current_user)):
    return UsuarioOut.model_validate(current_user)

@router.get("/debug/users", response_model=List[UsuarioOut])
def listar_usuarios_debug(db: Session = Depends(get_db)):
    usuarios = db.execute(select(Usuario)).scalars().all()
    return [UsuarioOut.model_validate(u) for u in usuarios]
