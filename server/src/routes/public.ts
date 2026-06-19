import { Hono } from "hono";
import { getCandidates, schemas, submitVote, validateCode } from "../services/vote-service";

export const publicRoutes = new Hono();

publicRoutes.post("/validate-code", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = schemas.validateCode.safeParse(body);

  if (!parsed.success) {
    return c.json({ message: "Format kode tidak valid" }, 400);
  }

  const isValid = await validateCode(parsed.data.code);

  if (!isValid) {
    return c.json({ message: "Kode tidak valid atau sudah digunakan" }, 400);
  }

  return c.json({ valid: true });
});

publicRoutes.get("/candidates", async (c) => {
  const candidates = await getCandidates();
  return c.json({ candidates });
});

publicRoutes.post("/vote", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = schemas.vote.safeParse(body);

  if (!parsed.success) {
    return c.json({ message: "Data vote tidak valid" }, 400);
  }

  try {
    await submitVote({
      code: parsed.data.code,
      candidateId: parsed.data.candidateId,
      customName: parsed.data.customName,
      userAgent: c.req.header("user-agent")
    });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ message: error instanceof Error ? error.message : "Gagal menyimpan vote" }, 400);
  }
});
