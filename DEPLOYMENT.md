# Deployment

## Pre-requisitos

- Docker 24+ com Compose v2
- PostgreSQL 16+ e Redis 7+ no ambiente gerenciado
- Secret manager capaz de injetar as variaveis de ambiente

## Variáveis obrigatórias

Use `.env.example` como referência. Em produção, defina `DJANGO_SECRET_KEY`, `POSTGRES_PASSWORD`,
`CREDENTIAL_MASTER_KEY` e `MODULE1_AUTH_REQUIRED=true` no secret manager. Nunca versione `.env`.

O contrato autenticado usa os valores confirmados no ambiente do Módulo 1:

- `MODULE1_JWT_ISSUER=https://mod1-auth.whitemeadow-deba1090.brazilsouth.azurecontainerapps.io` (sem barra final);
- `MODULE1_JWT_AUDIENCE=engenharia-software-api`;
- `MODULE1_JWKS_URL=https://mod1-auth.whitemeadow-deba1090.brazilsouth.azurecontainerapps.io/.well-known/jwks.json`;
- `MODULE1_AUTH_BASE_URL` e `MODULE1_PROJECTS_BASE_URL` conforme `.env.example`;
- `MODULE1_HTTP_CONNECT_TIMEOUT=5` e `MODULE1_HTTP_READ_TIMEOUT=45`: falhas de conexão encerram rápido, enquanto o cold start acadêmico ainda possui janela de leitura suficiente;
- `MODULE1_JWKS_TIMEOUT=15` e `MODULE1_JWKS_CACHE_SECONDS=300` para limitar e amortizar a descoberta de chaves;
- `PLATFORM_AUTH_THROTTLE_RATE=20/minute` para limitar tentativas anônimas de cadastro e login;
- `ALLOWED_HOSTS` contendo o hostname público exato.

Não reative o antigo `X-Module-API-Key`: as rotas de negócio exigem o Bearer do Módulo 1 e filtram dados
por `sub` e `project_id`. Apenas health, documentação e o receptor HMAC do GitHub permanecem públicos.

Defina também `GITHUB_REQUIRED_SCOPES` conforme o tipo de repositório. `AI_INSIGHTS_ENABLED` deve permanecer `false` salvo se URL, chave, modelo, privacidade e custo do provedor tiverem sido aprovados; o modo determinístico funciona sem IA externa.

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

## Critério de saúde

- `/api/v1/health` é liveness e verifica banco.
- `/api/v1/health/readiness` é o gate de tráfego e verifica banco, Redis, worker Celery e chave criptográfica.
- `/api/v1/health/github-connectivity` é diagnóstico externo e não deve reiniciar a aplicação quando o GitHub estiver indisponível.

O Compose inclui healthchecks de PostgreSQL, Redis, app e worker. Em ambiente remoto, só encaminhe tráfego após readiness HTTP 200.

## Migração e smoke pós-deploy

1. Execute `python manage.py migrate` com a mesma versão da aplicação.
2. Confirme `/api/v1/health/readiness`.
3. Confirme `/api/schema/?format=json` e `/docs/`.
4. Cadastre/acesse uma conta pelo proxy `/api/v1/platform/auth/...` e crie/selecione um projeto.
5. Confirme que uma chamada sem Bearer recebe 401 e que o usuário não enxerga projetos/repositórios de outra conta.
6. Faça handshake com um PAT de teste e verifique escopos sem registrar o token.
7. Cadastre e sincronize um repositório controlado com o `project_id` selecionado.
8. Envie um webhook assinado e aguarde `processed` em `/api/v1/webhooks/deliveries`.
9. Consulte conteúdo, diff e insights do repositório de teste.

### Repositórios anteriores à identidade do Módulo 1

A migração preserva repositórios antigos com `platform_user_id` e `project_id` vazios porque não existe uma associação segura que possa ser inferida automaticamente. Com `MODULE1_AUTH_REQUIRED=true`, esses registros ficam intencionalmente invisíveis. Em ambiente acadêmico novo, reconecte o repositório após login e seleção do projeto. Se houver dados reais a preservar, faça a associação manual somente depois de confirmar os UUIDs do proprietário e do projeto no Módulo 1.

O MVP trata `github_id` como identidade global do repositório e permite uma única conexão por repositório GitHub. Vários usuários não podem cadastrar separadamente o mesmo repositório; acesso compartilhado depende do contrato futuro de equipes/RBAC do Módulo 1.

## Publicação Azure

O workflow atual publica no App Service `ai-platform-github-service-eduardo` somente depois de toda a qualidade passar.
O App Service precisa existir previamente e o federated identity usado pelos três secrets OIDC do workflow deve ter acesso
ao recurso. O workflow não cria infraestrutura nem escolhe plano de cobrança.

Antes do push, confirme no Azure o resource group, plano, aplicação, PostgreSQL/Redis e variáveis. Depois do push,
o job de deploy precisa terminar com smoke HTTP 200. Um hostname em `NXDOMAIN` significa que a aplicação não está
provisionada; não divulgue a URL nessa situação.

O workflow executa lint, testes backend/frontend, cobertura mínima, OpenAPI, Bandit, auditoria de dependências e um smoke de health após o deploy. O smoke do GitHub Actions e os testes locais são evidências diferentes; não declare produção apenas com execução local.
