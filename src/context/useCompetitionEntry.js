import { useContext } from "react";
import { CompetitionEntryContext } from "./entryContext";

export function useCompetitionEntry() {
  const context = useContext(CompetitionEntryContext);
  if (!context) throw new Error("useCompetitionEntry must be used within CompetitionEntryProvider.");
  return context;
}
