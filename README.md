# AI Platform — GitHub Service (Módulo 2) · Motor de Sincronização

**Responsável por este repositório:** Henrique Ribeiro (10401770) — Product Owner & Data Engine Dev.

Escopo entregue aqui: **motor de sincronização, coleta de fatos Git e métricas** — ingestão de webhooks
(`push`/`pull_request`), cadastro automático de repositórios, importação do histórico recente
(backfill de commits e PRs), métricas de fluxo/commits e documentação do backlog.

| Ambiente | Link |
| --- | --- |
| Este serviço (Azure · ProjetoEngModulo) | [https://projetoengmodulo-c4dyc7czchdnevgg.francecentral-01.azurewebsites.net](https://projetoengmodulo-c4dyc7czchdnevgg.francecentral-01.azurewebsites.net/) · [Swagger](https://projetoengmodulo-c4dyc7czchdnevgg.francecentral-01.azurewebsites.net/docs/) · [Health](https://projetoengmodulo-c4dyc7czchdnevgg.francecentral-01.azurewebsites.net/api/v1/health) |
| Serviço integrado do Eduardo (backend core, M1/M6, IA) | [https://ai-platform-github-service-eduardo-frapb8fbbcd0bfdm.brazilsouth-01.azurewebsites.net](https://ai-platform-github-service-eduardo-frapb8fbbcd0bfdm.brazilsouth-01.azurewebsites.net/) · [Swagger](https://ai-platform-github-service-eduardo-frapb8fbbcd0bfdm.brazilsouth-01.azurewebsites.net/docs/) |
| Repositório do Eduardo | [EduardoFdeM/ai-platform-github-service](https://github.com/EduardoFdeM/ai-platform-github-service) |

Integração entre os dois serviços: mesmo login do **Módulo 1** (JWT RS256/JWKS), mesma Central de
Notificações do **Módulo 6**, e o webhook deste repositório também alimenta o serviço do Eduardo.

### Organização das branches

- `main` — desenvolvimento do Henrique (este escopo; deploy automático no Azure).
- `eduardo` — espelho do repositório do Eduardo (backend core, segurança, infraestrutura e integrações).
- `pedro` — frontend SPA (Vite/React) do Pedro, consumindo a API publicada.


Microsserviço responsável pela integração da **AI Platform** com o GitHub: webhooks, sincronização e indexação de repositórios, conteúdo/diffs com proveniência, métricas e inteligência auditável sobre o fluxo Git.

Desenvolvido para a disciplina de **Engenharia de Software (2026.2)** — Universidade Presbiteriana Mackenzie.

## Equipe (Módulo 2)
- **Pedro Cavalcante** — 10437298
- **Henrique Ribeiro** — 10401770
- **Eduardo Ferreira de Mattos** — 10402800

---

## Fundação Entregue

- **Django REST Framework** com documentação OpenAPI e Swagger UI em `/docs/`.
- Cadastro, login e projetos integrados ao Módulo 1 por proxy same-origin; JWT `RS256` validado por JWKS, `issuer`, `audience` e expiração.
- Isolamento dos repositórios e de todos os dados derivados por usuário (`sub`) e `project_id` do Módulo 1.
- Endpoints de Webhooks: `POST /webhooks/github` e `/api/v1/webhooks/github` com validação de assinatura **HMAC-SHA256**.
- Segredos de webhooks criptografados no banco por repositório com **AES-256-GCM**.
- Idempotência rigorosa via cabeçalho `X-GitHub-Delivery` e enfileiramento assíncrono via **Celery / Redis**.
- Ingestão em segundo plano de eventos de `push` e `pull_request`.
- Modelo relacional normalizado: Repositories, Branches, Contributors, Emails, Commits, CommitFiles, PullRequests e WebhookDeliveries.
- Contratos REST para consumidores: commits, branches, PRs, conteúdo textual, diffs limitados, métricas e insights de frequência/clareza/gargalos.
- Operação confiável: logs JSON correlacionados, retry seletivo, replay autenticado, liveness e readiness de banco/Redis/worker/crypto.
- Política de credenciais: PAT efêmero, escopos mínimos configuráveis e segredo de webhook com versão, expiração, rotação e auditoria.
- Dashboard operacional integrado em `/dashboard/`.
- Infraestrutura completa com **Docker Compose**, testes automatizados (**pytest**), SAST (**bandit**), linter (**ruff**) e pipeline de CI no **GitHub Actions**.

---

## Início Rápido

### Com Docker (Recomendado)

```bash
cp .env.example .env
# Configure CREDENTIAL_MASTER_KEY e as variáveis no .env
docker compose up --build -d
docker compose exec app python manage.py seed_demo_data
```

Acesse:
- **Frontend SPA:** branch `pedro`
- **Swagger UI:** `http://localhost:8000/docs/`
- **Health Check:** `http://localhost:8000/api/v1/health`
- **Readiness:** `http://localhost:8000/api/v1/health/readiness`
- **Latência GitHub:** `http://localhost:8000/api/v1/health/github-connectivity`
- **Django Admin:** `http://localhost:8000/admin/`

### Sem Docker (Desenvolvimento Local)

Requer Python 3.12+ e Node.js 20+.

**1. Backend (Terminal 1):**
```bash
python -m venv .venv
source .venv/bin/activate  # No Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py seed_demo_data
python manage.py runserver
```

O frontend SPA fica na branch `pedro` (`git switch pedro && npm install && npm run dev`).

*(Sem `POSTGRES_HOST`, o projeto utiliza SQLite local; para testes síncronos sem Redis, utilize `CELERY_TASK_ALWAYS_EAGER=true`).*

---

## Registrar Repositório para Webhooks

```bash
docker compose exec app python manage.py register_repository \
  --github-id 123456 \
  --owner minha-organizacao \
  --name meu-repositorio \
  --webhook-secret 'seu-segredo-aqui'
```

Configure o webhook no GitHub apontando para a rota pública `/webhooks/github` com `application/json`.

---

## Qualidade e Testes

```bash
ruff check .
bandit -q -r apps -x apps/github_sync/tests
coverage run -m pytest
coverage report --fail-under=80
python manage.py makemigrations --check --dry-run
python manage.py spectacular --validate --fail-on-warn
```

Meta de cobertura de testes: **80%**.

O código pode ser validado localmente sem provar publicação. Produção exige CI remoto verde, migrações,
`MODULE1_AUTH_REQUIRED=true`, secrets, readiness verde e um sync/webhook real no ambiente publicado.

---

## Documentação e Arquitetura

- [Guia de Deployment](DEPLOYMENT.md)
- [Arquitetura e Riscos](docs/architecture.md)
- [Guia de Integração para outros módulos](docs/integration-guide.md)
- [Mapa de Integração da Plataforma](docs/platform-integration-map.md)
- [Cobertura das POCs do frontend](docs/poc-coverage.md)
- [Revisão de status do YouTrack](docs/youtrack-status-review.md)
- [Backlog restante exclusivo do Módulo 2](docs/module-2-backlog.md)
- [Decisões Arquiteturais (ADRs)](docs/adr/)
- [Contexto da AP1 e Backlog](CONTEXTO.md)

