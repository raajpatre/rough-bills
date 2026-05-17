const { prisma } = require("../lib/prisma");
const {
  calculateDirectSettlements,
  calculateMinimumCashFlow
} = require("../utils/calculateMinimumCashFlow");
const { buildArchivedDebtSummary } = require("../lib/calculations/buildArchivedDebtSummary");
const { reconcileSettlementPayments } = require("../lib/calculations/reconcileSettlementPayments");
const { generateRoomCode } = require("../utils/roomCode");
const { createHttpError } = require("../utils/httpError");

async function generateUniqueRoomCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const roomCode = generateRoomCode();
    const existingHangout = await prisma.hangout.findUnique({
      where: { roomCode }
    });

    if (!existingHangout) {
      return roomCode;
    }
  }

  throw createHttpError(500, "Unable to generate a unique room code. Please retry.");
}

function mapUserIdentity(user) {
  return {
    id: user.id,
    username: user.username
  };
}

function mapHangoutMember(member) {
  return {
    userId: member.user.id,
    username: member.user.username,
    joinedAt: member.joinedAt
  };
}

function buildSettlementSummary(hangout) {
  const members = hangout.members.map((member) => member.user.id);
  const expenses = hangout.expenses.map((expense) => ({
    payerId: expense.payerId,
    amountPaise: expense.amountPaise
  }));
  const directSummary = calculateDirectSettlements({
    members,
    expenses
  });
  const optimizedSummary = calculateMinimumCashFlow({
    members,
    expenses
  });
  const { balances, settlements, settledSettlements } = reconcileSettlementPayments({
    members,
    settlements: directSummary.settlements,
    payments: hangout.settlementPayments || []
  });
  const optimizedReconciliation = reconcileSettlementPayments({
    members,
    settlements: optimizedSummary.settlements,
    payments: hangout.settlementPayments || []
  });

  const memberLookup = new Map(hangout.members.map((member) => [member.user.id, member.user]));

  return {
    balances: balances.map((balance) => ({
      userId: balance.userId,
      username: memberLookup.get(balance.userId)?.username || "unknown",
      netPaise: balance.netPaise
    })),
    settlements: settlements.map((settlement) => ({
      ...settlement,
      fromName: memberLookup.get(settlement.fromUserId)?.username || "unknown",
      toName: memberLookup.get(settlement.toUserId)?.username || "unknown"
    })),
    settledSettlements: settledSettlements.map((settlement) => ({
      ...settlement,
      fromName: memberLookup.get(settlement.fromUserId)?.username || "unknown",
      toName: memberLookup.get(settlement.toUserId)?.username || "unknown"
    })),
    optimizedSettlements: optimizedReconciliation.settlements.map((settlement) => ({
      ...settlement,
      fromName: memberLookup.get(settlement.fromUserId)?.username || "unknown",
      toName: memberLookup.get(settlement.toUserId)?.username || "unknown"
    })),
    paymentHistory: (hangout.settlementPayments || []).map((payment) => ({
      id: payment.id,
      fromUserId: payment.fromUserId,
      toUserId: payment.toUserId,
      amountPaise: payment.amountPaise,
      createdAt: payment.createdAt,
      recordedByUserId: payment.recordedByUserId,
      fromName: memberLookup.get(payment.fromUserId)?.username || "unknown",
      toName: memberLookup.get(payment.toUserId)?.username || "unknown",
      recordedByName: memberLookup.get(payment.recordedByUserId)?.username || "unknown"
    }))
  };
}

function mapHangoutDetails(hangout) {
  const summary = buildSettlementSummary(hangout);

  return {
    id: hangout.id,
    name: hangout.name,
    roomCode: hangout.roomCode,
    status: hangout.status,
    creatorUserId: hangout.creatorUserId,
    creator: mapUserIdentity(hangout.creator),
    createdAt: hangout.createdAt,
    members: hangout.members.map(mapHangoutMember),
    expenses: hangout.expenses.map((expense) => ({
      id: expense.id,
      description: expense.description,
      amountPaise: expense.amountPaise,
      createdAt: expense.createdAt,
      payer: mapUserIdentity(expense.payer)
    })),
    summary
  };
}

async function assertHangoutMembership(hangoutId, userId) {
  const membership = await prisma.hangoutMember.findUnique({
    where: {
      hangoutId_userId: {
        hangoutId,
        userId
      }
    }
  });

  if (!membership) {
    throw createHttpError(403, "You are not a member of this hangout.");
  }
}

