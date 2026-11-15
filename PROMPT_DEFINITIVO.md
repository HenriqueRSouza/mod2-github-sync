# PROMPT DEFINITIVO — AP1 Engenharia de Software

Crie uma apresentação profissional em PowerPoint para a **AP1 — Apresentação Parcial dos Projetos** da disciplina de Engenharia de Software da Universidade Presbiteriana Mackenzie.

## Antes de criar qualquer slide
Leia integralmente:
1. `CONTEXTO.md`
2. todos os documentos em `references/`
3. todas as imagens em `assets/`

As referências oficiais são a fonte de verdade. Não invente dados, entregas, funcionalidades ou decisões que não estejam suportadas pelos arquivos.

## Entregáveis
Gerar:
- `output/AP1_Modulo2_GitHub.pptx`
- `output/speaker-notes.md`

Se a ferramenta permitir sem perda de qualidade, gerar também:
- `output/AP1_Modulo2_GitHub.pdf`

## Objetivo da apresentação
Esta é uma **apresentação parcial**, não uma apresentação final e não uma documentação técnica completa.

Ela deve demonstrar de forma clara o que o grupo já produziu até agora:
- integrantes;
- módulo;
- escopo;
- perfis de usuário;
- User Stories;
- backlog;
- cronograma;
- Scrum/Kanban;
- priorização;
- protótipo Figma, se os assets já estiverem presentes.

Tempo total: **5 a 10 minutos**. Planejar o deck para aproximadamente **7 minutos**.

## Grupo
- Pedro Cavalcante — 10437298
- Henrique Ribeiro — 10401770
- Eduardo Ferreira de Mattos — 10402800

## Projeto
Plataforma de Assistente Inteligente de Engenharia de Software.

Nosso grupo é responsável pelo:

**Módulo 2 — Integração e Sincronização com GitHub**

## Narrativa central
A apresentação deve responder, nesta ordem:
1. O que é a plataforma?
2. Onde o Módulo 2 entra?
3. O que exatamente ele faz?
4. Quem utiliza/depende desse módulo?
5. Como o escopo virou backlog?
6. Como organizamos Epic → Feature → User Story?
7. O que foi priorizado para implementação?
8. Como planejamos a execução no tempo?
9. Como controlamos o trabalho com Kanban?
10. Como a experiência foi prototipada?
11. Qual é o estado atual e o próximo passo?

# Estrutura do deck

## Slide 1 — Capa
Título:
**Módulo 2 — Integração e Sincronização com GitHub**

Subtítulo:
Assistente Inteligente de Engenharia de Software

Engenharia de Software — 2026.2

Integrantes:
- Pedro Cavalcante
- Henrique Ribeiro
- Eduardo Ferreira de Mattos

Visual limpo, técnico e forte.

## Slide 2 — Papel do Módulo 2 na plataforma
Explicar em linguagem simples:

**O Módulo 2 é a ponte entre a atividade real dos desenvolvedores no GitHub e a inteligência da plataforma.**

Criar diagrama visual:

GitHub → Módulo 2 → demais microsserviços/plataforma

Mostrar que o módulo recebe dados/eventos, estrutura, sincroniza e disponibiliza informações para outros serviços.

Não transformar o slide em aula de microsserviços.

## Slide 3 — Escopo técnico
Criar fluxo visual compacto:

GitHub API / REST / GraphQL
→ autenticação
→ repositories / branches / commits / PRs
→ Webhooks
→ persistência/indexação
→ sincronização
→ analytics
→ IA
→ APIs para outros módulos

Usar pouco texto e ícones/diagrama.

## Slide 4 — Perfis de usuário
Mostrar os 3 perfis oficiais:
- Product Owner
- Gerente de Projetos / Scrum Master
- Desenvolvedor / Aluno

Resumir em uma frase o interesse de cada perfil no Módulo 2.

Se houver asset de Miro/perfis, usá-lo como evidência. Caso não exista, criar cards visuais simples sem inventar informações além das referências.

## Slide 5 — Do escopo ao backlog
Apresentar a estrutura usada no YouTrack:

**Epic → Feature → User Story**

Destacar:
- 7 grandes Epics (E0–E6);
- aproximadamente 100 User Stories levantadas;
- o backlog descreve o universo do produto, não o que será implementado simultaneamente.

Usar `assets/02-gantt-hierarquia.png` como evidência visual.

Não tentar mostrar todas as 100 USs.

## Slide 6 — Roadmap e cronograma
Usar `assets/01-gantt-overview.png`.

Destacar visualmente:
- 28/08/2026 → 12/11/2026
- aproximadamente 11 semanas

