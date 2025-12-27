import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, timezone, language_default } = req.body;

  await pool.query(`
    UPDATE restaurants
    SET name = $1, timezone = $2, language_default = $3, updated_at = now()
    WHERE id = $4
  `, [name, timezone, language_default, id]);

  res.json({ success: true });
});

export default router;
