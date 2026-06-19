import { Hono } from "hono";
import { adminAuth } from "../lib/admin-auth";
import {
  createCandidate,
  deleteCandidate,
  generateCodes,
  getCandidates,
  getCodes,
  getResults,
  getVoteLogs,
  schemas
} from "../services/vote-service";

export const adminRoutes = new Hono();

adminRoutes.use("*", adminAuth);

adminRoutes.get("/codes", async (c) => {
  const codes = await getCodes();
  return c.json({ codes });
});

adminRoutes.post("/codes/generate", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = schemas.generateCodes.safeParse(body);

  if (!parsed.success) {
    return c.json({ message: "Jumlah code harus 1 sampai 500" }, 400);
  }

  const codes = await generateCodes(parsed.data.count);
  return c.json({ codes });
});

adminRoutes.get("/candidates", async (c) => {
  const candidates = await getCandidates();
  return c.json({ candidates });
});

adminRoutes.post("/candidates", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = schemas.createCandidate.safeParse(body);

  if (!parsed.success) {
    return c.json({ message: "Data kandidat tidak valid" }, 400);
  }

  const candidate = await createCandidate(parsed.data);
  return c.json({ candidate });
});

adminRoutes.delete("/candidates/:id", async (c) => {
  await deleteCandidate(c.req.param("id"));
  return c.json({ success: true });
});

adminRoutes.get("/results", async (c) => {
  const results = await getResults();
  return c.json({ results });
});

adminRoutes.get("/vote-logs", async (c) => {
  const logs = await getVoteLogs();
  return c.json({ logs });
});
