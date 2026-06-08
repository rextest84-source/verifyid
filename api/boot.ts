import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { Paths } from "@contracts/constants";
import { writeFile } from "fs/promises";
import { mkdir } from "fs/promises";
import { serveStatic } from "@hono/node-server/serve-static";
import path from "path";
import { ensureDatabaseSchema } from "./ensure-db";

const app = new Hono<{ Bindings: HttpBindings }>();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://dsc-infoverifyid.com",
  "https://www.dsc-infoverifyid.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean) as string[];

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return allowedOrigins[0] ?? "*";
      if (allowedOrigins.includes(origin)) return origin;
      if (origin.endsWith(".netlify.app")) return origin;
      return allowedOrigins[0] ?? origin;
    },
    credentials: true,
  }),
);

app.use("/uploads/*", serveStatic({ root: "./" }));
app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.get(Paths.oauthCallback, createOAuthCallbackHandler());

app.post("/api/upload", async (c) => {
  const body = await c.req.parseBody();
  const file = body.file as File;
  if (!file) return c.json({ error: "No file uploaded" }, 400);
  const uploadsDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const fileName = `${Date.now()}-${file.name}`;
  const filePath = path.join(uploadsDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);
  return c.json({ url: `/uploads/${fileName}` });
});

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

// Serve static files from dist/public
const distPath = path.resolve(process.cwd(), "dist/public");
app.use("*", serveStatic({ root: "./dist/public" }));
app.notFound((c) => {
  const accept = c.req.header("accept") ?? "";
  if (!accept.includes("text/html")) return c.json({ error: "Not Found" }, 404);
  try {
    const content = require("fs").readFileSync(path.resolve(distPath, "index.html"), "utf-8");
    return c.html(content);
  } catch {
    return c.json({ error: "Frontend not built" }, 500);
  }
});

export default app;

ensureDatabaseSchema();

const port = parseInt(process.env.PORT || "3000");
const { serve } = await import("@hono/node-server");
serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on port ${port}`);
});
