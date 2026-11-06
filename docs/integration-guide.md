# Guia de integração — Módulo 2 (GitHub Sync)

Referência dos contratos disponíveis no código e no ambiente publicado em **27 de outubro de 2026**. O módulo recebe e sincroniza fatos do GitHub, expõe conteúdo/diffs sob demanda e produz indicadores auditáveis. O pipeline, o health, a readiness, a conectividade GitHub, o schema OpenAPI e a interface pública foram verificados no App Service.

## Prontidão

| Capacidade | Estado no código | Dependência de ambiente |
| --- | --- | --- |
| REST + OpenAPI/Swagger | concluída, publicada e validada | nenhuma para consulta pública |
| Repositórios, commits, branches e PRs | concluída | GitHub acessível; PAT efêmero para recursos privados |
| Webhooks | concluída | HTTPS público, Redis e worker Celery |
| Conteúdo textual e diff | concluída | permissão GitHub para o recurso solicitado |
| Analytics e inteligência Git | concluída | dados previamente indexados; IA externa é opcional |
| Logs, retry, replay e readiness | concluída | serviços e secrets corretamente configurados |
| Login/JWT e projetos | concluída | disponibilidade das APIs do Módulo 1 |
| Isolamento usuário/projeto | concluída | Bearer válido e `project_id` pertencente ao `sub` |
| CORS do Módulo 1 | contornado por proxy same-origin no M2 | frontend e backend M2 na mesma origem |
| Gateway e Data Bus compartilhados | integração pendente | acordo entre os grupos |

Dados criados por `seed_demo_data` são somente demonstração local e nunca devem ser apresentados como dados institucionais.

## Endereços e descoberta

Base local padrão: `http://localhost:8000`.

Base pública validada: `https://ai-platform-github-service-eduardo-frapb8fbbcd0bfdm.brazilsouth-01.azurewebsites.net`.

| Recurso | Rota |
| --- | --- |
| OpenAPI 3.0.3 | `GET /api/schema/` |
| OpenAPI JSON | `GET /api/schema/?format=json` |
| Swagger UI | `GET /docs/` |
| API | `/api/v1/...` |
| Webhook preferencial | `POST /webhooks/github` |

`POST /api/v1/webhooks/github` aponta para o mesmo receptor. Configure no GitHub a rota pública sem versão, com HTTPS e `Content-Type: application/json`.

## Segurança para consumidores

- O PAT é aceito apenas no corpo de handshake, cadastro, sincronização, conteúdo ou diff. Ele não é persistido, devolvido nem usado como login da plataforma.
- O segredo do webhook é criptografado em repouso com AES-256-GCM, possui versão, rotação, expiração opcional e auditoria sem texto claro.
- Em produção, mantenha `MODULE1_AUTH_REQUIRED=true`. O padrão do código é fail-closed.
- O JWT é aceito somente com algoritmo `RS256`, assinatura presente no JWKS, `issuer` e `audience` exatos, claims obrigatórios e prazo válido.
- O token do Módulo 1 possui `sub`, `iss`, `aud`, `iat`, `exp` e `jti`; ele não possui `roles` nem `project_id`.
- Ao cadastrar um repositório, o M2 consulta `GET /projects/{project_id}` no Módulo 1 com o mesmo Bearer, confirma `owner_id == sub` e persiste ambos os UUIDs.
- `github_id` é único no MVP: o mesmo repositório GitHub não pode ser cadastrado por proprietários/projetos distintos até existir o contrato compartilhado de equipes/RBAC.
- Todas as leituras e mutações de repositório, commit, branch, PR, métrica, insight e entrega são filtradas pelo `sub` autenticado.
- Cadastro/login/projetos passam pelo proxy same-origin `/api/v1/platform/...`, porque as APIs do Módulo 1 não aceitam a origem local do navegador.
- `X-Request-ID` é aceito/gerado e devolvido na resposta; preserve-o ao correlacionar logs.

