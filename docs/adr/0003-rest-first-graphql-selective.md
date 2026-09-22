# ADR 0003: REST primeiro, GraphQL seletivo

- Status: proposto
- Data: 2026-09-22

## Contexto

REST oferece endpoints simples e paginacao por links. GraphQL reduz round trips em consultas de grafo, mas adiciona complexidade e limites por pontos.

## Decisao

Comecar com REST para handshake, metadados e carga incremental. Adotar GraphQL apenas na carga inicial de arvores de commits e autores apos medir ganho real.

## Consequencias

O cliente HTTP nasce desacoplado do processamento. Uma camada GraphQL sera adicionada sem alterar modelos ou contratos publicos.
