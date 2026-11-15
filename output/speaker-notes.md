# AP1 — Módulo 2 — Roteiro Oficial e Notas dos Oradores

Tempo total estimado: **8min55s** (dentro da janela exigida de 5 a 10 minutos).  
Distribuição de falas equilibrada e alinhada aos papéis oficiais da equipe:
- **Eduardo Ferreira de Mattos** (Scrum Master & Dev): Slides 01 ao 07 — ~3m35s
- **Henrique Ribeiro** (Product Owner & Dev): Slides 08 ao 12 — ~2m20s
- **Pedro Cavalcante** (Desenvolvedor): Slides 13 ao 20 — ~3m00s

---

## Slide 01 — Capa: Módulo 2 — Integração e Sincronização com GitHub
- **Orador:** Eduardo Ferreira de Mattos (Scrum Master & Dev)
- **Tempo sugerido:** 00:25 (Acumulado: 00:25)
- **Mensagem principal:** Posicionar a equipe (Eduardo, Henrique, Pedro) e a missão do Módulo 2 na plataforma.
- **Roteiro sugerido:**  
  "Boa tarde, professor e colegas. Somos o Pedro Cavalcante, o Henrique Ribeiro e eu, Eduardo Ferreira. Nosso grupo é responsável pelo Módulo 2: Integração e Sincronização com GitHub. A missão do nosso serviço é ser a ponte entre a atividade prática dos desenvolvedores nos repositórios e a camada de inteligência da plataforma de Engenharia de Software."

---

## Slide 02 — Papel do Módulo: O Núcleo de Dados Git da Plataforma
- **Orador:** Eduardo Ferreira de Mattos (Scrum Master & Dev)
- **Tempo sugerido:** 00:30 (Acumulado: 00:55)
- **Mensagem principal:** Explicar como o microsserviço isola as complexidades da API externa do GitHub e abastece a plataforma com dados confiáveis.
- **Roteiro sugerido:**  
  "O GitHub concentra todos os sinais vitais do desenvolvimento: commits, branches, pull requests e webhooks. O papel do nosso microsserviço é capturar esses sinais brutos, validar a integridade criptográfica, normalizar e sincronizar esses dados para que os módulos de Métricas de Fluxo, Governança e Agentes de IA consultem informações estruturadas e auditáveis."

---

## Slide 03 — Escopo Técnico e 8 Capacidades Centrais
- **Orador:** Eduardo Ferreira de Mattos (Scrum Master & Dev)
- **Tempo sugerido:** 00:30 (Acumulado: 01:25)
- **Mensagem principal:** Apresentar as 8 capacidades técnicas entregues e a fundação de resiliência e boas práticas de engenharia.
- **Roteiro sugerido:**  
  "Tecnicamente, o escopo cobre conectividade REST e GraphQL com autenticação via tokens PAT, recepção de webhooks com validação criptográfica HMAC, persistência relacional normalizada e sincronização incremental com suporte a paginação e parâmetros 'since'. Tudo isso é sustentado por idempotência contra eventos duplicados, resiliência com recuo exponencial e documentação interativa via OpenAPI/Swagger."

---

## Slide 04 — Perfis de Usuário: 3 Perspectivas de Decisão
- **Orador:** Eduardo Ferreira de Mattos (Scrum Master & Dev)
- **Tempo sugerido:** 00:25 (Acumulado: 01:50)
- **Mensagem principal:** Demonstrar que o mesmo dado Git atende às necessidades estratégicas do PO, SM e Dev.
- **Roteiro sugerido:**  
  "Mapeamos três personas centrais: o Desenvolvedor ou Aluno, que gera a atividade diária no Git; o Product Owner, que acompanha o ritmo de entrega e o valor gerado nas histórias; e o Scrum Master ou Gerente de Projetos, focado no fluxo, dependências e gargalos na esteira. O mesmo dado atende a decisões estratégicas distintas. Nos próximos três slides, detalhamos o Value Proposition Canvas de cada uma dessas personas."

---

