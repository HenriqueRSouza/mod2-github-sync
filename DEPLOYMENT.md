# Deployment

## Pre-requisitos

- Docker 24+ com Compose v2
- PostgreSQL 16+ e Redis 7+ no ambiente gerenciado
- Secret manager capaz de injetar as variaveis de ambiente

## Variaveis obrigatorias

Use `.env.example` como referencia. Em producao, defina `DJANGO_SECRET_KEY`, `POSTGRES_PASSWORD` e `CREDENTIAL_MASTER_KEY` no secret manager. Nunca versionar `.env`.

## Subida local

```bash
cp .env.example .env
# Substitua todos os valores `replace-*`.
docker compose up --build -d
docker compose exec app python manage.py createsuperuser
```

## Banco e processos

```bash
docker compose exec app python manage.py migrate
docker compose exec app python manage.py check --deploy
docker compose logs -f app worker
```

API e worker devem executar a mesma imagem. O encerramento gracioso do worker usa janela de quinze segundos definida no Compose.
