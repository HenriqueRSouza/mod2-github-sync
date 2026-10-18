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

O PostgreSQL aplica usuario e senha somente na primeira criacao do volume. Se essas variaveis forem alteradas depois,
atualize a credencial no banco ou recrie explicitamente o volume local quando nao houver dados a preservar.

API e worker devem executar a mesma imagem. O encerramento gracioso do worker usa janela de quinze segundos definida no Compose.

## Repositorios monitorados

Defina `GITHUB_REPOSITORIES` (ex.: `HenriqueRSouza/mod2-github-sync`, separados por virgula) e
`GITHUB_WEBHOOK_SECRET`. A cada inicializacao o container consulta o GitHub e cadastra esses
repositorios com o segredo informado, entao o cadastro sobrevive a bancos efemeros. Repositorios
privados exigem tambem `GITHUB_TOKEN`. Na mesma etapa, os commits da branch padrao e os PRs dos
ultimos `GITHUB_BACKFILL_DAYS` dias (padrao 30) sao importados da API do GitHub.

No GitHub, crie o webhook do repositorio apontando para `https://<host>/webhooks/github`, com
`application/json`, o mesmo segredo e os eventos `push` e `pull_request`.
