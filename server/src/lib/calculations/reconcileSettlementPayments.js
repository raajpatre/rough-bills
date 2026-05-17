function buildSettlementKey(fromUserId, toUserId) {
  return `${fromUserId}:${toUserId}`;
}

function reconcileSettlementPayments({ members = [], settlements = [], payments = [] } = {}) {
  const memberIds = members
    .map((member) => (typeof member === "string" ? member : member.userId ?? member.id))
    .filter(Boolean);

  const originalByPair = new Map();
  for (const settlement of settlements) {
    originalByPair.set(
      buildSettlementKey(settlement.fromUserId, settlement.toUserId),
      settlement.amountPaise
    );
  }

  const paidByPair = new Map();
  for (const payment of payments) {
    const key = buildSettlementKey(payment.fromUserId, payment.toUserId);
    const alreadyPaid = paidByPair.get(key) || 0;
    const outstanding = originalByPair.get(key) || 0;
    paidByPair.set(key, Math.min(outstanding, alreadyPaid + payment.amountPaise));
  }

  const reconciledSettlements = settlements.map((settlement) => {
    const key = buildSettlementKey(settlement.fromUserId, settlement.toUserId);
    const paidAmountPaise = paidByPair.get(key) || 0;
    const remainingAmountPaise = Math.max(0, settlement.amountPaise - paidAmountPaise);

    return {
      ...settlement,
      originalAmountPaise: settlement.amountPaise,
      paidAmountPaise,
      remainingAmountPaise,
      isSettled: remainingAmountPaise === 0
    };
  });

  const balanceByUserId = new Map(memberIds.map((userId) => [userId, 0]));

  for (const settlement of reconciledSettlements) {
    if (settlement.remainingAmountPaise <= 0) {
      continue;
    }

    balanceByUserId.set(
      settlement.fromUserId,
      (balanceByUserId.get(settlement.fromUserId) || 0) - settlement.remainingAmountPaise
    );
    balanceByUserId.set(
      settlement.toUserId,
      (balanceByUserId.get(settlement.toUserId) || 0) + settlement.remainingAmountPaise
    );
  }

  return {
    balances: memberIds
      .map((userId) => ({
        userId,
        netPaise: balanceByUserId.get(userId) || 0
      }))
      .filter((balance) => balance.netPaise !== 0),
    settlements: reconciledSettlements.filter((settlement) => settlement.remainingAmountPaise > 0),
    settledSettlements: reconciledSettlements.filter((settlement) => settlement.isSettled)
  };
}

module.exports = {
  reconcileSettlementPayments
};
