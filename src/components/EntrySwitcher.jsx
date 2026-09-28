import { useCompetitionEntry } from "../context/useCompetitionEntry";

function EntrySwitcher() {
  const {
    entries,
    currentEntry,
    currentEntryId,
    loadingEntries,
    creatingEntry,
    entryError,
    selectEntry,
    createEntry,
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
      <button type="button" onClick={createEntry} disabled={creatingEntry || loadingEntries}>
        {creatingEntry ? "Creating…" : "Add entry"}
      </button>
      {entryError && <span className="entry-switcher-error" role="alert">{entryError}</span>}
    </div>
  );
}

export default EntrySwitcher;