O M2 não cria identidades nem projetos em seu próprio banco: as rotas `/platform` apenas validam payloads e encaminham
ao Módulo 1. O access token fica no `sessionStorage` do frontend, expira após 1.800 segundos e é removido no logout/401.

## Catálogo de endpoints

| Método e rota | Proteção | Finalidade |
| --- | --- | --- |
| `GET /api/v1/health` | pública | liveness do processo e banco |
| `GET /api/v1/health/readiness` | pública | banco, Redis, worker e criptografia |
| `GET /api/v1/health/github-connectivity` | pública | conectividade e latência até o GitHub |
| `POST /api/v1/platform/auth/register` | pública | encaminha cadastro ao Módulo 1 |
| `POST /api/v1/platform/auth/token` | pública | troca e-mail/senha por Bearer de 30 minutos |
| `GET /api/v1/platform/auth/me` | Bearer M1 | devolve usuário validado pelo Módulo 1 |
| `GET\|POST /api/v1/platform/projects` | Bearer M1 | lista/cria projetos do usuário no Módulo 1 |
| `POST /api/v1/github/handshake` | Bearer M1 + PAT efêmero | valida identidade GitHub e escopos |
| `GET /api/v1/repositories?project_id={uuid}` | Bearer M1 | lista somente repositórios do usuário/projeto |
| `POST /api/v1/repositories` | Bearer M1 | valida projeto, cadastra, cifra segredo e tenta carga inicial |
| `DELETE /api/v1/repositories/{id}` | Bearer M1 | desvincula o repositório e remove somente os dados derivados do Módulo 2; o projeto do Módulo 1 é preservado |
| `POST /api/v1/repositories/{id}/sync` | Bearer M1 | sincronização incremental |
| `GET /api/v1/repositories/{id}/insights?days=30` | Bearer M1 | clareza, frequência, padrões, gargalos e recomendações |
| `POST /api/v1/repositories/{id}/contents` | Bearer M1 | conteúdo UTF-8 com SHA e URL de origem |
| `POST /api/v1/repositories/{id}/commits/{sha}/diff` | Bearer M1 | patches limitados por arquivo e proveniência |
| `GET /api/v1/branches` | Bearer M1 | branches, inclusive removidas sob opção |
| `GET /api/v1/commits` | Bearer M1 | commits paginados e filtráveis |
| `GET /api/v1/pull-requests` | Bearer M1 | PRs paginadas e filtráveis |
| `GET /api/v1/metrics/flow` | Bearer M1 | contagem de commits por autor |
| `GET /api/v1/metrics/dashboard` | Bearer M1 | KPIs operacionais de 7 ou 30 dias |
| `GET /api/v1/webhooks/deliveries` | Bearer M1 | 15 entregas mais recentes |
| `POST /api/v1/webhooks/deliveries/{uuid}/replay` | Bearer M1 | reagenda somente entrega falha |
| `POST /webhooks/github` | HMAC GitHub | recebe evento assinado |

Todas as rotas JSON usam `Content-Type: application/json`. Erros controlados seguem `{"code":"...","detail":"..."}`; automações devem decidir pelo status HTTP e pelo `code`.

## Autenticação e projetos

O frontend oficial usa o proxy same-origin do M2:

```http
POST /api/v1/platform/auth/register
Content-Type: application/json

{"email":"aluna@exemplo.com","display_name":"Aluna","password":"senha-com-12-ou-mais"}
```

```http
POST /api/v1/platform/auth/token
Content-Type: application/json

{"email":"aluna@exemplo.com","password":"senha-com-12-ou-mais"}
```

A resposta contém `access_token`, `token_type: bearer` e `expires_in: 1800`. Nas chamadas seguintes:

```http
Authorization: Bearer <ACCESS_TOKEN>
```

