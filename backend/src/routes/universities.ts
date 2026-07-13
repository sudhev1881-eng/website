import { Router } from "express";
import { query } from "../db/pool.js";

export const universitiesRouter = Router();

/** GET /api/universities — public list of active colleges for dropdowns */
universitiesRouter.get("/", async (_req, res) => {
  try {
    const result = await query<{ id: string; name: string }>(
      `SELECT id, name FROM universities
       WHERE status = 'active'
       ORDER BY name ASC`,
    );
    res.json(result.rows.map((r) => ({ id: r.id, name: r.name })));
  } catch (err) {
    console.error("GET /universities error:", err);
    res.status(500).json({ error: "Failed to fetch universities" });
  }
});