Resumir os blocos:
- E0 Planejamento
- E1 Fundação GitHub
- E2 Webhooks
- E3 Persistência/Sincronização
- E4 IA/Analytics
- E5 DevOps/Observabilidade
- E6 Integração/Release

Não exibir dezenas de tarefas em texto.

## Slide 7 — Priorização: da centena de USs para uma trilha funcional
Este é um dos slides mais importantes.

Explicar que o grupo não pretende implementar todas as histórias de uma vez. Foi escolhida uma trilha funcional end-to-end.

Representar visualmente:

GitHub
→ handshake
→ webhook
→ validação HMAC
→ commits
→ idempotência
→ persistência
→ sincronização
→ APIs
→ analytics/IA

Complementar lateralmente com:
Docker / CI / logging / resiliência / Swagger / E2E.

Usar como evidência os assets:
- `04-kanban-prioridades-1.png`
- `05-kanban-prioridades-2.png`
- `06-kanban-prioridades-3.png`

Não listar as 17 USs completas no slide. Selecionar somente as etapas representativas e deixar o restante visível nas screenshots.

## Slide 8 — Kanban e execução atual
Usar `assets/03-kanban-overview.png`.

Fluxo atual:
**Backlog → To-Do → Doing → Done**

Explicar:
- Backlog = universo planejado;
- To-Do = histórias priorizadas;
- Doing = desenvolvimento atual;
- Done = concluídas.

Destacar que a história atualmente em Doing é:
**M2-81 / US1.2.018 — health check de conectividade com GitHub.**

Importante: a screenshot atual pode mostrar Epics/Features no Backlog. Não trate esses cards como itens em execução. Se necessário, recorte a imagem para enfatizar To-Do/Doing e o fluxo das colunas.

## Slide 9 — Protótipo Figma
Verificar se existem:
- `assets/07-figma-overview.png`
- `assets/08-figma-flow.png`

### Se existirem
Criar um slide visual com 2–4 telas principais e explicar rapidamente o fluxo da experiência.

Deixar explícito:
**Protótipo/PoC — ainda não é o MVP funcional.**

### Se não existirem
Criar um slide placeholder elegante e claramente marcado:
**“Protótipo Figma — asset será inserido antes da apresentação.”**

Não inventar telas.

## Slide 10 — Estado atual e próximos passos
Dividir em duas áreas.

### Já estruturado
- escopo;
- perfis;
- backlog;
- Epics / Features / USs;
- cronograma;
- Scrum/Kanban;
- priorização;
- protótipo Figma (se asset presente).

### Em andamento / próximos passos
- implementação da trilha end-to-end;
- MVP;
- deploy funcional;
- CI/CD;
- integração entre microsserviços;
- arquitetura final;
- testes E2E;
- release.

Se existir `assets/09-github.png`, usar como pequena evidência do repositório/primeiro commit.

# Direção visual
- apresentação moderna, limpa e técnica;
- estética de engenharia/software/GitHub;
- identidade Mackenzie apenas como referência visual, sem copiar slides oficiais;
- vermelho Mackenzie como cor de destaque, com parcimônia;
- fundo claro ou escuro consistente;
- tipografia legível em projetor;
- bastante espaço em branco;
- diagramas simples;
- screenshots em frames discretos;
- no máximo 1 ideia principal por slide.

Evitar:
- parágrafos;
- bullets longos;
- fontes pequenas;
- tabelas grandes;
- excesso de screenshots;
- estética genérica de template corporativo;
- conteúdo inventado.

# Tratamento das screenshots
As screenshots são **evidências reais do trabalho**, não decoração.

Ao usá-las:
- preservar proporção;
- recortar áreas irrelevantes;
- não distorcer;
- não recriar artificialmente o YouTrack;
- destacar visualmente apenas o trecho que sustenta a mensagem do slide;
- garantir legibilidade.

# Speaker notes
Criar `speaker-notes.md` contendo, para cada slide:
- título;
- tempo aproximado;
- mensagem principal;
- fala sugerida.

A soma deve ficar próxima de 7 minutos.

A linguagem deve soar natural para alunos de Engenharia da Computação apresentando o próprio projeto, sem formalidade excessiva e sem frases artificiais.

# Validação final obrigatória
Antes de finalizar:
1. verificar se todos os requisitos da AP1 presentes nas referências aparecem no deck;
2. verificar overflow e sobreposição;
3. verificar contraste e legibilidade;
4. verificar se screenshots continuam legíveis;
5. verificar se não há conteúdo inventado;
6. verificar se Figma é tratado como protótipo/PoC e não como MVP;
7. verificar se a apresentação cabe em 5–10 minutos;
8. verificar se o deck apresenta o trabalho do grupo, em vez de explicar teoria de Engenharia de Software.
