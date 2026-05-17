const test = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateDirectSettlements,
  calculateMinimumCashFlow,
  distributeExpenseShare
} = require("./calculateMinimumCashFlow");

test("splits a single expense equally across two members", () => {
  const result = calculateMinimumCashFlow({
    members: ["u1", "u2"],
    expenses: [{ payerId: "u1", amountPaise: 10000 }]
  });

  assert.deepEqual(result.balances, [
    { userId: "u1", netPaise: 5000 },
    { userId: "u2", netPaise: -5000 }
  ]);
  assert.deepEqual(result.settlements, [
    { fromUserId: "u2", toUserId: "u1", amountPaise: 5000 }
  ]);
});

test("handles multiple expenses with alternating payers", () => {
  const result = calculateMinimumCashFlow({
    members: ["u1", "u2", "u3"],
    expenses: [
      { payerId: "u1", amountPaise: 9000 },
      { payerId: "u2", amountPaise: 3000 }
    ]
  });

  assert.deepEqual(result.balances, [
    { userId: "u1", netPaise: 5000 },
    { userId: "u2", netPaise: -1000 },
    { userId: "u3", netPaise: -4000 }
  ]);
  assert.deepEqual(result.settlements, [
    { fromUserId: "u3", toUserId: "u1", amountPaise: 4000 },
    { fromUserId: "u2", toUserId: "u1", amountPaise: 1000 }
  ]);
});

test("greedy matching reduces transfers for multiple creditors and debtors", () => {
  const result = calculateMinimumCashFlow({
    members: ["u1", "u2", "u3", "u4"],
    expenses: [
      { payerId: "u1", amountPaise: 16000 },
      { payerId: "u2", amountPaise: 8000 }
    ]
  });

  assert.deepEqual(result.balances, [
    { userId: "u1", netPaise: 10000 },
    { userId: "u2", netPaise: 2000 },
    { userId: "u3", netPaise: -6000 },
    { userId: "u4", netPaise: -6000 }
  ]);
  assert.deepEqual(result.settlements, [
    { fromUserId: "u3", toUserId: "u1", amountPaise: 6000 },
    { fromUserId: "u4", toUserId: "u1", amountPaise: 4000 },
    { fromUserId: "u4", toUserId: "u2", amountPaise: 2000 }
  ]);
});

test("omits zero-net users from balances and settlements", () => {
  const result = calculateMinimumCashFlow({
    members: ["u1", "u2"],
    expenses: [
      { payerId: "u1", amountPaise: 5000 },
      { payerId: "u2", amountPaise: 5000 }
    ]
  });

  assert.deepEqual(result.balances, []);
  assert.deepEqual(result.settlements, []);
});

test("distributes remainder deterministically by member order", () => {
  assert.deepEqual(distributeExpenseShare(100, ["u1", "u2", "u3"]), [
    { userId: "u1", sharePaise: 34 },
    { userId: "u2", sharePaise: 33 },
    { userId: "u3", sharePaise: 33 }
  ]);

  const result = calculateMinimumCashFlow({
    members: ["u3", "u1", "u2"],
    expenses: [{ payerId: "u3", amountPaise: 100 }]
  });

  assert.equal(
    result.balances.reduce((sum, balance) => sum + balance.netPaise, 0),
    0
  );
  assert.deepEqual(result.balances, [
    { userId: "u1", netPaise: -34 },
    { userId: "u2", netPaise: -33 },
    { userId: "u3", netPaise: 67 }
  ]);
});

test("returns no balances and no settlements for empty expense arrays", () => {
  const result = calculateMinimumCashFlow({
    members: ["u1", "u2", "u3"],
    expenses: []
  });

  assert.deepEqual(result.balances, []);
  assert.deepEqual(result.settlements, []);
});

test("rejects expenses whose payer is not a hangout member", () => {
  assert.throws(
    () =>
      calculateMinimumCashFlow({
        members: ["u1", "u2"],
        expenses: [{ payerId: "u3", amountPaise: 1000 }]
      }),
    /is not a member/
  );
});

test("calculateDirectSettlements preserves pairwise dues while netting opposite-direction spend", () => {
  const result = calculateDirectSettlements({
    members: ["raaj", "izaz", "rachana"],
    expenses: [
      { payerId: "raaj", amountPaise: 30000 },
      { payerId: "izaz", amountPaise: 90000 }
    ]
  });

  assert.deepEqual(result.settlements, [
    { fromUserId: "rachana", toUserId: "izaz", amountPaise: 30000 },
    { fromUserId: "raaj", toUserId: "izaz", amountPaise: 20000 },
    { fromUserId: "rachana", toUserId: "raaj", amountPaise: 10000 }
  ]);
});
