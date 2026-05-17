const test = require("node:test");
const assert = require("node:assert/strict");

const { reconcileSettlementPayments } = require("./reconcileSettlementPayments");

test("full payment clears the outstanding due", () => {
  const result = reconcileSettlementPayments({
    members: ["u1", "u2"],
    settlements: [{ fromUserId: "u2", toUserId: "u1", amountPaise: 5000 }],
    payments: [{ fromUserId: "u2", toUserId: "u1", amountPaise: 5000 }]
  });

  assert.deepEqual(result.balances, []);
  assert.deepEqual(result.settlements, []);
  assert.equal(result.settledSettlements[0].isSettled, true);
});

test("partial payment only reduces the remaining due", () => {
  const result = reconcileSettlementPayments({
    members: ["u1", "u2"],
    settlements: [{ fromUserId: "u2", toUserId: "u1", amountPaise: 5000 }],
    payments: [{ fromUserId: "u2", toUserId: "u1", amountPaise: 2000 }]
  });

  assert.deepEqual(result.balances, [
    { userId: "u1", netPaise: 3000 },
    { userId: "u2", netPaise: -3000 }
  ]);
  assert.deepEqual(result.settlements, [
    {
      fromUserId: "u2",
      toUserId: "u1",
      amountPaise: 5000,
      originalAmountPaise: 5000,
      paidAmountPaise: 2000,
      remainingAmountPaise: 3000,
      isSettled: false
    }
  ]);
});
