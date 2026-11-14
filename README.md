# TrampoFácil

Aplicação web para organizar a busca por oportunidades e acompanhar candidaturas feitas em sites externos. Empresas não publicam vagas no TrampoFácil: a pessoa se candidata pelo portal da vaga e registra o processo no próprio painel.

**[Abrir a demonstração online](https://thalistornquist.github.io/projeto-empregos/)**

## Como experimentar

Na demonstração, abra **Minhas candidaturas** para criar uma conta ou entrar. O Supabase pode pedir confirmação do e-mail. Depois, registre uma vaga em que você já se candidatou e acompanhe as etapas do processo.

A primeira consulta ao painel pode demorar enquanto a API hospedada inicia.

## Funcionalidades

- Páginas responsivas com recursos para encontrar vagas, preparar currículo e se preparar para entrevistas.
- Rastreador pessoal para registrar empresa, cargo, etapa, data e link da vaga.
- Filtros e atualização de etapa das candidaturas.
- Cadastro e login com Supabase Auth.
- API que associa cada candidatura à conta autenticada.

## Tecnologias

- HTML, CSS e JavaScript sem framework no front-end.
- Python e FastAPI na API REST.
- Supabase Auth para autenticação.
- SQLite no desenvolvimento local e PostgreSQL no ambiente publicado.
- GitHub Pages para o front-end e Render para a API.

## Executar localmente

Requisitos: Python 3.10 ou superior. Os comandos abaixo usam PowerShell e dois terminais.

### 1. Clonar o projeto

```powershell
git clone https://github.com/ThalisTornquist/projeto-empregos.git
cd projeto-empregos
```

### 2. Apontar o front-end para a API local

Edite temporariamente `assets/js/config.js`:

```javascript
window.TRAMPOFACIL_CONFIG = Object.freeze({
  apiBaseUrl: 'http://127.0.0.1:8000',
  supabaseUrl: '',
  supabasePublishableKey: '',
});
```

Isso ativa o modo local sem login, com dados no SQLite do computador. Para voltar a usar a demonstração online, restaure os valores publicados que estavam no arquivo.

### 3. Iniciar a API

No primeiro terminal:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:TRAMPOFACIL_AUTH_MODE="local"
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

A documentação interativa da API fica em [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs). O banco local é criado em `backend/data/trampofacil.db`.

### 4. Servir o front-end

No segundo terminal, na pasta raiz do projeto:

```powershell
python -m http.server 5500
```

Abra [http://127.0.0.1:5500](http://127.0.0.1:5500). Use um servidor HTTP local; abrir o HTML diretamente como arquivo pode impedir que recursos e autenticação funcionem como esperado.

## Estrutura

```text
.
├── assets/
│   ├── css/
│   ├── images/
│   └── js/
├── backend/
│   ├── app/
│   └── README.md
├── pages/
├── index.html
└── README.md
```

## Segurança e configuração

O navegador usa somente a URL do projeto e a chave pública `publishable` do Supabase. Nunca coloque no front-end uma chave `secret`/`service_role`, senha do banco ou outro segredo. A API valida o token da sessão e limita cada usuário às próprias candidaturas.

Para configuração de produção e publicação da API, consulte o [guia do backend](backend/README.md).

## Autor

**Thalis Abel Tornquist** — estudante de Ciência de Dados na Universidade Federal de Mato Grosso do Sul (UFMS).

[GitHub](https://github.com/ThalisTornquist)
