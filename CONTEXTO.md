# AP1 — Engenharia de Software 2026.2

## Grupo
- Pedro Cavalcante — 10437298
- Henrique Ribeiro — 10401770
- Eduardo Ferreira de Mattos — 10402800

## Projeto
Plataforma de Assistente Inteligente de Engenharia de Software, desenvolvida pela turma em arquitetura de microsserviços com IA Generativa/Agêntica.

## Nosso módulo
**Módulo 2 — Integração e Sincronização com GitHub**

Objetivo: integrar a plataforma ao GitHub, transformar eventos e dados dos repositórios em informações estruturadas e disponibilizá-las para os demais módulos.

## Escopo oficial
- conectividade com GitHub via REST/GraphQL;
- autenticação/conexão;
- recepção e tratamento de Webhooks;
- commits, branches e Pull Requests;
- indexação e sincronização de repositórios;
- análise de frequência e padrões de commits;
- identificação de possíveis gargalos;
- recomendações/insights com IA.

## Perfis de usuário
1. Product Owner (PO)
2. Gerente de Projetos / Scrum Master
3. Desenvolvedor / Aluno

## Estrutura do backlog
No YouTrack, o backlog foi organizado em:

**Epic → Feature → User Story**

Principais Epics:
- E0 — Planejamento, Requisitos e Gestão do Projeto
- E1 — Fundação e Conectividade GitHub
- E2 — Webhooks e Processamento de Eventos GitHub
- E3 — Indexação, Persistência e Sincronização de Repositórios
- E4 — IA, Analytics e Inteligência sobre o Fluxo Git
- E5 — Qualidade, DevOps, CI/CD e Observabilidade
- E6 — Arquitetura, Integração, Hardening e Release Final

Foram levantadas aproximadamente 100 User Stories. O objetivo não é implementar todas de uma vez; o grupo priorizou uma trilha funcional end-to-end.

## Kanban atual
Fluxo:

**Backlog → To-Do → Doing → Done**

- Backlog: universo planejado.
- To-Do: User Stories prioritárias selecionadas para desenvolvimento.
- Doing: história efetivamente em implementação.
- Done: histórias concluídas.

Observação: as screenshots atuais ainda podem exibir Epics/Features no Backlog. Para a apresentação, use o board como evidência do processo, mas enfatize To-Do/Doing e a priorização de User Stories. Se houver tempo, substitua o asset do Kanban por um print final filtrado apenas para User Stories.

## Status Atual do Projeto e Entregas (MVP)

### 1. Unificação de Código e Repositórios
- Repositório oficial: `EduardoFdeM/ai-platform-github-service`.
- Repositório absorvido e integrado: `HenriqueRSouza/mod2-github-sync` (histórico de commits e branches unificados na `main`).
- Registro de absorção: `absorb.lock` na raiz.

### 2. Status das User Stories no YouTrack
- **Concluídas (Done):**
  - M2-81 (US1.2.018): Healthcheck e latência de conectividade com GitHub.
  - M2-83 (US1.3.009): Handshake de autenticação (`POST /api/v1/github/handshake`) validando PAT e escopos OAuth sem persistência.
  - M2-93 (US2.1.019): Endpoint `POST /api/v1/github/webhooks`.
  - M2-94 (US2.1.020): Validação de assinatura HMAC-SHA256 (`X-Hub-Signature-256`).
  - M2-96 (US2.2.021): Processamento e extração de commits em eventos `push`.
  - M2-104 (US2.5.025): Idempotência e deduplicação via `X-GitHub-Delivery`.
  - M2-107 (US3.1.030): Modelos relacionais (`Repository`, `Commit`, `WebhookDelivery`).
  - M2-108 (US3.1.031): Cadastro e conexão de repositórios via API e interface SPA.
  - M2-111 (US3.2.030): Carga inicial de commits via API REST do GitHub.
  - M2-114 (US3.3.031): Sincronização incremental de commits e autores reais.
  - M2-118 (US3.5.052): Endpoints de commits e métricas de fluxo.
  - M2-139 / M2-141: Dockerfile multi-stage e pipeline de CI no GitHub Actions.
  - M2-147 / M2-150: Logging estruturado e resiliência com retries.
  - M2-166 / M2-167: Documentação Swagger e `DEPLOYMENT.md`.
  - M2-169 (US097): Teste e simulador E2E do fluxo completo de webhooks e commits.
  - M2-79 / M2-84 a M2-92 / M2-95 / M2-97 / M2-98: OpenAPI, credenciais, escopos, criptografia, expiração, auditoria, HMAC por repositório, branches ignoradas e forced push.
  - M2-131: análise de clareza/frequência/padrões, gargalos e recomendações; IA externa opcional recebe somente agregados.

### 3. Frontend SPA (Design System Módulo 6)
- Localização: `/frontend` (React + Vite + TypeScript).
- Estilização: Integrada com os design tokens oficiais (`tokens.css` do Módulo 6) e ícones Lucide.
- Recursos implementados:
  - Header com status do banco e latência do GitHub em tempo real.
  - Conexão e sincronização real de repositórios do GitHub com 1 clique.
  - Handshake interativo de PAT com avatar e escopos.
  - Painel de métricas KPI e distribuição real de commits por desenvolvedor.
  - Simulador interativo de Webhook E2E com cálculo de HMAC-SHA256 no client e feed de eventos em tempo real.
  - Sete tabs da POC navegáveis; Analytics e Inteligência Git consomem dados reais, e DevOps declara “em desenvolvimento” sem inventar status.
  - PAT mantido somente na memória da sessão e segredos removidos dos formulários ao fechar/concluir.
- Comando de dados demonstrativos: `python manage.py seed_demo_data`.

### 4. Infraestrutura e Nuvem (Azure)
- Provedor: Microsoft Azure (Assinatura Azure for Students).
- Recurso: Máquina Virtual Linux (`Standard_D2als_v7` ou `Standard_D2as_v7`, 2 vCPUs).
- Região: `East US` (Leste dos EUA).
- Usuário SSH: `azureuser` (chave privada `.pem`).
- IP Público dinâmico/estático provisionado.
- Proteção de custos: Auto-shutdown ativo às 22:00/23:00 (UTC-03:00) para preservar o saldo de créditos (R$ 521,94).
- Orquestração: Docker Compose v2 (`compose.yaml`) executando Django (Gunicorn), Celery Worker, Redis e PostgreSQL.

## Fechamento e dependências externas

O escopo interno do Módulo 2 está concluído no código. Permanecem fora do controle exclusivo do grupo:

1. publicar a versão atual, executar migrações e registrar CI/readiness/webhook real no ambiente remoto;
2. receber do Módulo 1 o contrato de login, JWT, papéis e associação projeto/equipe/repositório;
3. acordar gateway, CORS e Data Bus e executar testes de contrato com os módulos consumidores;
4. gravar o vídeo final usando somente estados verificáveis do ambiente escolhido.

GraphQL foi retirado do MVP por decisão arquitetural: REST cobre a jornada atual e não houve benchmark que justificasse uma segunda superfície de integração.

