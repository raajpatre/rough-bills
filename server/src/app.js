const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const { env } = require("./config/env");
const { authRoutes } = require("./routes/authRoutes");
const { hangoutRoutes } = require("./routes/hangoutRoutes");

const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.clientOrigins.includes(origin) || env.isAllowedDevOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many auth attempts. Try again in a few minutes." }
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/hangouts", hangoutRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` });
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  const message =
    status >= 500 && env.nodeEnv === "production"
      ? "Something went wrong."
      : error.message || "Something went wrong.";

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({ message });
});

module.exports = {
  app
};
