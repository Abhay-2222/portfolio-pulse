import { readFileSync, writeFileSync } from "fs";
import path from "path";
import * as XLSX from "xlsx";

const file = path.join(process.cwd(), "data", "Enterprise_Portfolio_Data.xlsx");
const wb = XLSX.read(readFileSync(file), { type: "buffer", cellDates: true });
const sheet = wb.Sheets.Settings;
if (!sheet) {
  throw new Error("Settings sheet missing");
}
const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
  header: 1,
  defval: null,
  raw: true,
});
let hit = false;
for (let i = 0; i < rows.length; i++) {
  if (String(rows[i]?.[0] ?? "").trim() !== "AutoRefreshMinutes") continue;
  const addr = XLSX.utils.encode_cell({ r: i, c: 1 });
  sheet[addr] = { t: "n", v: 5 };
  hit = true;
  break;
}
if (!hit) {
  const next = rows.length;
  sheet[XLSX.utils.encode_cell({ r: next, c: 0 })] = {
    t: "s",
    v: "AutoRefreshMinutes",
  };
  sheet[XLSX.utils.encode_cell({ r: next, c: 1 })] = { t: "n", v: 5 };
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  range.e.r = Math.max(range.e.r, next);
  sheet["!ref"] = XLSX.utils.encode_range(range);
}
writeFileSync(file, XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log("Set AutoRefreshMinutes=5 in", file);
