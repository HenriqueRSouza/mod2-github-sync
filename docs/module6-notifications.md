# Integração com a Central de Notificações — Módulo 6

O Módulo 2 envia notificações de operação para a Central do Módulo 6 de forma
**opt-in, assíncrona e best-effort**. A integração não participa da transação de
sincronização nem do processamento do webhook: se o destino estiver indisponível,
o GitHub Sync continua funcionando e o envio é tentado novamente somente para
falhas transitórias.

## Configuração segura

Configure estas variáveis exclusivamente no ambiente do backend, por exemplo em
**Azure App Service > Configuration > Application settings**. Não inclua a chave
em commits, frontend, Swagger, logs ou tickets.

```dotenv
MODULE6_NOTIFICATIONS_ENABLED=true
MODULE6_NOTIFICATIONS_URL=https://software6-bff-2-cnbqhhgdcndzgwdx.chilecentral-01.azurewebsites.net/api/integrations/notifications
MODULE6_INTEGRATION_KEY=<chave-fornecida-pelo-modulo-6>
MODULE6_NOTIFICATIONS_TIMEOUT=5
```

Enquanto flag, URL ou chave estiverem ausentes, não há tráfego externo para o
Módulo 6. Isso é intencional para desenvolvimento local, testes e ambientes sem
a chave compartilhada.

## Eventos emitidos

| Tipo | Quando é emitido | Prioridade |
| --- | --- | --- |
| `github.sync.completed` | sincronização manual concluída | `medium` |
| `github.sync.failed` | sincronização manual falha | `high` |
| `github.webhook.failed` | processamento do webhook falha após os retries do M2 | `high` |

Não enviamos um evento para cada commit, push ou webhook bem-sucedido: isso
evita transformar a Central em um fluxo ruidoso. O estado detalhado continua
disponível nas APIs e na tela de monitoramento do Módulo 2.

## Envelope e segurança

O envelope segue o contrato do Módulo 6: `event_id`, `scope`, `project_id`,
`source`, `type`, `title`, `body`, `priority` e `link`. Quando o repositório
está ligado a um projeto do Módulo 1, usa `scope: project` e o UUID real do
projeto; nos registros legados sem projeto, usa `scope: global`.

O envio não contém PAT, segredo HMAC, payload de webhook, conteúdo de arquivos,
diffs, e-mails ou erro interno. A chave é enviada somente pelo backend no
header `X-Integration-Key`. Para erros de rede, HTTP 429 e HTTP 5xx há no
máximo três retries com backoff; erros HTTP 4xx não são repetidos.

## Validação conjunta

1. Crie um projeto real no Módulo 1 e conecte um repositório a ele no Módulo 2.
2. Configure as quatro variáveis no App Service e reinicie a aplicação.
3. Execute **Sincronizar agora** no Módulo 2.
4. Confirme na Central do Módulo 6 uma notificação `github.sync.completed` com
   o mesmo `project_id`.
5. Para validar a trilha de falha sem expor credenciais, use o ambiente de teste
   ou induza uma falha controlada de GitHub; não publique segredos no payload.

O contrato do Módulo 6 é um consumidor de notificações. Ele não substitui os
endpoints, a proveniência ou o isolamento de dados do Módulo 2.
