import express from "express";
import { pool } from "../db.js";

const router = express.Router();

/**
 * PATCH /restaurants/:id
 * Update restaurant settings from Base44 admin.
 */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, timezone, language_default, public_phone, provider, provider_config } = req.body;

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

    if (rows.length === 0) return res.status(404).json({ error: "restaurant_not_found" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
