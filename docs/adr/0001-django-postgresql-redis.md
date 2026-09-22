# ADR 0001: Django, PostgreSQL e Redis

- Status: aceito
- Data: 2026-09-22

## Contexto

O modulo precisa receber webhooks rapidamente, processar eventos em segundo plano, persistir entidades relacionais e expor APIs documentadas. O backlog tambem exige comandos `manage.py`.

## Decisao

Usar Django REST Framework na API, PostgreSQL como fonte de verdade e Celery com Redis como broker. Redis tambem podera receber o cache de quinze minutos em uma iteracao posterior.

## Consequencias

A equipe usa um unico ecossistema Python para API, jobs, migrations e analytics. Redis nao e fonte de verdade e o worker precisa ser implantado separadamente da API.
