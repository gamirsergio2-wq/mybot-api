import express from "express";
import cors from "cors";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// =====================
// Utils
// =====================
const UUID_RE = /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function clean(v) {
  return decodeURIComponent(String(v ?? "")).trim();
}

function isUuid(v) {
  return UUID_RE.test(clean(v));
}

// =====================
// Health (SIN auth)
// =====================
app.get("/health", (_req, res) => res.status(200).send("OK"));

// =====================
// Auth por API key
// =====================
function apiKeyAuth(req, res, next) {
  const expected = process.env.MYBOT_API_KEY;
  const key = req.headers["x-api-key"];

  if (!expected) {
    return res.status(500).json({ error: "MYBOT_API_KEY not set" });
  }
  if (!key || key !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Todo lo de abajo va protegido
app.use(apiKeyAuth);

// =====================
// Postgres (Railway)
// =====================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
});

// Test conexión (solo log)
pool
  .query("SELECT 1")
  .then(() => console.log("✅ Postgres connected"))
  .catch((e) => console.error("❌ Postgres connection error:", e?.message));

// =====================
// Endpoints
// =====================

// ---- Listar restaurantes (para sacar UUIDs reales)
app.get("/restaurants", async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit || "25", 10), 1), 200);

    const { rows } = await pool.query(
      `
      SELECT
        id,
        name,
        timezone,
        language_default,
        public_phone,
        provider,
        created_at,
        updated_at
      FROM restaurants
      ORDER BY created_at DESC
      LIMIT $1
      `,
      [limit]
    );

    res.json({ rows });
  } catch (e) {
    console.error("GET /restaurants error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// ---- Ver un restaurante concreto (GET)
app.get("/restaurants/:id", async (req, res) => {
  try {
    const id = clean(req.params.id);
    if (!isUuid(id)) {
      return res.status(400).json({ error: "id must be a UUID" });
    }

    const { rows } = await pool.query(
      `
      SELECT
        id,
        name,
        timezone,
        language_default,
        public_phone,
        provider,
        provider_config,
        created_at,
        updated_at
      FROM restaurants
      WHERE id = $1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "restaurant_not_found" });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error("GET /restaurants/:id error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// ---- Métricas overview
app.get("/metrics/overview", async (req, res) => {
  try {
    const restaurant_id = clean(req.query.restaurant_id);
    if (!isUuid(restaurant_id)) {
      return res.status(400).json({ error: "restaurant_id must be a UUID" });
    }

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

    res.json(
      rows[0] ?? {
        total_calls: 0,
        calls_with_reservation: 0,
        avg_duration_seconds: 0,
        active_calls: 0,
      }
    );
  } catch (e) {
    console.error("GET /metrics/overview error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// ---- Últimas llamadas
app.get("/metrics/calls", async (req, res) => {
  try {
    const restaurant_id = clean(req.query.restaurant_id);
    if (!isUuid(restaurant_id)) {
      return res.status(400).json({ error: "restaurant_id must be a UUID" });
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 200);

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
      [restaurant_id, limit]
    );

    res.json({ rows });
  } catch (e) {
    console.error("GET /metrics/calls error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// ---- Actualizar restaurante (PATCH)
app.patch("/restaurants/:id", async (req, res) => {
  try {
    const id = clean(req.params.id);
    if (!isUuid(id)) {
      return res.status(400).json({ error: "id must be a UUID" });
    }

    const {
      name,
      timezone,
      language_default,
      public_phone,
      provider,
      provider_config,
    } = req.body || {};

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

    if (!rows.length) {
      return res.status(404).json({ error: "restaurant_not_found" });
    }

    res.json(rows[0]);
  } catch (e) {
    console.error("PATCH /restaurants/:id error:", e);
    res.status(500).json({ error: "internal_error" });
  }
});

// =====================
// Start server
// =====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 mybot-api running on port", PORT);
});
