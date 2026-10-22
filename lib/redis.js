import { Redis } from "@upstash/redis";

let redisClient;

export function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Redis não configurado");

  if (!redisClient) {
    redisClient = new Redis({ url, token, enableTelemetry: false });
  }
  return redisClient;
}
