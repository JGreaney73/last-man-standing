import { useCompetitionEntry } from "../context/useCompetitionEntry";

function EntrySwitcher() {
  const {
    entries,
    currentEntry,
    currentEntryId,
    loadingEntries,
    entryError,
    selectEntry,
  } = useCompetitionEntry();

  return (
    <div className="entry-switcher">
      <label>
        <span>My entries</span>
        <select
          aria-label="Current competition entry"
          value={currentEntryId}
          disabled={loadingEntries || entries.length === 0}
          onChange={(event) => selectEntry(event.target.value)}
        >
          {entries.length === 0 && (
            <option value="">{loadingEntries ? "Loading entries…" : "No entries provisioned"}</option>
          )}
          {entries.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name} · {entry.competition_status === "active" ? "Active" : "Eliminated"}
            </option>
          ))}
        </select>
      </label>
      <span className={`entry-status ${currentEntry?.competition_status === "eliminated" ? "entry-status-out" : "entry-status-active"}`}>
        {loadingEntries ? "Loading" : currentEntry?.competition_status === "eliminated" ? "Eliminated" : currentEntry ? "Active" : "Unavailable"}
      </span>
      {entryError && <span className="entry-switcher-error" role="alert">{entryError}</span>}
    </div>
  );
}

export default EntrySwitcher;
