import { randomUUID } from "node:crypto";
import { getRedis } from "../lib/redis.js";
import { applyCors, hasValidApiToken, isApiTokenConfigured, sendJson } from "../lib/security.js";

const TTL_SECONDS = 3600;
const MAX_TEXT_BYTES = 200 * 1024;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const config = {
  api: {
    bodyParser: { sizeLimit: "256kb" },
  },
};

export default async function handler(req, res) {
  if (!applyCors(req, res)) {
    return sendJson(res, 403, { error: "Origem não autorizada." });
  }

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return sendJson(res, 405, { error: "Método não permitido." });
  }

  if (!isApiTokenConfigured()) {
    return sendJson(res, 503, { error: "A autenticação da API não está configurada." });
  }
  if (!hasValidApiToken(req)) {
    return sendJson(res, 401, { error: "Não autorizado." });
  }

  if (req.method === "POST") return storeTranscription(req, res);
  return retrieveTranscription(req, res);
}

async function storeTranscription(req, res) {
  if (!req.headers["content-type"]?.toLowerCase().includes("application/json")) {
    return sendJson(res, 415, { error: "Envie o conteúdo como application/json." });
  }

  const transcricao = req.body?.transcricao;
  if (typeof transcricao !== "string" || transcricao.trim().length === 0) {
    return sendJson(res, 400, { error: "O campo transcricao é obrigatório e deve conter texto." });
  }
  if (Buffer.byteLength(transcricao, "utf8") > MAX_TEXT_BYTES) {
    return sendJson(res, 413, { error: "A transcrição excede o limite de 200 KiB." });
  }

  const id = randomUUID();
  try {
    await getRedis().set(`transcricao:${id}`, transcricao, { ex: TTL_SECONDS });
    return sendJson(res, 201, { id, expiresInSeconds: TTL_SECONDS });
  } catch {
    return sendJson(res, 503, { error: "Não foi possível armazenar a transcrição agora." });
  }
}

async function retrieveTranscription(req, res) {
  const id = Array.isArray(req.query?.id) ? req.query.id[0] : req.query?.id;
  if (typeof id !== "string" || !UUID_V4_PATTERN.test(id)) {
    return sendJson(res, 400, { error: "Informe um UUID válido no parâmetro id." });
  }

  try {
    const transcricao = await getRedis().get(`transcricao:${id}`);
    if (transcricao === null) return sendJson(res, 404, { error: "Transcrição não encontrada ou expirada." });
    if (typeof transcricao !== "string") {
      return sendJson(res, 503, { error: "Não foi possível recuperar a transcrição agora." });
    }
    return sendJson(res, 200, { id, transcricao });
  } catch {
    return sendJson(res, 503, { error: "Não foi possível recuperar a transcrição agora." });
  }
}