`GET /api/v1/platform/projects` lista projetos e `POST /api/v1/platform/projects` aceita `name` e `description`.
Backends de outros módulos podem obter o token diretamente no Módulo 1 e usar o mesmo Bearer no M2; não precisam
passar pelo proxy de interface.

## Fluxo de onboarding

1. Crie uma conta em `/api/v1/platform/auth/register` e faça login em `/api/v1/platform/auth/token`.
2. Exija `GET /api/v1/health/readiness` com HTTP 200; liveness sozinho não prova worker/Redis/crypto.
3. Consulte `/api/schema/?format=json` e gere o cliente a partir do contrato versionado.
4. Envie `Authorization: Bearer <access_token>` nas rotas protegidas e refaça login ao expirar.
5. Liste/crie um projeto; use o UUID retornado como `project_id` ao cadastrar e listar repositórios.
6. Guarde o `id` local do repositório; ele referencia as demais rotas.
7. Para repositório privado, envie o PAT apenas na requisição necessária; ele não substitui o Bearer.
8. Preserve `repository`, `sha`, `ref` e `source_url` nas respostas de conteúdo/diff como proveniência.
9. Use webhook ou sincronização como origem dos fatos; `insights` analisa apenas o que já está indexado.

## Handshake e escopos

```http
POST /api/v1/github/handshake

{"token":"<PAT_EFEMERO>"}
```

Resposta 200:

```json
{
  "valid": true,
  "login": "aluno-exemplo",
  "scopes": ["repo"],
  "required_scopes": ["repo"],
  "missing_scopes": [],
  "excess_scopes": [],
  "least_privilege": true
}
```

`GITHUB_REQUIRED_SCOPES` e `GITHUB_ALLOWED_SCOPES` definem a política do ambiente. Escopo obrigatório ausente resulta em 403. O serviço também informa privilégios excedentes para orientar menor privilégio.

## Cadastro e sincronização

```http
POST /api/v1/repositories
Authorization: Bearer <TOKEN_MODULO_1>

{
  "project_id": "0f2023f5-978c-4e74-a7d3-0d3925d5ad2d",
  "url": "https://github.com/organizacao/projeto",
  "token": "<PAT_OPCIONAL>",
  "webhook_secret": "<SEGREDO_UNICO_COM_16_OU_MAIS_CARACTERES>",
  "webhook_secret_expires_at": "2027-01-31T23:59:59Z"
}
```

O 201 contém o repositório, metadados de versão/rotação/expiração e `initial_sync_status`. Um cadastro bem-sucedido não implica carga inicial completa se `initial_sync_status` for `failed`.

```http
POST /api/v1/repositories/7/sync
Authorization: Bearer <TOKEN_MODULO_1>

{"token":"<PAT_OPCIONAL>"}
```

Resposta: `{"status":"synced","repository":"organizacao/projeto","commits_synced":42}`. Cada execução lê até 200 commits, 200 branches e 200 PRs e detalha até `GITHUB_COMMIT_DETAILS_LIMIT` commits. O histórico local é preservado; branches ausentes só são marcadas como removidas quando a listagem foi comprovadamente exaustiva.

## Contratos para M3, M4, M5 e M7

### Conteúdo textual

```http
POST /api/v1/repositories/7/contents
Authorization: Bearer <TOKEN_MODULO_1>

{"path":"src/app.py","ref":"main","token":"<PAT_OPCIONAL>"}
```

```json
{
  "repository": "organizacao/projeto",
  "path": "src/app.py",
  "ref": "main",
  "sha": "012345...",
  "size": 321,
  "encoding": "utf-8",
  "content": "...",
  "source_url": "https://github.com/organizacao/projeto/blob/main/src/app.py"
}
```

Há rejeição de travessia de diretório, arquivo não textual e conteúdo acima de `GITHUB_CONTENT_MAX_BYTES` (padrão 512 KiB).

### Diff por commit