## Slide 05 — Customer Profile: Desenvolvedor / Aluno (Segmento Primário)
- **Orador:** Eduardo Ferreira de Mattos (Scrum Master & Dev)
- **Tempo sugerido:** 00:25 (Acumulado: 02:15)
- **Mensagem principal:** Analisar as tarefas, dores e ganhos do perfil técnico que utiliza o GitHub no dia a dia.
- **Roteiro sugerido:**  
  "Aprofundando no Value Proposition Canvas, nosso segmento primário é o Desenvolvedor ou Aluno. Ele utiliza o GitHub diariamente. Suas tarefas centrais são conectar o repositório correto, manter commits e Pull Requests sincronizados e receber feedbacks ágeis. Suas principais dores são falhas de sincronização difíceis de diagnosticar, risco de vazamento de credenciais e rate limits da API. O Módulo 2 responde entregando sincronização transparente quase em tempo real, governança de tokens e sugestões de IA explicáveis com evidências."

---

## Slide 06 — Customer Profile: Product Owner (Segmento Secundário)
- **Orador:** Eduardo Ferreira de Mattos (Scrum Master & Dev)
- **Tempo sugerido:** 00:25 (Acumulado: 02:40)
- **Mensagem principal:** Apresentar a visão executiva de valor de negócio sem a sobrecarga de jargões técnicos de Git.
- **Roteiro sugerido:**  
  "Para o Product Owner, nosso segmento secundário, o foco é entrega de valor de negócio. Ele precisa saber se o código desenvolvido corresponde às Histórias de Usuário e critérios de aceite da sprint. Sua maior dor é o excesso de jargões técnicos de Git e o receio de que alucinações de IA ou indisponibilidades do GitHub afetem a tomada de decisão. O Módulo 2 atende essa persona com resumos objetivos, rastreabilidade por história e isolamento arquitetural para a plataforma."

---

## Slide 07 — Customer Profile: Gerente / Scrum Master (Segmento Secundário)
- **Orador:** Eduardo Ferreira de Mattos (Scrum Master & Dev)
- **Tempo sugerido:** 00:25 (Acumulado: 03:05)
- **Mensagem principal:** Explicar a necessidade de métricas de fluxo contínuo e diagnóstico antecipado de bloqueios para ritos ágeis.
- **Roteiro sugerido:**  
  "Para o Scrum Master e Gerente de Projetos, o Canvas evidencia a necessidade de fluxo contínuo. Suas tarefas envolvem acompanhar o ritmo da equipe, apoiar reuniões diárias e retrospectivas e identificar bloqueios antes que afetem o prazo da sprint. Suas dores são dados brutos dispersos sem síntese gerencial e Pull Requests parados sem alerta. Nosso microsserviço entrega alertas proativos de gargalos, métricas de ciclo de revisão e histórico consolidado. Com isso, passo a palavra ao Henrique para detalhar nosso Backlog no YouTrack."

---

## Slide 08 — Do Escopo ao Backlog Estruturado no YouTrack
- **Orador:** Henrique Ribeiro (Product Owner & Dev)
- **Tempo sugerido:** 00:30 (Acumulado: 03:35)
- **Mensagem principal:** Explicar a hierarquia Épico → Funcionalidade → História de Usuário (~100 histórias mapeando o ciclo de vida do produto).
- **Roteiro sugerido:**  
  "Assumindo a apresentação, para transformar esse escopo e as necessidades das personas em trabalho executável, estruturamos o backlog no YouTrack seguindo a hierarquia Épico, Funcionalidade e História de Usuário. Definimos sete Épicos — desde planejamento e fundação até observabilidade e release —, cobrindo cerca de cem Histórias. É fundamental frisar que essas cem histórias mapeiam o universo do produto, e não itens para implementação simultânea."

---

## Slide 09 — Cronograma e Linha do Tempo no YouTrack (Gantt)
- **Orador:** Henrique Ribeiro (Product Owner & Dev)
- **Tempo sugerido:** 00:30 (Acumulado: 04:05)
- **Mensagem principal:** Situar a linha do tempo de 11 semanas (28/AGO a 12/NOV) e a progressão em quatro ondas bem delineadas.
- **Roteiro sugerido:**  
  "Nosso cronograma temporal vai de 28 de agosto a 12 de novembro, totalizando aproximadamente onze semanas. Ele está dividido em ondas bem definidas: iniciamos com planejamento e fundação da conectividade GitHub, avançamos para o processamento de webhooks e persistência, e na sequência consolidamos os endpoints de métricas, integração com IA e estabilização final."

---

