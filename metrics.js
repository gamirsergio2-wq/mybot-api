import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.get("/overview", async (req, res) => {
  const { restaurant_id } = req.query;

  const { rows } = await pool.query(`
    SELECT
      COUNT(*) AS total_calls,
      COUNT(*) FILTER (WHERE reservation_id IS NOT NULL) AS calls_with_reservation,
      AVG(EXTRACT(EPOCH FROM (ended_at - started_at))) AS avg_duration_seconds
    FROM calls
    WHERE restaurant_id = $1
  `, [restaurant_id]);

  res.json(rows[0]);
});

export default router;