```http
POST /api/v1/repositories/7/commits/0123456789abcdef/diff
Authorization: Bearer <TOKEN_MODULO_1>

{"token":"<PAT_OPCIONAL>"}
```

Cada arquivo retorna `path`, `status`, `additions`, `deletions`, `changes`, `patch` e `truncated`. O patch é limitado por `GITHUB_DIFF_PATCH_MAX_CHARS` (padrão 20.000 caracteres); consumidores devem respeitar `truncated` e a `source_url`.

## Analytics e inteligência Git

`GET /api/v1/repositories/7/insights?days=30` retorna total, nota média de clareza, distribuição de mensagens, frequência por dia/hora/autor, concentração, atividade fora de horário, dias de pico, gargalos, recomendações e avaliação dos commits recentes.

O modo padrão é determinístico e auditável. Quando `AI_INSIGHTS_ENABLED=true`, um provedor compatível com chat completions pode enriquecer recomendações; somente agregados são enviados, nunca conteúdo, diff, PAT ou segredo. `analysis_mode` informa o modo realmente utilizado.

`GET /api/v1/commits` aceita `repository_id`, `author`, `since`, `until` e `page`. `GET /api/v1/branches` aceita `repository_id` e `include_deleted=true`. `GET /api/v1/pull-requests` aceita `repository_id`, `state` e `author`.

## Webhooks, retry e replay

Cabeçalhos obrigatórios: `X-Hub-Signature-256`, `X-GitHub-Event` e `X-GitHub-Delivery`. O receptor identifica `payload.repository.id`, verifica HMAC-SHA256 com o segredo daquele repositório e persiste antes de enfileirar.

| Resposta | Significado |
| --- | --- |
| 202 `accepted` | autenticado e persistido; processamento ainda não terminou |
| 200 `ignored` | `X-GitHub-Delivery` duplicado |
| 400 | UUID, JSON ou repositório inválido/desconhecido |
| 401 | assinatura inválida ou segredo expirado |

O worker repete somente falhas transitórias de banco/rede, com backoff exponencial e jitter. Falhas permanentes ficam registradas como `failed`; o erro é sanitizado. O replay autenticado aceita somente esse estado, volta para `pending` e reaproveita a mesma entrega idempotente.

O cliente GitHub nunca dorme até o reset completo do rate limit. Ele respeita o teto `GITHUB_MAX_RETRY_AFTER` e propaga uma falha transitória para retry controlado.

## Operação e limites

- `GET /health` verifica processo/banco; `GET /health/readiness` verifica banco, Redis, worker e chave criptográfica. Em eager local, Redis/worker não bloqueiam readiness.
- Logs são JSON, incluem request/correlação e removem padrões de token/segredo.
- Webhooks são assíncronos; consulte `deliveries` até `processed` ou `failed`.
- Listas de commits, branches e PRs são paginadas em 50 itens; repositórios e as 15 entregas recentes não são paginados.
- O frontend oficial é servido na mesma origem do M2. Consumidores web em outra origem precisam de gateway/CORS acordado; backends podem usar o contrato diretamente.
- GraphQL foi retirado do MVP porque REST atende a jornada atual sem evidência de ganho que compense a complexidade.

## Dependências externas restantes

1. Módulo 1: equipes/papéis ainda não existem; hoje cada usuário acessa somente os próprios projetos.
2. Plataforma: gateway para origens diferentes e envelope de eventos/Data Bus.
3. Operação futura: migrar do modo eager atual para Redis + worker Celery quando houver infraestrutura compartilhada; health, readiness, criptografia e conectividade GitHub já estão ativos no App Service.
4. Consumidores: testes de contrato M2→M3/M4/M5/M6/M7/M8.

Consulte também [platform-integration-map.md](platform-integration-map.md), [poc-coverage.md](poc-coverage.md), [youtrack-status-review.md](youtrack-status-review.md) e [DEPLOYMENT.md](../DEPLOYMENT.md).