## Slide 10 — Trilha Funcional Ponta a Ponta Priorizada
- **Orador:** Henrique Ribeiro (Product Owner & Dev)
- **Tempo sugerido:** 00:30 (Acumulado: 04:35)
- **Mensagem principal:** Explicar a decisão de engenharia de selecionar uma fatia vertical executável em vez de tentar implementar 100 histórias simultâneas.
- **Roteiro sugerido:**  
  "Com cem histórias no backlog, nossa estratégia de engenharia foi priorizar uma trilha funcional de ponta a ponta. Selecionamos as histórias essenciais que garantem um fluxo vivo: conexão com a API do GitHub, endpoint de webhook, validação HMAC, processamento de commits de push, controle de idempotência, persistência e APIs de consulta. Em paralelo, sustentamos essa trilha com Docker, CI/CD e testes automatizados."

---

## Slide 11 — Metodologia Ágil • Scrum Framework (Miro)
- **Orador:** Henrique Ribeiro (Product Owner & Dev)
- **Tempo sugerido:** 00:30 (Acumulado: 05:05)
- **Mensagem principal:** Apresentar a estrutura formal do Scrum desenhada no Miro com papéis definidos e horários de ritos.
- **Roteiro sugerido:**  
  "Na gestão ágil, estruturamos nosso fluxo formal de Scrum documentado no Miro. Eu atuo como Product Owner, priorizando o valor das entregas; o Eduardo é nosso Scrum Master, garantindo a cadência e remoção de impedimentos; e nós três atuamos como time de desenvolvimento. Nossos ritos têm horários rígidos: Sprint Planning aos sábados às 15h, Daily Scrum diária de 10 minutos das 21h às 21h10, e Sprint Review e Retrospectiva às terças das 15h às 15h15."

---

## Slide 12 — Gestão do Fluxo • Quadro Kanban no YouTrack
- **Orador:** Henrique Ribeiro (Product Owner & Dev)
- **Tempo sugerido:** 00:25 (Acumulado: 05:30)
- **Mensagem principal:** Explicar o quadro Kanban no YouTrack e destacar a evidência de trabalho em andamento com a história M2-81 em Doing.
- **Roteiro sugerido:**  
  "Complementando o Scrum, usamos o Kanban para tornar visível o fluxo diário de tarefas: Backlog, To-Do, Doing e Done. Como evidência de execução real, temos atualmente na coluna Doing a história M2-81, cujo objetivo é criar o endpoint de verificação de saúde da conectividade com o GitHub, medindo latência e disponibilidade da API. Agora, passo a palavra para o Pedro apresentar nosso protótipo do Figma."

---

## Slide 13 — Protótipo Figma: 01. Painel Operacional e Confiabilidade
- **Orador:** Pedro Cavalcante (Desenvolvedor)
- **Tempo sugerido:** 00:25 (Acumulado: 05:55)
- **Mensagem principal:** Apresentar a visão geral da integração e reforçar honestamente que as telas são protótipos de interface, e não o MVP codificado.
- **Roteiro sugerido:**  
  "Assumindo a apresentação das telas conceituais, desenhamos no Figma a experiência completa do Módulo 2. Esta primeira tela é a visão geral da integração: traz indicadores de confiabilidade de 99,4%, cobertura de repositórios mapeados e a esteira visual de processamento em cinco etapas — desde a chegada do webhook até a reconciliação do catálogo, com suporte a diagnóstico e reexecução de falhas."

---

## Slide 14 — Protótipo Figma: 02. Conectividade e Governança de Tokens
- **Orador:** Pedro Cavalcante (Desenvolvedor)
- **Tempo sugerido:** 00:25 (Acumulado: 06:20)
- **Mensagem principal:** Detalhar a gestão de tokens PAT, princípio do menor privilégio em escopos e monitor de rate limit da API.
- **Roteiro sugerido:**  
  "Na tela de conectividade, modelamos a governança de credenciais. A plataforma permite cadastrar e testar tokens PAT, visualizando escopos concedidos, taxa de requisições por hora e alertas automáticos de expiração para garantir que o serviço nunca fique sem acesso por token revogado."

---

