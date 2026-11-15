# AI Platform — GitHub Service (Módulo 2) · Frontend SPA

**Responsável por esta branch:** Pedro Cavalcante (10437298) — Desenvolvedor Frontend.

SPA em **React + TypeScript + Vite** que consome a API do GitHub Service publicada no Azure:
arquitetura desacoplada, com o frontend independente consumindo a API em nuvem.

| Recurso | Link |
| --- | --- |
| API consumida (serviço do Eduardo) | [https://ai-platform-github-service-eduardo-frapb8fbbcd0bfdm.brazilsouth-01.azurewebsites.net](https://ai-platform-github-service-eduardo-frapb8fbbcd0bfdm.brazilsouth-01.azurewebsites.net/) · [Swagger](https://ai-platform-github-service-eduardo-frapb8fbbcd0bfdm.brazilsouth-01.azurewebsites.net/docs/) |
| Motor de sincronização (Henrique) | branch `main` deste repositório |

## Como rodar

```bash
cp .env.example .env   # VITE_API_TARGET aponta para a API publicada
npm install
npm run dev            # http://localhost:5173/
```

O proxy do Vite (`vite.config.ts`) encaminha `/api` e `/webhooks` para `VITE_API_TARGET`, então
o navegador fala sempre com a mesma origem e o backend não precisa de CORS.

## Qualidade

```bash
npm run lint
npm run test
npm run build
```
