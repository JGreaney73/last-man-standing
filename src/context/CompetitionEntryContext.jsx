import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { CompetitionEntryContext } from "./entryContext";

export function CompetitionEntryProvider({ userId, children }) {
  const [entries, setEntries] = useState([]);
  const [currentEntryId, setCurrentEntryId] = useState("");
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [entryError, setEntryError] = useState("");

  const loadEntries = useCallback(async ({ silent = false } = {}) => {
    if (!supabase || !userId) return;

    if (!silent) setLoadingEntries(true);
    setEntryError("");
    const { data, error } = await supabase
      .from("competition_entries")
      .select("id, entry_number, name, competition_status, eliminated_round_id")
      .eq("user_id", userId)
      .order("entry_number");

    if (error) {
      setEntryError(error.message);
      setEntries([]);
    } else {
      const loadedEntries = data ?? [];
      setEntries(loadedEntries);
      const storageKey = `lms-current-entry-${userId}`;
      const savedEntryId = window.localStorage.getItem(storageKey);
      const chosenEntry = loadedEntries.find((entry) => String(entry.id) === savedEntryId)
        ?? loadedEntries[0];
      setCurrentEntryId(chosenEntry ? String(chosenEntry.id) : "");
    }
    if (!silent) setLoadingEntries(false);
  }, [userId]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      loadEntries().catch((error) => {
        setEntryError(error.message);
        setLoadingEntries(false);
      });
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [loadEntries]);

  useEffect(() => {
    const refreshEntries = () => loadEntries({ silent: true }).catch((error) => {
      setEntryError(error.message);
    });
    const intervalId = window.setInterval(refreshEntries, 30000);
    window.addEventListener("focus", refreshEntries);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshEntries);
    };
  }, [loadEntries]);

  const selectEntry = (entryId) => {
    const entry = entries.find((item) => String(item.id) === String(entryId));
    if (!entry) return;
    setCurrentEntryId(String(entry.id));
    window.localStorage.setItem(`lms-current-entry-${userId}`, String(entry.id));
  };

  const currentEntry = entries.find((entry) => String(entry.id) === currentEntryId) ?? null;

  return (
    <CompetitionEntryContext.Provider value={{
      entries,
      currentEntry,
      currentEntryId,
      loadingEntries,
      entryError,
      selectEntry,
      refreshEntries: loadEntries,
    }}>
      {children}
    </CompetitionEntryContext.Provider>
  );
}
