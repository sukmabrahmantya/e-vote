import { existsSync } from "node:fs";
import path from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import dotenv from "dotenv";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./lib/env";
import { adminRoutes } from "./routes/admin";
import { publicRoutes } from "./routes/public";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const app = new Hono();

app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173"],
    allowHeaders: ["Content-Type", "x-admin-password"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  })
);

app.get("/api/health", (c) => c.json({ ok: true }));

app.route("/api", publicRoutes);
app.route("/api/admin", adminRoutes);

const distDir = path.resolve(process.cwd(), "dist");

if (existsSync(distDir)) {
  app.use("/*", serveStatic({ root: "./dist" }));
  app.get("*", serveStatic({ path: "./dist/index.html" }));
}

serve(
  {
    fetch: app.fetch,
    port: env.port
  },
  (info) => {
    console.log(`Server running on http://localhost:${info.port}`);
  }
);
