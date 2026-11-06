# Cobertura das POCs no frontend

Este inventário separa o que é uma jornada funcional do Módulo 2, o que é demonstração local e o que ainda depende de contrato com outro módulo. A referência visual são as sete telas da POC/Figma armazenadas em `assets/figma/`.

## Comportamento padrão

- `/` é a página institucional mínima, com entrada para o módulo e links para a documentação.
- `/app` abre o acesso da plataforma e, após login e seleção de projeto do Módulo 1, a jornada principal do GitHub Sync.
- `/legacy` preserva a entrega anterior.
- A navegação padrão mostra as sete áreas da POC. Analytics e Inteligência Git consomem o endpoint real de insights; DevOps abre um estado honesto de **em desenvolvimento**.
- As prévias fictícias estão desativadas por constantes de código e não podem ser habilitadas por variável de ambiente no `/app`; os grandes rascunhos sem backend foram removidos e permanecem recuperáveis pelo histórico Git.
- `VITE_SHOW_PLATFORM_SHELL=true` exibe o shell visual dos demais módulos. Ele fica oculto por padrão porque ainda não há rotas integradas da plataforma.

## Matriz das sete telas

| POC | Estado padrão | Dados/ações reais | Conteúdo mantido como ideação | USs relacionadas |
| --- | --- | --- | --- | --- |
| 07 — Visão geral | Visível | saúde do banco, conectividade GitHub, repositórios, commits, métricas de autores e sincronização manual | taxa de sucesso, pipeline, throughput e diagnóstico de fila | M2-81, M2-107, M2-108, M2-111, M2-114, M2-118 |
| 08 — Autenticação | Visível | handshake, escopos mínimos/excedentes e PAT efêmero reutilizado somente na sessão | GitHub App e cofre institucional dependem de decisão externa | M2-83, M2-84, M2-85, M2-88 a M2-92 |
| 09 — Webhooks | Visível | lista persistida, polling pausável, filtros, detalhe, HMAC, simulador, retry e replay operacional | KPIs externos de broker ficam fora da UI enquanto não houver fonte | M2-93, M2-94, M2-96, M2-104, M2-147, M2-150, M2-169 |
| 10 — Sincronização | Visível | sincronização REST de branches, commits, arquivos e PRs; contagens, autores Git, busca e exportação local | progresso histórico, GraphQL, delta/ETag e vínculo acadêmico automático | M2-107, M2-108, M2-111, M2-114, M2-118 |
| 11 — Analytics | Funcional | frequência, concentração, atividade fora de horário, picos e gargalos calculados sobre commits reais | métricas de produtividade individual continuam proibidas | E4 Analytics |
| 12 — Inteligência Git | Funcional | clareza auditável, gargalos e recomendações; provedor externo opcional recebe agregados | chat e geração de PR não pertencem ao recorte entregue | M2-131 |
| 13 — DevOps | Visível como “em desenvolvimento” | links reais para `/docs/` e `/api/schema/`; CI/deployment versionados | release, deploy, cobertura e changelog só voltarão com fonte verificável | M2-139, M2-141, M2-166, M2-167 |

## Jornada demonstrável de ponta a ponta

1. Abrir `/app`, cadastrar ou autenticar a conta pelo proxy do Módulo 1 e selecionar/criar um projeto.
2. Cadastrar um repositório GitHub vinculado ao `project_id`, com segredo de webhook exclusivo de pelo menos 16 caracteres.
3. Se necessário, validar um PAT na aba Autenticação. Após validação ele fica somente na memória da sessão para sincronizações do repositório selecionado.
4. Sincronizar o repositório e consultar commits/autores indexados.
5. Configurar no GitHub o mesmo segredo e a URL pública `POST /webhooks/github`.
6. Receber um evento real ou usar o simulador com o segredo digitado novamente.
7. Confirmar a entrega e o commit nas abas Webhooks e Indexação e revisar Analytics/Inteligência Git.

## Limites honestos do frontend

- O Módulo 2 não é a fonte de verdade de usuários: a interface oferece cadastro/login pelo proxy same-origin do Módulo 1 e mantém o Bearer somente na sessão da aba.
- Exportações de JSON/CSV, cópia para clipboard e rascunhos das telas de ideação são ações locais do navegador.
- Um `202 Accepted` no webhook confirma recepção, não conclusão do worker; o estado final deve ser consultado em `webhooks/deliveries`.
- Nas áreas conectadas, a interface não completa lacunas do contrato com autores, horários, payloads, headers ou estados inventados. Campos ausentes aparecem como **Não informado**, **Não exposto** ou **Indisponível**.
- A interface limpa o segredo do webhook ao fechar/concluir o modal; o PAT nunca é persistido em storage ou banco.
- O projeto é validado no Módulo 1; o vínculo entre identidade Git e aluno/equipe ainda depende dos campos de equipe/RBAC que o Módulo 1 não publicou.

## Próximas integrações de frontend

1. Incorporar turma, equipe e papéis quando o Módulo 1 publicar esses campos; identidade e projeto já são consumidos.
2. Trocar polling de entregas por contrato de eventos/gateway quando a turma definir o Data Bus.
3. Conectar a tab DevOps a uma fonte autenticada de CI/deploy antes de exibir status remotos.