async function getHangoutOrThrow(hangoutId) {
  const hangout = await prisma.hangout.findUnique({
    where: { id: hangoutId },
    include: {
      creator: true,
      members: {
        include: {
          user: true
        },
        orderBy: {
          joinedAt: "asc"
        }
      },
      expenses: {
        include: {
          payer: true
        },
        orderBy: {
          createdAt: "asc"
        }
      },
      settlementPayments: {
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });

  if (!hangout) {
    throw createHttpError(404, "Hangout not found.");
  }

  return hangout;
}

async function getUserHangoutMemberships(userId, status) {
  return prisma.hangoutMember.findMany({
    where: {
      userId,
      hangout: status ? { status } : undefined
    },
    include: {
      hangout: {
        include: {
          creator: true,
          members: {
            include: {
              user: true
            },
            orderBy: {
              joinedAt: "asc"
            }
          },
          expenses: {
            include: {
              payer: true
            },
            orderBy: {
              createdAt: "asc"
            }
          },
          settlementPayments: {
            orderBy: {
              createdAt: "desc"
            }
          }
        }
      }
    },
    orderBy: {
      joinedAt: "desc"
    }
  });
}

function mapHangoutsFromMemberships(memberships) {
  return memberships.map(({ hangout }) => {
    const details = mapHangoutDetails(hangout);
    return {
      id: details.id,
      name: details.name,
      roomCode: details.roomCode,
      status: details.status,
      creatorUserId: details.creatorUserId,
      creator: details.creator,
      createdAt: details.createdAt,
      memberCount: details.members.length,
      expenseCount: details.expenses.length,
      summary: details.summary
    };
  });
}

async function listHangoutsForUser(userId, status) {
  const memberships = await getUserHangoutMemberships(userId, status);
  const hangouts = mapHangoutsFromMemberships(memberships);
  const archivedHangouts =
    status === "CLOSED" ? hangouts : mapHangoutsFromMemberships(await getUserHangoutMemberships(userId, "CLOSED"));
  const archivedDebtSummary = buildArchivedDebtSummary(archivedHangouts, userId);

  return {
    hangouts,
    archivedDebtSummary
  };
}

async function createHangout({ name, creatorUserId }) {
  const roomCode = await generateUniqueRoomCode();

  const hangout = await prisma.hangout.create({
    data: {
      name,
      roomCode,
      creatorUserId,
      members: {
        create: {
          userId: creatorUserId
        }
      }
    },
    include: {
      creator: true,
      members: {
        include: {
          user: true
        }
      },
      expenses: {
        include: {
          payer: true
        }
      },
      settlementPayments: true
    }
  });

  return mapHangoutDetails(hangout);
}

async function joinHangout({ roomCode, userId }) {
  const normalizedRoomCode = roomCode.trim().toUpperCase();
  const hangout = await prisma.hangout.findUnique({
    where: { roomCode: normalizedRoomCode }
  });

  if (!hangout) {
    throw createHttpError(404, "No hangout found for that room code.");
  }

  if (hangout.status === "CLOSED") {
    throw createHttpError(400, "This hangout is already closed.");
  }

  await prisma.hangoutMember.upsert({
    where: {
      hangoutId_userId: {
        hangoutId: hangout.id,
        userId
      }
    },
    update: {},
    create: {
      hangoutId: hangout.id,
      userId
    }
  });

  return getHangoutDetails(hangout.id, userId);
}

async function getHangoutDetails(hangoutId, userId) {
  await assertHangoutMembership(hangoutId, userId);
  const hangout = await getHangoutOrThrow(hangoutId);
  return mapHangoutDetails(hangout);
}

async function addExpense({ hangoutId, description, amountPaise, payerId, actorUserId }) {
  await assertHangoutMembership(hangoutId, actorUserId);
  await assertHangoutMembership(hangoutId, payerId);

  const hangout = await prisma.hangout.findUnique({
    where: { id: hangoutId }
  });

  if (!hangout) {
    throw createHttpError(404, "Hangout not found.");
  }

  if (hangout.status === "CLOSED") {
    throw createHttpError(400, "Closed hangouts cannot accept new expenses.");
  }

  await prisma.expense.create({
    data: {
      hangoutId,
      payerId,
      description,
      amountPaise
    }
  });

  return getHangoutDetails(hangoutId, actorUserId);
}

async function closeHangout({ hangoutId, userId }) {
  await assertHangoutMembership(hangoutId, userId);
  const hangout = await prisma.hangout.findUnique({
    where: { id: hangoutId }
  });

  if (!hangout) {
    throw createHttpError(404, "Hangout not found.");
  }

  if (hangout.creatorUserId !== userId) {
    throw createHttpError(403, "Only the hangout creator can end this hangout.");
  }

  await prisma.hangout.update({
    where: { id: hangoutId },
    data: {
      status: "CLOSED"
    }
  });

  return getHangoutDetails(hangoutId, userId);
}

async function recordSettlementPayment({
  hangoutId,
  fromUserId,
  toUserId,
  amountPaise,
  actorUserId
}) {
  await assertHangoutMembership(hangoutId, actorUserId);
  await assertHangoutMembership(hangoutId, fromUserId);
  await assertHangoutMembership(hangoutId, toUserId);

  const hangout = await getHangoutOrThrow(hangoutId);

  if (hangout.status !== "CLOSED") {
    throw createHttpError(400, "You can only mark dues paid after the hangout has ended.");
  }

  const summary = buildSettlementSummary(hangout);
  const settlement = summary.settlements.find(
    (item) => item.fromUserId === fromUserId && item.toUserId === toUserId
  );

  if (!settlement) {
    throw createHttpError(404, "No outstanding settlement exists for that pair.");
  }

  if (actorUserId !== toUserId) {
    throw createHttpError(403, "Only the member receiving the money can mark this due as paid.");
  }

  if (!Number.isInteger(amountPaise) || amountPaise <= 0) {
    throw createHttpError(400, "Payment amount must be a positive paise value.");
  }

  if (amountPaise > settlement.remainingAmountPaise) {
    throw createHttpError(400, "Payment amount cannot exceed the remaining due.");
  }

  await prisma.settlementPayment.create({
    data: {
      hangoutId,
      fromUserId,
      toUserId,
      amountPaise,
      recordedByUserId: actorUserId
    }
  });

  return getHangoutDetails(hangoutId, actorUserId);
}

module.exports = {
  listHangoutsForUser,
  createHangout,
  joinHangout,
  getHangoutDetails,
  addExpense,
  closeHangout,
  recordSettlementPayment
};
