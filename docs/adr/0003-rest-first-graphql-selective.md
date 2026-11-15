# ADR 0003: REST no MVP; GraphQL somente mediante evidência

- Status: aceito
- Data: 2026-10-22

## Contexto

REST oferece endpoints simples, paginação por links e cobertura suficiente para a jornada priorizada. GraphQL poderia reduzir round trips em consultas de grafo, mas adicionaria autenticação, limites por pontos, cache e uma segunda superfície contratual. Não houve medição que demonstrasse ganho para o volume do MVP.

## Decisao

Manter REST como único cliente GitHub do MVP para handshake, metadados, carga incremental, conteúdo e diff. GraphQL fica explicitamente fora do recorte entregue e só será reconsiderado após benchmark reproduzível que mostre benefício material.

## Consequencias

O cliente HTTP permanece desacoplado do processamento e os contratos públicos não prometem GraphQL. A decisão reduz complexidade operacional e torna a documentação coerente com o código. Uma futura camada GraphQL exigirá novo ADR, testes e medição de rate limit/latência.
