import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const jwtSecret = required("JWT_SECRET");
if (jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters long.");
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  mongoUri: required("MONGODB_URI"),
  mongoMaxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE ?? 5),
  mongoServerSelectionTimeoutMs: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS ?? 10000),
  jwtSecret,
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() ?? "",
  geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN?.trim() || "1d",
  corsOrigins: (process.env.CORS_ORIGIN ??
    "http://localhost:5173,http://127.0.0.1:5173,https://prompt-war-dusky.vercel.app")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};

if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) {
  throw new Error("PORT must be a valid TCP port number.");
}
if (!Number.isInteger(env.mongoMaxPoolSize) || env.mongoMaxPoolSize < 1 || env.mongoMaxPoolSize > 100) {
  throw new Error("MONGODB_MAX_POOL_SIZE must be a whole number from 1 to 100.");
}
if (
  !Number.isInteger(env.mongoServerSelectionTimeoutMs) ||
  env.mongoServerSelectionTimeoutMs < 1000 ||
  env.mongoServerSelectionTimeoutMs > 120000
) {
  throw new Error("MONGODB_SERVER_SELECTION_TIMEOUT_MS must be a whole number from 1000 to 120000.");
}
