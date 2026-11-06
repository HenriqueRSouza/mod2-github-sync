# Fechamento interno do Módulo 2

Revisão de 27 de outubro de 2026. Este documento separa código concluído, prova local/remota e dependências externas.

## Concluído no repositório

| Área | Evidência implementada |
| --- | --- |
| Integração GitHub | handshake PAT, escopos mínimos configuráveis, cadastro, carga inicial e sincronização incremental de commits, branches, PRs e arquivos |
| Webhooks | HMAC por repositório, idempotência, processamento assíncrono, retry seletivo com jitter, estado final coerente e replay autenticado |
| Observabilidade | logs JSON, `X-Request-ID`, correlação pelo `delivery_id`, sanitização de segredos, liveness e readiness de banco/Redis/worker/crypto |
| Credenciais | AES-256-GCM, segredo exclusivo por repositório, versão, expiração, rotação e trilha de auditoria sem persistência de PAT |
| Inteligência | análise de frequência, concentração, picos, atividade fora da janela e clareza de mensagens; provedor externo é opt-in e recebe somente agregados |
| Consumidores | OpenAPI, conteúdo textual sob demanda, diff limitado e proveniência para M3/M4/M5/M7 |
| Autenticação M1 | cadastro/login/projetos por proxy same-origin; JWT RS256/JWKS; `issuer`, `audience`, expiração e claims obrigatórios; isolamento por `sub`/`project_id` |
| Frontend | sete tabs navegáveis, cadastro/login/logout, expiração de sessão, seleção/criação de projetos, jornada real, PAT efêmero em memória, Analytics/Inteligência reais e estados explícitos para o que não possui fonte |
| Qualidade | pytest/coverage, Ruff, Bandit, OpenAPI, lint/build/test do frontend e smoke de health após deploy |

## Não bloqueia o fechamento interno

Estes itens exigem infraestrutura, credenciais ou contrato de outro grupo. Permanecem como integração, não como código ausente do Módulo 2:

- manter a publicação Azure e o pipeline já verdes; a URL, o health, a readiness, a conectividade GitHub e o OpenAPI possuem evidência remota;
- migrar as tarefas do modo eager remoto para Redis + worker Celery somente quando houver infraestrutura compartilhada;
- incorporar equipes/RBAC quando o Módulo 1 publicar esses campos; o contrato atual é proprietário individual;
- acordar gateway, CORS e Data Bus com a turma;
- executar E2E compartilhado com os módulos consumidores.

## Decisões de escopo

- GraphQL foi retirado do MVP: REST atende a carga atual e não houve medição que justificasse a complexidade adicional. O ADR 0003 registra a decisão.
- A análise inteligente possui baseline determinístico auditável. Um provedor compatível com chat completions pode enriquecer somente recomendações agregadas quando `AI_INSIGHTS_ENABLED=true`.
- Login, cadastro e projetos permanecem como fonte de verdade do Módulo 1; o M2 fornece somente um proxy same-origin. PAT GitHub não é identidade da plataforma.

## Critério para declarar produção

O código está concluído, publicado e validado local/remotamente. CI, deploy, health, readiness, conectividade GitHub, interface e OpenAPI estão verdes. Para evidência operacional integral com dados reais, falta somente executar webhook/sync com um repositório controlado e credenciais de teste autorizadas.
