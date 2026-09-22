# GitHub Sync - Modulo 2

Microsservico para integrar a plataforma academica ao GitHub, receber webhooks, indexar commits e pull requests e oferecer dados para analytics e recomendacoes de IA.

## Fundacao entregue

- Django REST Framework com OpenAPI e Swagger em `/docs/`.
- `POST /webhooks/github` e `/api/v1/webhooks/github` com HMAC-SHA256.
- Segredo individual por repositorio protegido com AES-256-GCM.
- Idempotencia por `X-GitHub-Delivery` e processamento assincrono com Celery.
- Ingestao inicial dos eventos `push` e `pull_request`.
- Modelo relacional para repositorios, branches, contribuidores, emails, commits, arquivos e PRs.
- `GET /api/v1/commits`, `GET /api/v1/metrics/flow` e health checks.
- PostgreSQL, Redis, Docker Compose, testes, lint, SAST e CI.

Esta e uma fundacao, nao a implementacao integral das cem historias. Sincronizacao historica, GraphQL, GitHub App, DLQ dedicada, cache, JWT, exportacao, Pact, Prometheus e IA permanecem no roadmap.

## Inicio rapido

```bash
cp .env.example .env
# Gere CREDENTIAL_MASTER_KEY conforme o comentario do arquivo e troque os demais segredos.
docker compose up --build -d
```

Acesse `http://localhost:8000/docs/` e `http://localhost:8000/api/v1/health`.

## Registrar um repositorio

Obtenha o ID numerico do repositorio no GitHub e use o mesmo segredo ao configurar seu webhook:

```bash
docker compose exec app python manage.py register_repository \
  --github-id 123456 \
  --owner minha-organizacao \
  --name meu-repositorio \
  --webhook-secret 'um-segredo-forte'
```

Configure o webhook para apontar a uma URL publica terminada em `/webhooks/github`, selecione `application/json` e habilite inicialmente eventos de push e pull request.

## Desenvolvimento sem Docker

O projeto requer Python 3.12+.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py runserver
```

Sem `POSTGRES_HOST`, o ambiente local usa SQLite. Redis continua necessario para execucao assincrona; em testes, use `CELERY_TASK_ALWAYS_EAGER=true`.

## Qualidade

```bash
ruff check .
bandit -q -r apps -x apps/github_sync/tests
coverage run -m pytest
coverage report
python manage.py makemigrations --check --dry-run
```

Meta de cobertura: 80%.

## Documentacao

- [Arquitetura, fronteiras e riscos](docs/architecture.md)
- [Deployment](DEPLOYMENT.md)
- [ADRs](docs/adr/)

## Roadmap sugerido

1. E0/E1: fechar contratos, GitHub App, credenciais e autenticar APIs internas.
2. E2/E3: completar eventos, DLQ, sincronizacao historica, reconciliacao e cache.
3. E4: calcular lead time, tempo de review, hotspots e concentracao temporal.
4. E5/E6: observabilidade, contrato, E2E, hardening, deploy e release.
