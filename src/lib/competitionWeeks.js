export function competitionWeek(roundNumber, startingRound) {
  const week = Number(roundNumber) - Number(startingRound) + 1;
  return Number.isInteger(week) && week > 0 ? week : null;
}

export function competitionWeekLabel(roundNumber, startingRound) {
  const week = competitionWeek(roundNumber, startingRound);
  return week === null ? "Before competition" : `Week ${week}`;
}