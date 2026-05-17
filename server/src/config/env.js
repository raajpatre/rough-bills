const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const nodeEnv = process.env.NODE_ENV || "development";
const jwtSecret = process.env.JWT_SECRET;

const defaultClientOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174"
];
const clientOrigins = (process.env.CLIENT_ORIGIN || defaultClientOrigins.join(","))
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedDevOrigin(origin) {
  if (nodeEnv !== "development") {
    return false;
  }

  try {
    const parsed = new URL(origin);
    return (
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
      /^5\d{3}$/.test(parsed.port || "")
    );
  } catch (_error) {
    return false;
  }
}

if (nodeEnv !== "development") {
  if (!jwtSecret) {
    throw new Error("JWT_SECRET must be set in production.");
  }
  if (jwtSecret === "development-secret") {
    throw new Error("JWT_SECRET must not be the development default in production.");
  }
  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production. Generate with: openssl rand -hex 32");
  }
}

const env = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: jwtSecret || "development-secret",
  clientOrigins,
  nodeEnv,
  isAllowedDevOrigin
};

module.exports = {
  env
};
