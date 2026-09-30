import fs from "node:fs";
import process from "node:process";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";

const csvPath = process.argv[2];
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!csvPath) throw new Error("Provide a participants CSV file path.");
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script."
  );
}

const csv = fs.readFileSync(csvPath, "utf8");
const { data: rows, errors } = Papa.parse(csv, {
  header: true,
  skipEmptyLines: true,
  transformHeader: (header) => header.trim().replace(/^\uFEFF/, ""),
});

if (errors.length > 0 || rows.length === 0) {
  throw new Error("The participants CSV could not be parsed or contains no rows.");
}

const requiredColumns = ["email", "participant_name", "entry_name"];
const missingColumns = requiredColumns.filter(
  (column) => !Object.hasOwn(rows[0], column)
);
if (missingColumns.length > 0) {
  throw new Error(`Missing CSV columns: ${missingColumns.join(", ")}`);
}

const participants = new Map();
for (const [index, row] of rows.entries()) {
  const email = String(row.email ?? "").trim().toLowerCase();
  const participantName = String(row.participant_name ?? "").trim();
  const entryName = String(row.entry_name ?? "").trim();
  if (!email || !participantName || !entryName) {
    throw new Error(`CSV row ${index + 2} must include an email, participant name, and entry name.`);
  }

  const participant = participants.get(email) ?? {
    name: participantName,
    entryNames: [],
  };
  if (participant.name !== participantName) {
    throw new Error(`Participant name must be consistent for ${email}.`);
  }
  participant.entryNames.push(entryName);
  participants.set(email, participant);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const authUsers = [];
for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  authUsers.push(...data.users);
  if (data.users.length < 1000) break;
}

const usersByEmail = new Map(
  authUsers
    .filter((user) => user.email)
    .map((user) => [user.email.toLowerCase(), user])
);

const missingUsers = [...participants.keys()].filter((email) => !usersByEmail.has(email));
if (missingUsers.length > 0) {
  throw new Error(`Create these Supabase Auth users before importing: ${missingUsers.join(", ")}`);
}

for (const [email, participant] of participants) {
  const user = usersByEmail.get(email);

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name: participant.name }, { onConflict: "id" });
  if (profileError) throw profileError;

  const entries = participant.entryNames.map((name, index) => ({
    user_id: user.id,
    entry_number: index + 1,
    name,
  }));
  const { error: entriesError } = await supabase
    .from("competition_entries")
    .upsert(entries, { onConflict: "user_id,entry_number" });
  if (entriesError) throw entriesError;
  console.log(`Imported ${entries.length} entries for ${participant.name} (${email}).`);
}