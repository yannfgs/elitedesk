# backend/app/schemas/usuario.py
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator


class UsuarioBase(BaseModel):
    nome: str
    email: EmailStr
    perfil: str = "solicitante"   # solicitante, operador, gestor, admin
    setor_nome: str | None = None
    ativo: bool = True

    # Normaliza e-mail para minúsculo
    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v):
        if isinstance(v, str):
            return v.lower()
        return v


class UsuarioCreate(UsuarioBase):
    senha: str


class UsuarioOut(UsuarioBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class UsuarioInDB(UsuarioBase):
    id: int
    senha_hash: str
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: EmailStr | None = None