## Slide 15 — Protótipo Figma: 03. Webhooks em Tempo Real e Validação HMAC
- **Orador:** Pedro Cavalcante (Desenvolvedor)
- **Tempo sugerido:** 00:25 (Acumulado: 06:45)
- **Mensagem principal:** Explicar a esteira de eventos assíncronos, verificação de integridade via HMAC-SHA256 e inspeção do payload JSON.
- **Roteiro sugerido:**  
  "A tela de webhooks em tempo real monitora a chegada de eventos de push e pull request, confirma visualmente a validação da assinatura HMAC-SHA256 e disponibiliza a inspeção completa do payload JSON recebido, facilitando o rastreio e debug de eventos."

---

## Slide 16 — Protótipo Figma: 04. Indexação e Sincronização Incremental
- **Orador:** Pedro Cavalcante (Desenvolvedor)
- **Tempo sugerido:** 00:25 (Acumulado: 07:10)
- **Mensagem principal:** Mostrar o tratamento de histórico inicial versus delta incremental e a amarração da identidade Git com o TIA do aluno.
- **Roteiro sugerido:**  
  "A tela de indexação cuida do ciclo de vida dos dados. Nela separamos a importação do histórico completo de commits da sincronização delta incremental. Além disso, incluímos a reconciliação de contribuidores, permitindo vincular o autor de um commit no GitHub ao aluno ou desenvolvedor cadastrado na universidade."

---

## Slide 17 — Protótipo Figma: 05. Inteligência de Fluxo e Métricas Git
- **Orador:** Pedro Cavalcante (Desenvolvedor)
- **Tempo sugerido:** 00:25 (Acumulado: 07:35)
- **Mensagem principal:** Destacar que as métricas focam na saúde do processo e desobstrução de gargalos, e nunca em ranqueamento individual punitivo.
- **Roteiro sugerido:**  
  "Com os dados consolidados, a tela de métricas apresenta indicadores de fluxo: tempo de ciclo de pull requests, taxa de merge e tempo de espera em revisão. O foco é estritamente identificar gargalos sistêmicos e bloqueios no fluxo de trabalho, sem transformar métricas em ranqueamento individual de alunos."

---

## Slide 18 — Protótipo Figma: 06. Assistente de IA com Supervisão Humana
- **Orador:** Pedro Cavalcante (Desenvolvedor)
- **Tempo sugerido:** 00:25 (Acumulado: 08:00)
- **Mensagem principal:** Demonstrar o valor dos agentes de IA no suporte à escrita de commits e resumos de sprint, sob controle estrito de Human-in-the-Loop.
- **Roteiro sugerido:**  
  "Na camada de inteligência, o protótipo contempla o assistente de IA. Ele auxilia na geração de resumos semanais de atividade, changelogs e análise da clareza semântica de mensagens de commit. Adotamos o princípio de supervisão humana obrigatória: nenhuma sugestão de IA é publicada sem revisão e auditoria explícita."

---

## Slide 19 — Protótipo Figma: 07. DevOps, Qualidade e Governança
- **Orador:** Pedro Cavalcante (Desenvolvedor)
- **Tempo sugerido:** 00:25 (Acumulado: 08:25)
- **Mensagem principal:** Explicar a esteira de engenharia profissional que sustenta o microsserviço: CI/CD no GitHub Actions, Docker e Swagger.
- **Roteiro sugerido:**  
  "Por fim, a tela de DevOps e Governança reúne os pilares de qualidade: pipeline de CI/CD via GitHub Actions, empacotamento em containers Docker multi-estágio, testes automatizados e monitoramento de integridade com logging estruturado e documentação via Swagger."

---

## Slide 20 — Conclusão: Estado Atual e Próximos Passos
- **Orador:** Pedro Cavalcante (Desenvolvedor) / Equipe
- **Tempo sugerido:** 00:30 (Acumulado: 08:55)
- **Mensagem principal:** Fechar com transparência e honestidade técnica: planejamento validado, protótipo pronto, código em andamento rumo à primeira entrega funcional.
- **Roteiro sugerido:**  
  "Para concluir: já temos 100% estruturados o escopo, os perfis, os canvas de valor, o backlog decomposto, o cronograma, os ritos do Scrum, o fluxo no Kanban e a prototipação completa no Figma. É fundamental ressaltar que as telas de Figma apresentadas são protótipos de interface, e não o MVP em código. Nosso próximo passo imediato é a implementação técnica da trilha ponta a ponta, iniciando pela história em execução, rumo à primeira entrega funcional. Muito obrigado a todos!"
