# backend/app/core/security.py
from datetime import datetime, timedelta
from typing import Any, Optional

from jose import jwt, JWTError
from passlib.context import CryptContext

# Em produção, gere uma chave forte e guarde em variável de ambiente
SECRET_KEY = "super-secret-elitedesk-key"  # troque depois
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 horas

# Usando pbkdf2_sha256 para evitar problemas com bcrypt
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def verificar_senha(senha_plana: str, senha_hash: str) -> bool:
    return pwd_context.verify(senha_plana, senha_hash)


def gerar_hash_senha(senha_plana: str) -> str:
    return pwd_context.hash(senha_plana)


def criar_access_token(dados: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode: dict[str, Any] = dados.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decodificar_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
