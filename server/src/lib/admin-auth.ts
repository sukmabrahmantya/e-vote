import type { Context, Next } from "hono";
import { env } from "./env";

export async function adminAuth(c: Context, next: Next) {
  const password = c.req.header("x-admin-password");

  if (!password || password !== env.adminPassword) {
    return c.json({ message: "Unauthorized admin access" }, 401);
  }

  await next();
}
