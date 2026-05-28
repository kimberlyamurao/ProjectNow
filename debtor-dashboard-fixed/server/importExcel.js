require("dotenv").config();

const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const filePath = path.join(__dirname, "Project NOW.xlsx");

const workbook = XLSX.readFile(filePath);

const sheet = workbook.Sheets[workbook.SheetNames[0]];

const rows = XLSX.utils.sheet_to_json(sheet);

async function upload() {
  console.log("Uploading Excel data...");

  for (const row of rows) {
    const payload = {
      id: String(row.ID || ""),
      name: row.Name || "",
      balance: Number(row.Balance || 0),
      oldest_inv_days: Number(row.OldestDays || 0),
      owner: row.Owner || "",
      action: row.Action || ""
    };

    const { error } = await supabase
      .from("debtors")
      .upsert(payload);

    if (error) {
      console.log(error);
    }
  }

  console.log("Upload complete!");
}

upload();