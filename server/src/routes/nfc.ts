import { Router } from "express";
import { nfcService } from "../services/nfc.js";

export const nfcRouter = Router();

/** GET /api/nfc/status — check if USB reader is connected on the server */
nfcRouter.get("/status", async (_req, res) => {
  try {
    const status = await nfcService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: "Failed to check NFC reader status" });
  }
});

/** POST /api/nfc/program — write profile URL to card via server USB reader */
nfcRouter.post("/program", async (req, res) => {
  const { studentId, studentSlug, cardNumber } = req.body;

  if (!studentId || !studentSlug) {
    res.status(400).json({ error: "studentId and studentSlug are required" });
    return;
  }

  try {
    const result = await nfcService.programCard(studentSlug, cardNumber);

    if (!result.success) {
      res.status(422).json(result);
      return;
    }

    // TODO: Persist card assignment in PostgreSQL
    res.json({
      ...result,
      studentId,
      cardNumber: cardNumber ?? null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      verified: false,
      message: error instanceof Error ? error.message : "NFC programming failed",
    });
  }
});
