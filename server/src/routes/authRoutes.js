const express = require("express");

const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/requireAuth");
const { createHttpError } = require("../utils/httpError");
const { hashPassword, signToken, verifyPassword } = require("../utils/auth");

const router = express.Router();

function normalizeUsername(username) {
  return username?.trim().toLowerCase();
}

function assertValidUsername(username) {
  if (!username || username.length < 3 || username.length > 24) {
    throw createHttpError(400, "Username must be between 3 and 24 characters.");
  }

  if (!/^[a-z0-9_]+$/.test(username)) {
    throw createHttpError(400, "Username can only use lowercase letters, numbers, and underscores.");
  }
}

function assertValidPassword(password) {
  if (!password || typeof password !== "string") {
    throw createHttpError(400, "Password is required.");
  }
  if (password.length < 8) {
    throw createHttpError(400, "Password must be at least 8 characters long.");
  }
  if (password.length > 128) {
    throw createHttpError(400, "Password is too long (max 128 characters).");
  }
}

router.post("/register", async (req, res, next) => {
  try {
    const username = normalizeUsername(req.body.username);
    const { password } = req.body;

    if (!username || !password) {
      throw createHttpError(400, "Username and password are required.");
    }

    assertValidUsername(username);
    assertValidPassword(password);

    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      throw createHttpError(409, "That username is already taken.");
    }

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: await hashPassword(password)
      }
    });

    return res.status(201).json({
      token: signToken(user),
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const username = normalizeUsername(req.body.username);
    const { password } = req.body;

    if (!username || !password) {
      throw createHttpError(400, "Username and password are required.");
    }

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      throw createHttpError(401, "Invalid username or password.");
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw createHttpError(401, "Invalid username or password.");
    }

    return res.json({
      token: signToken(user),
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: {
        id: true,
        username: true,
        createdAt: true,
        _count: {
          select: {
            memberships: true,
            paidExpenses: true
          }
        }
      }
    });

    if (!user) {
      throw createHttpError(404, "User not found.");
    }

    return res.json({ user });
  } catch (error) {
    return next(error);
  }
});

module.exports = {
  authRoutes: router
};
