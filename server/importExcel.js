const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

// Debug env loading
console.log("SUPABASE_URL =", process.env.SUPABASE_URL);
console.log("SUPABASE_ANON_KEY =", process.env.SUPABASE_ANON_KEY);

// Check env variables
if (!process.env.SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL in server/.env");
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error("Missing SUPABASE_ANON_KEY in server/.env");
}

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Excel file path
const filePath = path.join(__dirname, "Project NOW.xlsx");

// Check if file exists
if (!fs.existsSync(filePath)) {
  throw new Error(`Excel file not found: ${filePath}`);
}

// Read workbook
const workbook = XLSX.readFile(filePath);

// Get first sheet
const sheet = workbook.Sheets[workbook.SheetNames[0]];

// Convert sheet to JSON
const rows = XLSX.utils.sheet_to_json(sheet);

// Upload function
async function upload() {
  try {
    console.log("Uploading Excel data...");

    for (const row of rows) {
      const payload = {
        id: String(row.ID || ""),
        name: row.Name || "",
        balance: Number(row.Balance || 0),
        oldest_inv_days: Number(row.OldestDays || 0),
        owner: row.Owner || "",
        action: row.Action || "",
      };

      const { error } = await supabase
        .from("debtors")
        .upsert(payload);

      if (error) {
        console.log("Upload error:", error.message);
      } else {
        console.log(`Uploaded: ${payload.name}`);
      }
    }

    console.log("Upload complete!");
  } catch (err) {
    console.log("ERROR:", err.message);
  }
}

upload();