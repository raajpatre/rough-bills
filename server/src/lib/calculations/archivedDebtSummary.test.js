const test = require("node:test");
const assert = require("node:assert/strict");

const { buildArchivedDebtSummary } = require("./buildArchivedDebtSummary");

test("buildArchivedDebtSummary uses only remaining closed-hangout dues for the current user", () => {
  const result = buildArchivedDebtSummary(
    [
      {
        id: "h1",
        name: "Dinner",
        roomCode: "DIN123",
        status: "CLOSED",
        summary: {
          settlements: [
            {
              fromUserId: "me",
              toUserId: "u2",
              fromName: "me",
              toName: "ria",
              amountPaise: 5000,
              remainingAmountPaise: 2000
            },
            {
              fromUserId: "u3",
              toUserId: "me",
              fromName: "aman",
              toName: "me",
              amountPaise: 4000,
              remainingAmountPaise: 1500
            }
          ]
        }
      },
      {
        id: "h2",
        name: "Trip",
        roomCode: "TRP456",
        status: "CLOSED",
        summary: {
          settlements: [
            {
              fromUserId: "me",
              toUserId: "u2",
              fromName: "me",
              toName: "ria",
              amountPaise: 2000,
              remainingAmountPaise: 500
            },
            {
              fromUserId: "u4",
              toUserId: "u5",
              fromName: "neel",
              toName: "tara",
              amountPaise: 7000,
              remainingAmountPaise: 7000
            }
          ]
        }
      }
    ],
    "me"
  );

  assert.equal(result.totalIOwePaise, 2500);
  assert.equal(result.totalOwedToMePaise, 1500);
  assert.deepEqual(result.iOweBreakdown, [
    {
      counterpartyUserId: "u2",
      counterpartyName: "ria",
      totalPaise: 2500,
      hangouts: [
        {
          hangoutId: "h1",
          hangoutName: "Dinner",
          roomCode: "DIN123",
          amountPaise: 2000
        },
        {
          hangoutId: "h2",
          hangoutName: "Trip",
          roomCode: "TRP456",
          amountPaise: 500
        }
      ]
    }
  ]);
  assert.deepEqual(result.owedToMeBreakdown, [
    {
      counterpartyUserId: "u3",
      counterpartyName: "aman",
      totalPaise: 1500,
      hangouts: [
        {
          hangoutId: "h1",
          hangoutName: "Dinner",
          roomCode: "DIN123",
          amountPaise: 1500
        }
      ]
    }
  ]);
});
