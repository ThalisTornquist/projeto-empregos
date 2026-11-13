# TrampoFácil

Projeto de portfólio e acompanhamento de candidaturas para quem está procurando oportunidades profissionais. Além de recursos de preparação, o projeto inclui um rastreador pessoal de candidaturas: a pessoa encontra uma vaga em sites externos, se candidata por lá e registra a oportunidade no TrampoFácil para acompanhar entrevistas, testes e respostas. Empresas não publicam vagas na plataforma.

## Demonstração

🔗 **[Acessar o site pelo GitHub Pages](https://thalistornquist.github.io/projeto-empregos/)**

## Sobre o projeto

O projeto consiste em um site relacionado à divulgação de oportunidades de emprego, desenvolvido como parte do meu aprendizado em desenvolvimento web e da criação de um produto de acompanhamento profissional. O front-end trabalha com múltiplas páginas e o back-end oferece autenticação, persistência e painel pessoal para o usuário.

Durante o desenvolvimento, foram praticados conceitos de estruturação de páginas, navegação entre diferentes páginas, organização de conteúdo, estilização com CSS, além de autenticação com Supabase e API em Python/FastAPI.

## Tecnologias utilizadas

* HTML5
* CSS3
* JavaScript
* Python 3.10+
* FastAPI
* SQLite / PostgreSQL
* Supabase Auth

## Estrutura

```text
.
├── index.html
├── pages/                 # Recursos, preparação e painel pessoal
├── assets/css/            # Estilos
├── assets/js/             # Navegação, painel, autenticação e vídeos
├── backend/               # API FastAPI, banco SQLite/PostgreSQL e instruções
├── README.md
├── LICENSE
└── .gitignore
```

## Rodar no computador

Requer Python 3.10 ou posterior. Abra o site via HTTP, por exemplo com Live Server do VS Code (`http://127.0.0.1:5500`), e em outro terminal:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:TRAMPOFACIL_AUTH_MODE="local"
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

A API local usa SQLite em `backend/data/trampofacil.db`. O modo local é somente para desenvolvimento e aceita apenas chamadas originadas na própria máquina. O front-end também pode ser aberto sem API: nesse caso o painel é uma demonstração cujo conteúdo fica no `localStorage` daquele navegador.

## Como executar localmente

1. Clone o repositório:

```bash
git clone https://github.com/ThalisTornquist/projeto-empregos
```

2. Abra a pasta do projeto.
3. Abra o arquivo `index.html` em um navegador.

O projeto não possui dependências externas para a versão estática, mas a versão completa com painel e API exige Python e as dependências do backend.

## Contas e dados

Para contas individuais, o front-end usa Supabase Auth e a API valida a sessão antes de acessar os dados. Cada registro tem um usuário proprietário, e as rotas só listam, alteram ou removem registros desse proprietário. SQLite serve ao desenvolvimento; a variável `DATABASE_URL` troca o armazenamento para PostgreSQL.

## Publicação gratuita (arquitetura preparada)

- **Front-end:** GitHub Pages continua adequado; HTML, CSS e JavaScript rodam normalmente no navegador.
- **Login e PostgreSQL:** projeto Supabase. A chave pública (`publishable`/`anon`) e a URL do projeto vão em `assets/js/config.js`.
- **API Python:** Web Service Render com diretório raiz `backend/`, build `pip install -r requirements.txt` e início `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

No serviço da API, defina `TRAMPOFACIL_AUTH_MODE=supabase`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL` do PostgreSQL e `TRAMPOFACIL_CORS_ORIGINS` com a URL exata do GitHub Pages. Nunca coloque a chave `service_role`/secret no JavaScript. O arquivo `assets/js/config.js` mantém esses valores vazios até a criação e configuração dos serviços.

O deploy ainda depende de criar os projetos/serviços nas respectivas contas, configurar os segredos e conferir a política de e-mail do Supabase. Consulte [`backend/README.md`](backend/README.md) para o passo a passo da API e das variáveis.

### Ativar login e dados online

1. No [Supabase Dashboard](https://supabase.com/dashboard), crie um projeto e guarde a senha do banco em local seguro.
2. Em Authentication, deixe o cadastro por e-mail habilitado. Em URL Configuration, use a URL atual do GitHub Pages como `Site URL` e permita a página `pages/candidaturas.html` tanto em produção quanto no endereço local de desenvolvimento.
3. Em Project Settings > API Keys, copie a Project URL e a chave **publishable**. Não use nem publique uma `secret`/`service_role` key.
4. No Render, crie um Web Service ligado ao repositório, raiz `backend`, build `pip install -r requirements.txt` e início `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Selecione o plano Free para o protótipo.
5. No ambiente do serviço Render, cadastre `TRAMPOFACIL_AUTH_MODE=supabase`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL` (pooler de sessão PostgreSQL do Supabase) e `TRAMPOFACIL_CORS_ORIGINS` (somente a origem do GitHub Pages, sem caminho).
6. Quando o Render mostrar a URL da API, preencha `apiBaseUrl`, `supabaseUrl` e `supabasePublishableKey` em `assets/js/config.js`. Publique esses arquivos atualizados no GitHub Pages e teste criar conta, confirmar o e-mail, entrar e registrar uma vaga.

O plano gratuito do Render suspende o serviço após 15 minutos sem tráfego e o primeiro acesso pode levar cerca de um minuto para acordá-lo. Projetos Supabase Free com pouca atividade de banco por uma semana podem ser pausados; os dados permanecem no projeto enquanto pausado. Confira as [limitações atuais do Render](https://render.com/docs/free) e a [política de pausa do Supabase](https://supabase.com/docs/guides/platform/free-project-pausing).

## Conceitos praticados

* Estruturação de páginas com HTML
* Organização de conteúdo
* Criação de múltiplas páginas
* Navegação entre páginas
* Links internos
* Estilização com CSS
* Layout e posicionamento de elementos
* Organização de arquivos
* Autenticação e persistência de dados
* Acompanhamento de processos de candidatura

## Objetivo

Projeto desenvolvido para aprimorar conhecimentos em HTML, CSS, JavaScript e desenvolvimento de aplicações web, além de praticar a construção de sites organizados, múltiplas páginas e rastreamento de vagas e candidaturas.

## Autor

**Thalis Abel Tornquist**

Estudante de Ciência de Dados pela Universidade Federal de Mato Grosso do Sul (UFMS).

[GitHub](https://github.com/ThalisTornquist)

