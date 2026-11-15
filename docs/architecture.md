# Arquitetura inicial

```mermaid
flowchart LR
    GH[GitHub REST API] -->|Webhook HMAC| API[Django REST API]
    API -->|Sincronização REST| GH
    M1[M1 Auth / Projects] -->|JWT RS256 + project_id via API| API
    Consumer[Frontend / outros modulos] -->|Bearer JWT| API
    API --> PG[(PostgreSQL)]
    API -->|Delivery| Redis[(Redis)]
    Redis --> Worker[Celery Worker]
    Worker --> PG
    API --> Docs[OpenAPI / Swagger]
```

## Portas e responsabilidades

| Porta | Adaptador | Responsabilidade |
| --- | --- | --- |
| Entrada HTTP | Django REST Framework | Webhooks, consultas, health e documentacao |
| Saida GitHub | `GitHubClient` | REST, timeout, CA customizada e rate limit |
| Persistencia | Django ORM / PostgreSQL | Repositorios, commits, PRs e entregas |
| Mensageria | Celery / Redis | Processamento assincrono e retry |
| Segredos | Variavel injetada em runtime | Chave mestre de AES-256-GCM |

## Fronteiras

O modulo indexa dados do GitHub e fornece fatos e metricas. Identidade institucional e gestao de projetos pertencem ao Módulo 1 e são consumidas pelo Módulo 2 por proxy/API. A SPA deste repositório é a interface específica do GitHub Sync; portal central, chatbot e relatórios corporativos pertencem a outros módulos. A IA opcional deve consumir somente agregados e produzir recomendações sem alterar o histórico bruto.

## Riscos iniciais

| Risco | Mitigacao |
| --- | --- |
| Indisponibilidade do GitHub | Timeout, retry com backoff e health de conectividade |
| Rate limit | Inspecao dos headers e sincronizacao incremental |
| Webhook duplicado | Restricao unica em `X-GitHub-Delivery` |
| Webhook forjado | HMAC SHA-256 com segredo individual por repositorio |
| Vazamento de credencial | AES-256-GCM e chave mestre somente em runtime |
| Perda de evento | Persistencia da entrega antes do enfileiramento e reconciliacao futura |
| Identidade duplicada | Multiplos emails vinculados ao mesmo colaborador |

## Evoluções pós-MVP

Os itens abaixo são oportunidades futuras e não fazem parte do recorte funcional concluído:

- Avaliar GitHub App como mecanismo principal; PAT deve ser apenas opcao de desenvolvimento.
- Introduzir DLQ operacional e reconciliacao periodica antes da primeira integracao real.
- Automatizar testes de contrato com os módulos consumidores a partir do OpenAPI publicado.
- Separar analytics/IA do pipeline de ingestao para preservar latencia do SLA de dois minutos.
