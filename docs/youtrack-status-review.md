# Status recomendado no YouTrack — Módulo 2

Revisão de 27 de outubro de 2026 baseada no código, nos testes locais e no pipeline remoto concluído com sucesso. A aplicação, o Swagger, o OpenAPI, o health, a readiness e a conectividade GitHub também foram verificados no App Service.

## Mover para Done

| Card | Justificativa |
| --- | --- |
| M2-79 | OpenAPI possui schemas explícitos e valida sem erros ou avisos. |
| M2-84 | PAT permanece efêmero; segredo de webhook possui versão, expiração e rotação. |
| M2-85 | URL base da API GitHub é configurável. |
| M2-86 | CA bundle customizado é aplicado pelo cliente. |
| M2-88 | handshake compara escopos exigidos/permitidos e informa ausentes/excedentes. |
| M2-89 | segredo é cifrado por AES-256-GCM antes da persistência. |
| M2-90 | chave mestre é obrigatória e validada pela readiness; ativação no secret manager remoto ainda requer evidência de deploy. |
| M2-91 | segredo possui expiração opcional e webhook expirado é recusado. |
| M2-92 | criação/rotação gera evento de auditoria sem registrar o segredo. |
| M2-95 | HMAC usa o segredo específico do repositório. |
| M2-97 | `IGNORE_BRANCHES` é aplicado no worker. |
| M2-98 | forced push é persistido. |
| M2-131 | endpoint de insights calcula clareza, frequência, padrões, gargalos e recomendações; enriquecimento por IA é opt-in. |
| M2-147 | logging JSON, correlação e sanitização possuem testes. |
| M2-150 | timeout, retry seletivo, jitter, limite de rate limit, estado final e replay possuem testes. |

Os 15 cartões que já estavam em Done permanecem em Done.

## Evidência remota e itens ainda externos

- URL Azure, banco, criptografia, OpenAPI, health, conectividade GitHub e smoke pós-deploy possuem evidência remota;
- Redis e worker Celery não são exigidos no App Service atual porque as tarefas executam em modo eager; cartões que exijam processamento distribuído devem aguardar essa infraestrutura;
- aceite que exija webhook real enviado pelo GitHub ainda depende de um repositório controlado e de seu segredo HMAC;
- integração institucional de login/JWT/RBAC não deve ser atribuída ao Módulo 2;
- cards de gateway/Data Bus ou E2E entre módulos dependem de acordo da turma.

## Login e cadastro

Este serviço não é a fonte de verdade de usuários. O frontend do Módulo 2 já oferece cadastro, login, consulta do usuário e seleção/criação de projetos por um proxy same-origin para o Módulo 1. O Bearer é validado por RS256/JWKS e permanece somente na sessão da aba. Recuperação de conta, equipes, papéis e associação por função continuam pertencendo ao Módulo 1.
