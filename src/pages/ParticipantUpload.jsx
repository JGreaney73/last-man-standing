import { useRef, useState } from "react";
import Papa from "papaparse";

function ParticipantUpload({ onImport }) {
  const fileInputRef = useRef(null);

  const [selectedFileName, setSelectedFileName] =
    useState("");

  const [previewParticipants, setPreviewParticipants] =
    useState([]);

  const [uploadMessage, setUploadMessage] =
    useState("");

  const [uploadError, setUploadError] =
    useState("");

  const findName = (row) => {
    const keys = Object.keys(row);

    const nameColumn = keys.find(
      (key) =>
        key.trim().toLowerCase() === "name"
    );

    if (!nameColumn) {
      return "";
    }

    return String(
      row[nameColumn] || ""
    ).trim();
  };

  const handleFileSelection = (event) => {
    const selectedFile =
      event.target.files[0];

    setUploadMessage("");
    setUploadError("");
    setPreviewParticipants([]);

    if (!selectedFile) {
      return;
    }

    if (
      !selectedFile.name
        .toLowerCase()
        .endsWith(".csv")
    ) {
      setUploadError(
        "Please upload a CSV file."
      );

      return;
    }

    setSelectedFileName(
      selectedFile.name
    );

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,

      complete: (results) => {

        const importedParticipants =
          results.data
            .map((row, index) => {
              const name =
                findName(row);

              if (!name) {
                return null;
              }

              return {
                id:
                  Date.now() + index,

                name,

                selection:
                  "Not selected",

                status: "Alive",
              };
            })
            .filter(Boolean);

        if (
          importedParticipants.length === 0
        ) {
          setUploadError(
            'No participant names found. Ensure your CSV contains a "Name" column.'
          );

          return;
        }

        setPreviewParticipants(
          importedParticipants
        );

        setUploadMessage(
          `${importedParticipants.length} participant(s) ready to import.`
        );
      },

      error: () => {
        setUploadError(
          "Unable to read file."
        );
      },
    });
  };

  const confirmImport = () => {

    if (
      previewParticipants.length === 0
    ) {
      return;
    }

    onImport(
      previewParticipants
    );

    setUploadMessage(
      `${previewParticipants.length} participant(s) imported successfully.`
    );

    setPreviewParticipants([]);

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  };

  const cancelImport = () => {
    setPreviewParticipants([]);
    setUploadError("");
    setUploadMessage("");
    setSelectedFileName("");

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  };

  return (
    <section className="admin-section">

      <div className="admin-section-heading">

        <div>
          <p className="admin-section-label">
            Competition Setup
          </p>

          <h2>
            Import Participants
          </h2>
        </div>

      </div>

      <p className="section-description">
        Upload a CSV containing a
        single Name column. All
        imported participants will
        automatically be marked as
        Alive.
      </p>

      <div className="participant-upload-area">

        <label
          htmlFor="participant-file"
          className="participant-file-label"
        >
          Choose CSV File
        </label>

        <input
          id="participant-file"
          type="file"
          accept=".csv"
          ref={fileInputRef}
          onChange={
            handleFileSelection
          }
          className="participant-file-input"
        />

        <span className="selected-file-name">
          {selectedFileName ||
            "No file selected"}
        </span>

      </div>

      <div className="csv-format-help">

        <strong>
          Required format
        </strong>

        <code>
          Name
        </code>

      </div>

      {uploadError && (
        <div className="upload-error">
          {uploadError}
        </div>
      )}

      {uploadMessage && (
        <div className="upload-success">
          {uploadMessage}
        </div>
      )}

      {previewParticipants.length >
        0 && (

        <div className="participant-preview">

          <h3>
            Import Preview
          </h3>

          <table className="fixture-table">

            <thead>
              <tr>
                <th>Name</th>
                <th>Selection</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>

              {previewParticipants.map(
                (
                  participant
                ) => (
                  <tr
                    key={
                      participant.id
                    }
                  >

                    <td>
                      {
                        participant.name
                      }
                    </td>

                    <td>
                      Not selected
                    </td>

                    <td>
                      Alive
                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

          <div className="import-actions">

            <button
              className="import-participants-btn"
              onClick={
                confirmImport
              }
            >
              Import Participants
            </button>

            <button
              className="cancel-import-btn"
              onClick={
                cancelImport
              }
            >
              Cancel
            </button>

          </div>

        </div>
      )}

    </section>
  );
}

export default ParticipantUpload;