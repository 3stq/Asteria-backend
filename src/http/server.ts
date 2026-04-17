// src/http/server.ts
import { Hono } from "hono";
import { serve } from "bun";
import { serveStatic } from "hono/bun";
import leaderboard from "./leaderboard";

// Root Hono app
const app = new Hono();

// Serve static leaderboard page at /leaderboard/*
app.use(
  "/leaderboard/*",
  serveStatic({
    root: "./static/leaderboard",
    rewriteRequestPath: (path) =>
      path === "/leaderboard" || path === "/leaderboard/"
        ? "/index.html"
        : path.replace("/leaderboard", "") || "/index.html",
  })
);

// Mount API routes
app.route("/", leaderboard);

// Start HTTP server on 8080
export function startHttpServer() {
  serve({
    port: 8080,
    fetch: app.fetch,
  });
  console.log(`[HTTP] Lyric server listening on :8080`);
}
