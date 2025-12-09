Iniciar (ou reiniciar) o servidor no terminal: " uvicorn app.main:app --reload "
# EliteDesk

venv\Scripts\activate
Aplicação simples de abertura e acompanhamento de tickets composta por uma API FastAPI e um front-end estático em HTML/JS. Este README reúne as instruções de execução e um panorama rápido das principais pastas e rotas disponíveis.

----------------------
## Visão geral
- **Backend:** FastAPI com SQLAlchemy e PostgreSQL para armazenar tickets, setores e categorias.
- **Frontend:** página única em `frontend/index.html` que consome a API para abrir tickets, listar registros e visualizar estatísticas.
- **Documentação da API:** disponível automaticamente em `/docs` (Swagger) ou `/redoc` quando o servidor estiver em execução.

Acessar de novo a API e o front
## Pré-requisitos
- Python 3.10+ (recomendado um ambiente virtual).
- PostgreSQL em execução e acessível.
- Navegador moderno para abrir o front-end estático.

Com o servidor de pé:
## Estrutura do projeto
```
.
├── backend/
│   ├── app/
│   │   ├── api/          # Rotas de tickets, relatórios, setores e categorias
│   │   ├── core/         # Configuração do banco (engine, SessionLocal)
│   │   ├── db/           # Base declarativa do SQLAlchemy
│   │   ├── models/       # Modelos ORM (ex.: Ticket)
│   │   ├── schemas/      # Modelos Pydantic usados nas rotas
│   │   └── main.py       # Ponto de entrada do FastAPI
│   └── venv/             # Ambiente virtual local (opcional)
└── frontend/
    └── index.html        # Interface para abrir e acompanhar tickets
```

No navegador:
## Configuração do backend
1. Crie e ative um ambiente virtual (opcional):
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
   ```

http://127.0.0.1:8000/docs → Swagger (API)
2. Instale as dependências principais (ajuste se já estiverem presentes no venv):
   ```bash
   pip install fastapi uvicorn[standard] sqlalchemy psycopg2-binary pydantic
   ```

Seu front:
3. Configure a URL do banco em `backend/app/core/config.py` (credenciais de exemplo já estão no arquivo):
   ```python
   DATABASE_URL = "postgresql+psycopg2://<usuario>:<senha>@<host>:<porta>/<database>"
   ```
   > As tabelas são criadas automaticamente na inicialização via `Base.metadata.create_all`.

Abra o arquivo frontend/index.html no navegador (duplo clique ou via Live Server), como você já fazia.
4. Inicie a API em modo desenvolvimento (com hot reload):
   ```bash
   uvicorn app.main:app --reload
   ```
   - Health check: `GET /health`
   - Documentação Swagger: `http://127.0.0.1:8000/docs`

## Uso do front-end
1. Com o backend em execução, abra `frontend/index.html` diretamente no navegador (duplo clique) ou via uma extensão como **Live Server**.
2. A página carrega setores e categorias da API, permite abrir novos tickets e apresenta resumo e gráficos.

## Rotas principais
- `POST /tickets` — cria um ticket.
- `GET /tickets` — lista tickets com filtros opcionais por status, setor e prioridade.
- `GET /tickets/{id}` — retorna detalhes de um ticket específico.
- `PATCH /tickets/{id}/status` — altera apenas o status do ticket.
- `GET /reports/resumo` — devolve contagens por status e por setor.
- `GET /setores` — lista setores cadastrados.
- `GET /categorias/{setor}` — categorias por setor.

## Dicas rápidas
- Caso use Docker ou outro orquestrador, certifique-se de expor o banco e a porta `8000` do FastAPI.
- Para testar rapidamente, ajuste as datas de `prazo_ideal` e `prazo_limite` no formulário do front para visualizar o farol (verde/amarelo/vermelho).