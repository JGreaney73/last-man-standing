export const competition = {
  name:
    "Aspendale Stingrays Last Man Standing",
  currentWeek: 5,
  entryFee: 20,
  season: "2026/27",
};

export function calculatePrizePool(playerCount) {
  return competition.entryFee * playerCount * 0.6;
}