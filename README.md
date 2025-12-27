# mybot-api

Microservicio API (Express + Postgres) para exponer métricas y CRUD básico del SaaS.

## Endpoints
- GET /health
- GET /metrics/overview?restaurant_id=...
- PATCH /restaurants/:id

## Variables de entorno (Railway)
- DATABASE_URL
- MYBOT_API_KEY
- PORT (Railway lo pone solo)

## Auth
Añade el header:
- x-api-key: <MYBOT_API_KEY>

## Nota SSL
Si te da guerra SSL con Postgres en Railway, prueba:
- PGSSLMODE=disable
