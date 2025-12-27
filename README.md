# mybot-api (single file)

Versión *a prueba de balas* para Railway: todo en `index.js` (sin imports a rutas), para evitar errores tipo:
`ERR_MODULE_NOT_FOUND: Cannot find module '/app/routes/metrics.js'`.

## Env (Railway)
- `DATABASE_URL`
- `MYBOT_API_KEY`
- `PGSSLMODE` opcional: pon `disable` si te da guerra SSL
- `PORT` (Railway lo pone)

## Auth
Header:
- `x-api-key: <MYBOT_API_KEY>`

## Endpoints
- `GET /health`
- `GET /metrics/overview?restaurant_id=<uuid>`
- `GET /metrics/calls?restaurant_id=<uuid>&limit=50`
- `PATCH /restaurants/:id`
