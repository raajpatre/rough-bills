function buildArchivedDebtSummary(hangouts, currentUserId) {
  const iOweByCounterparty = new Map();
  const owedToMeByCounterparty = new Map();

  for (const hangout of hangouts) {
    for (const settlement of hangout.summary.settlements) {
      const remainingAmountPaise = settlement.remainingAmountPaise ?? settlement.amountPaise;
      if (remainingAmountPaise <= 0) {
        continue;
      }

      if (settlement.fromUserId === currentUserId) {
        const counterparty = upsertBreakdownEntry(iOweByCounterparty, {
          counterpartyUserId: settlement.toUserId,
          counterpartyName: settlement.toName
        });
        counterparty.totalPaise += remainingAmountPaise;
        counterparty.hangouts.push({
          hangoutId: hangout.id,
          hangoutName: hangout.name,
          roomCode: hangout.roomCode,
          amountPaise: remainingAmountPaise
        });
      }

      if (settlement.toUserId === currentUserId) {
        const counterparty = upsertBreakdownEntry(owedToMeByCounterparty, {
          counterpartyUserId: settlement.fromUserId,
          counterpartyName: settlement.fromName
        });
        counterparty.totalPaise += remainingAmountPaise;
        counterparty.hangouts.push({
          hangoutId: hangout.id,
          hangoutName: hangout.name,
          roomCode: hangout.roomCode,
          amountPaise: remainingAmountPaise
        });
      }
    }
  }

  const iOweBreakdown = Array.from(iOweByCounterparty.values()).sort(sortBreakdownEntries);
  const owedToMeBreakdown = Array.from(owedToMeByCounterparty.values()).sort(sortBreakdownEntries);

  return {
    totalIOwePaise: sumBreakdownTotals(iOweBreakdown),
    totalOwedToMePaise: sumBreakdownTotals(owedToMeBreakdown),
    iOweBreakdown,
    owedToMeBreakdown
  };
}

function upsertBreakdownEntry(map, { counterpartyUserId, counterpartyName }) {
  if (!map.has(counterpartyUserId)) {
    map.set(counterpartyUserId, {
      counterpartyUserId,
      counterpartyName,
      totalPaise: 0,
      hangouts: []
    });
  }

  return map.get(counterpartyUserId);
}

function sumBreakdownTotals(entries) {
  return entries.reduce((total, entry) => total + entry.totalPaise, 0);
}

function sortBreakdownEntries(left, right) {
  if (right.totalPaise !== left.totalPaise) {
    return right.totalPaise - left.totalPaise;
  }

  return left.counterpartyName.localeCompare(right.counterpartyName);
}

module.exports = {
  buildArchivedDebtSummary
};
