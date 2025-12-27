import express from "express";
import { pool } from "../db.js";

const router = express.Router();

/**
 * GET /metrics/overview?restaurant_id=UUID
 * Basic KPIs for the dashboard.
 */
router.get("/overview", async (req, res) => {
  try {
    const { restaurant_id } = req.query;
    if (!restaurant_id) return res.status(400).json({ error: "restaurant_id is required" });

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

    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
