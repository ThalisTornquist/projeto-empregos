# API TrampoFácil

API REST em FastAPI para o usuário registrar vagas encontradas em sites externos e acompanhar o próprio processo seletivo. Não é um portal de publicação de vagas para empresas.

## Desenvolvimento local

Na pasta `backend/`, use PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:TRAMPOFACIL_AUTH_MODE="local"
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

SQLite é criado em `data/trampofacil.db`; registros anteriores são preservados e associados ao perfil local de desenvolvimento. O modo local recusa solicitações que não venham da própria máquina. Documentação: `http://127.0.0.1:8000/docs`.

## Autenticação e isolamento

Para usar várias contas, configure Supabase Auth e inicie a API com:

```text
TRAMPOFACIL_AUTH_MODE=supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<chave-publicável>
```

O navegador obtém a sessão com Supabase Auth. A API valida o bearer token junto ao endpoint Auth do projeto e usa o UUID validado como proprietário de cada registro. Toda consulta, atualização e remoção inclui esse proprietário. A chave publishable/anon é pública; nunca coloque uma chave `service_role` ou `secret` no front-end.

No painel Supabase, habilite cadastro por e-mail, defina `Site URL` como a origem do GitHub Pages e adicione como URL de redirecionamento permitida a página `pages/candidaturas.html` (além da URL local usada no desenvolvimento). Se a confirmação de e-mail estiver ligada, o usuário confirma o cadastro antes de entrar.

O banco usa SQLite quando `DATABASE_URL` não está definida, e PostgreSQL quando recebe uma URL `postgresql://...` (por exemplo, do Supabase). Configure também `TRAMPOFACIL_CORS_ORIGINS` com a origem exata do front-end, por exemplo `https://seu-usuario.github.io`.

## Rotas

- `GET /health` — disponibilidade da API, sem dados de usuário.
- `GET /applications` — lista somente os registros do usuário autenticado; suporta `?status=applied`, `interview`, `test`, `offer` ou `rejected`.
- `POST /applications` — adiciona vaga ao acompanhamento do usuário autenticado.
- `PATCH /applications/{id}` — altera a etapa, se o registro pertencer ao usuário.
- `DELETE /applications/{id}` — remove o registro, se pertencer ao usuário.

Os campos da vaga são `company`, `role`, `status` e `date` (`YYYY-MM-DD`); `link` é opcional e aceita apenas URLs HTTP/HTTPS.

## Deploy do serviço (exemplo: Render)

Crie um Web Service apontando para este repositório com diretório raiz `backend/`; comando de build `pip install -r requirements.txt`; comando de início `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Configure `TRAMPOFACIL_AUTH_MODE=supabase`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL` (pooler PostgreSQL do Supabase) e `TRAMPOFACIL_CORS_ORIGINS`. O front-end recebe a URL `https://...onrender.com` em `assets/js/config.js`. Em redes IPv4, use o pooler de sessão do Supabase para a conexão PostgreSQL do serviço Render. Não publique o serviço com `TRAMPOFACIL_AUTH_MODE=local`.
