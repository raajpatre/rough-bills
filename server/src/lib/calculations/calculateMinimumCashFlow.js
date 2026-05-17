function normalizeMemberId(member) {
  if (member && typeof member === "object" && typeof member.userId === "string") {
    return member.userId;
  }

  if (member && typeof member === "object" && typeof member.id === "string") {
    return member.id;
  }

  if (typeof member === "string") {
    return member;
  }

  throw new TypeError("Each member must be a user id string or an object with id/userId.");
}

function normalizeExpense(expense) {
  if (!expense || typeof expense !== "object") {
    throw new TypeError("Each expense must be an object.");
  }

  const payerId = expense.payerId ?? expense.paidBy ?? expense.paidByUserId;
  const amountPaise = expense.amountPaise ?? expense.amount;

  if (typeof payerId !== "string" || payerId.length === 0) {
    throw new TypeError("Each expense must include a payerId.");
  }

  if (!Number.isInteger(amountPaise) || amountPaise < 0) {
    throw new TypeError("Each expense amount must be a non-negative integer paise value.");
  }

  return {
    payerId,
    amountPaise
  };
}

function distributeExpenseShare(amountPaise, memberIds) {
  const memberCount = memberIds.length;
  const baseShare = Math.floor(amountPaise / memberCount);
  const remainder = amountPaise % memberCount;

  return memberIds.map((userId, index) => ({
    userId,
    sharePaise: baseShare + (index < remainder ? 1 : 0)
  }));
}

function calculateDirectSettlements({ expenses = [], members = [] } = {}) {
  if (!Array.isArray(expenses)) {
    throw new TypeError("expenses must be an array.");
  }

  if (!Array.isArray(members) || members.length === 0) {
    throw new TypeError("members must be a non-empty array.");
  }

  const memberIds = [...new Set(members.map(normalizeMemberId))].sort((a, b) =>
    a.localeCompare(b)
  );

  if (memberIds.length === 0) {
    throw new TypeError("members must contain at least one valid user id.");
  }

  const pairDebt = new Map();

  for (const rawExpense of expenses) {
    const expense = normalizeExpense(rawExpense);

    if (!memberIds.includes(expense.payerId)) {
      throw new RangeError(`Expense payer ${expense.payerId} is not a member of this hangout.`);
    }

    const shares = distributeExpenseShare(expense.amountPaise, memberIds);
    for (const share of shares) {
      if (share.userId === expense.payerId || share.sharePaise <= 0) {
        continue;
      }

      const key = `${share.userId}:${expense.payerId}`;
      pairDebt.set(key, (pairDebt.get(key) || 0) + share.sharePaise);
    }
  }

  const settlements = [];
  const visited = new Set();

  for (const [key, amountPaise] of pairDebt.entries()) {
    if (visited.has(key)) {
      continue;
    }

    const [fromUserId, toUserId] = key.split(":");
    const reverseKey = `${toUserId}:${fromUserId}`;
    const reverseAmountPaise = pairDebt.get(reverseKey) || 0;
    const netAmountPaise = amountPaise - reverseAmountPaise;

    if (netAmountPaise > 0) {
      settlements.push({
        fromUserId,
        toUserId,
        amountPaise: netAmountPaise
      });
    } else if (netAmountPaise < 0) {
      settlements.push({
        fromUserId: toUserId,
        toUserId: fromUserId,
        amountPaise: Math.abs(netAmountPaise)
      });
    }

    visited.add(key);
    visited.add(reverseKey);
  }

  settlements.sort((left, right) => {
    if (right.amountPaise !== left.amountPaise) {
      return right.amountPaise - left.amountPaise;
    }

    if (left.fromUserId !== right.fromUserId) {
      return left.fromUserId.localeCompare(right.fromUserId);
    }

    return left.toUserId.localeCompare(right.toUserId);
  });

  return { settlements };
}

function calculateMinimumCashFlow({ expenses = [], members = [] } = {}) {
  if (!Array.isArray(expenses)) {
    throw new TypeError("expenses must be an array.");
  }

  if (!Array.isArray(members) || members.length === 0) {
    throw new TypeError("members must be a non-empty array.");
  }

  const memberIds = [...new Set(members.map(normalizeMemberId))].sort((a, b) =>
    a.localeCompare(b)
  );

  if (memberIds.length === 0) {
    throw new TypeError("members must contain at least one valid user id.");
  }

  const netByUserId = new Map(memberIds.map((userId) => [userId, 0]));

  for (const rawExpense of expenses) {
    const expense = normalizeExpense(rawExpense);

    if (!netByUserId.has(expense.payerId)) {
      throw new RangeError(`Expense payer ${expense.payerId} is not a member of this hangout.`);
    }

    netByUserId.set(
      expense.payerId,
      netByUserId.get(expense.payerId) + expense.amountPaise
    );

    const shares = distributeExpenseShare(expense.amountPaise, memberIds);
    for (const share of shares) {
      netByUserId.set(share.userId, netByUserId.get(share.userId) - share.sharePaise);
    }
  }

  const balances = memberIds
    .map((userId) => ({
      userId,
      netPaise: netByUserId.get(userId)
    }))
    .filter((balance) => balance.netPaise !== 0);

  const creditors = balances
    .filter((balance) => balance.netPaise > 0)
    .map((balance) => ({ ...balance }))
    .sort((a, b) => b.netPaise - a.netPaise || a.userId.localeCompare(b.userId));

  const debtors = balances
    .filter((balance) => balance.netPaise < 0)
    .map((balance) => ({ userId: balance.userId, netPaise: Math.abs(balance.netPaise) }))
    .sort((a, b) => b.netPaise - a.netPaise || a.userId.localeCompare(b.userId));

  const settlements = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amountPaise = Math.min(creditor.netPaise, debtor.netPaise);

    if (amountPaise > 0) {
      settlements.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amountPaise
      });
    }

    creditor.netPaise -= amountPaise;
    debtor.netPaise -= amountPaise;

    if (creditor.netPaise === 0) {
      creditorIndex += 1;
    }

    if (debtor.netPaise === 0) {
      debtorIndex += 1;
    }
  }

  return {
    balances,
    settlements
  };
}

module.exports = {
  calculateDirectSettlements,
  calculateMinimumCashFlow,
  distributeExpenseShare
};
