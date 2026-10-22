import { timingSafeEqual } from "node:crypto";

export function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.end(JSON.stringify(body));
}

export function applyCors(req, res) {
  const origin = req.headers.origin;
  if (!origin) return true;

  const host = req.headers.host;
  const sameOrigin = host && (origin === `https://${host}` || origin === `http://${host}`);
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!sameOrigin && !allowedOrigins.includes(origin)) return false;

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");
  res.setHeader("Vary", "Origin");
  return true;
}

export function isApiTokenConfigured() {
  return typeof process.env.API_AUTH_TOKEN === "string" && process.env.API_AUTH_TOKEN.length >= 32;
}

export function hasValidApiToken(req) {
  const expected = process.env.API_AUTH_TOKEN;
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || "");
  if (!expected || !match) return false;

  const providedBytes = Buffer.from(match[1], "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes);
}
