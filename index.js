import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// ===== helpers =====
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(v) {
  return typeof v === "string" && UUID_RE.test(v);
}

// ---- health (sin auth) ----
app.get("/health", (_req, res) => res.status(200).send("OK"));

// ---- auth simple por API key ----
function apiKeyAuth(req, res, next) {
  const expected = process.env.MYBOT_API_KEY;
  const key = req.headers["x-api-key"];

  if (!expected) return res.status(500).json({ error: "MYBOT_API_KEY not set" });
  if (!key || key !== expected) return res.status(401).json({ error: "Unauthorized" });

  next();
}

app.use(apiKeyAuth);

// ---- Postgres (Railway) ----
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
});

// Opcional: comprobar conexión al boot (no bloquea si falla)
pool
  .query("SELECT 1")
  .then(() => console.log("✅ Postgres connected"))
  .catch((e) => console.error("❌ Postgres connect error:", e?.message || e));

// ---- endpoints ----

// Lista rápida de restaurantes (para sacar el restaurant_id sin entrar al DB)
app.get("/restaurants", async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || "25", 10), 1), 200);

    const { rows } = await pool.query(
      `
      SELECT id, name, timezone, language_default, public_phone, provider, created_at, updated_at
      FROM restaurants
      ORDER BY created_at DESC
      LIMIT $1
      `,
      [limit]
    );

    res.json({ rows });
  } catch (e) {
    console.error("restaurants list error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// KPI overview: llamadas totales, con reserva, duración media, activas
app.get("/metrics/overview", async (req, res) => {
  try {
    const { restaurant_id } = req.query;
    if (!restaurant_id) return res.status(400).json({ error: "restaurant_id is required" });
    if (!isUuid(restaurant_id)) return res.status(400).json({ error: "restaurant_id must be a UUID" });

    const { rows } = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total_calls,
        COUNT(*) FILTER (WHERE reservation_id IS NOT NULL)::int AS calls_with_reservation,
        COALESCE(AVG(EXTRACT(EPOCH FROM (ended_at - started_at))), 0)::float AS avg_duration_seconds,
        COUNT(*) FILTER (WHERE ended_at IS NULL)::int AS active_calls
      FROM calls
      WHERE restaurant_id = $1
      `,
      [restaurant_id]
    );

    res.json(rows[0] ?? { total_calls: 0, calls_with_reservation: 0, avg_duration_seconds: 0, active_calls: 0 });
  } catch (e) {
    console.error("metrics/overview error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// últimas llamadas (para tabla)
app.get("/metrics/calls", async (req, res) => {
  try {
    const { restaurant_id, limit } = req.query;
    if (!restaurant_id) return res.status(400).json({ error: "restaurant_id is required" });
    if (!isUuid(restaurant_id)) return res.status(400).json({ error: "restaurant_id must be a UUID" });

    const lim = Math.min(Math.max(parseInt(limit || "50", 10), 1), 200);

    const { rows } = await pool.query(
      `
      SELECT
        id,
        started_at,
        ended_at,
        from_phone_e164,
        to_phone_e164,
        language_detected,
        flow,
        outcome,
        reservation_id,
        metadata
      FROM calls
      WHERE restaurant_id = $1
      ORDER BY started_at DESC
      LIMIT $2
      `,
      [restaurant_id, lim]
    );

    res.json({ rows });
  } catch (e) {
    console.error("metrics/calls error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// actualizar ajustes del restaurante desde el panel (Base44)
app.patch("/restaurants/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUuid(id)) return res.status(400).json({ error: "id must be a UUID" });

    const { name, timezone, language_default, public_phone, provider, provider_config } = req.body || {};

    const { rows } = await pool.query(
      `
      UPDATE restaurants
      SET
        name = COALESCE($1, name),
        timezone = COALESCE($2, timezone),
        language_default = COALESCE($3, language_default),
        public_phone = COALESCE($4, public_phone),
        provider = COALESCE($5, provider),
        provider_config = COALESCE($6, provider_config),
        updated_at = now()
      WHERE id = $7
      RETURNING *
      `,
      [
        name ?? null,
        timezone ?? null,
        language_default ?? null,
        public_phone ?? null,
        provider ?? null,
        provider_config ?? null,
        id,
      ]
    );

    if (!rows.length) return res.status(404).json({ error: "restaurant_not_found" });
    res.json(rows[0]);
  } catch (e) {
    console.error("restaurants patch error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 mybot-api on port", PORT));
