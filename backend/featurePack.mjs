// Feature pack: search/filter, CSV/JSON export, deterministic domain insights over own records.
// Offline fallback only — never calls a provider. Labelled aiGenerated:false.
export function filterRecords(records, { q = "", status = "", risk = "", state = "" } = {}) {
  const needle = String(q || "").trim().toLowerCase();
  return (Array.isArray(records) ? records : []).filter((r) => {
    if (status && String(r.status ?? "") !== status) return false;
    if (state && String(r.state ?? r.status ?? "") !== state) return false;
    if (risk && String(r.risk ?? "") !== risk) return false;
    if (needle && !JSON.stringify(r ?? {}).toLowerCase().includes(needle)) return false;
    return true;
  });
}
export function toCSV(records) {
  const rows = Array.isArray(records) ? records : [];
  if (!rows.length) return "id\n";
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r || {})))];
  const esc = (v) => { const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? `"${s.replaceAll('"','""')}"` : s; };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n") + "\n";
}
export function deterministicInsights(records, titles = []) {
  const rows = Array.isArray(records) ? records : [];
  const totalAmount = rows.reduce((s, r) => s + (Number(r.amount ?? r.payload?.amount) || 0), 0);
  const open = rows.filter((r) => !["Closed","Approved","DONE","closed","approved"].includes(String(r.status ?? r.state ?? ""))).length;
  const high = rows.filter((r) => ["High","Critical"].includes(String(r.risk ?? ""))).length;
  const zero = rows.filter((r) => Number(r.amount ?? 1) === 0).length;
  const t = titles.length === 3 ? titles : ["Operational triage","Evidence & status gap","Deadline & concentration risk"];
  const make = (i, detail, extra) => ({ id: `insight-${i+1}`, title: t[i], aiGenerated: false, label: "Deterministic fallback (offline) \u2014 not AI-generated", source: "deterministic-fallback",
    metrics: [{label:"Records reviewed",value:rows.length},{label:"Open records",value:open},{label:"High/Critical risk",value:high},{label:"Total amount",value:totalAmount},{label:"Zero-amount records",value:zero}, ...extra],
    sections: [{title:"Finding (deterministic)",detail},{title:"Records scope",detail:`Computed over ${rows.length} own record(s); open=${open}; highRisk=${high}; zeroAmount=${zero}.`},{title:"Human review",detail:"Operational only. Confirm source records and accountable owner before action. No diagnosis or clinical decision."}],
    actions: ["Assign accountable owner","Validate source evidence","Retain review evidence"] });
  return [ make(0, rows.length ? `${open} of ${rows.length} record(s) remain open; ${high} are High/Critical risk.` : "No records in scope; counts are 0 and preserved as 0.", []),
           make(1, `${zero} record(s) have amount 0 (preserved, not hidden); total amount is ${totalAmount}.`, []),
           make(2, high ? `${high} high-risk record(s) need priority review.` : "No High/Critical records in scope (value 0 preserved).", []) ];
}
export function mountFeaturePack(app, { pool, auth, table, titles } = {}) {
  const guard = typeof auth === "function" ? auth : (_req,_res,next)=>next();
  const load = async (req) => {
    if (Array.isArray(req.body?.records)) return req.body.records;
    if (!pool || !table) return [];
    const fid = req.query?.feature || req.body?.featureId;
    if (table === "feature_records" && fid) return (await pool.query("SELECT * FROM feature_records WHERE feature_id=$1 ORDER BY updated_at DESC LIMIT 200",[fid])).rows;
    return (await pool.query(`SELECT * FROM ${table} ORDER BY 1 DESC LIMIT 200`)).rows;
  };
  const exportHandler = async (req, res) => { const rows = filterRecords(await load(req), req.query || {}); const fmt = String(req.query?.format||"json").toLowerCase();
    if (fmt === "csv") { res.setHeader("Content-Type","text/csv"); res.setHeader("Content-Disposition","attachment; filename=records.csv"); return res.send(toCSV(rows)); }
    return res.json({ items: rows, count: rows.length, aiGenerated: false }); };
  const insightsHandler = async (req, res) => { const rows = filterRecords(await load(req), req.body || req.query || {}); return res.json({ aiGenerated:false, label:"Deterministic fallback (offline) \u2014 not AI-generated", source:"deterministic-fallback", insights: deterministicInsights(rows, titles) }); };
  // auth may be global (grid/h2a) — guard is a no-op there; recovery passes real auth.
  const useGuard = typeof auth === "function";
  if (useGuard) { app.get("/api/export/records", guard, exportHandler); app.post("/api/ai/insights", guard, insightsHandler); app.get("/api/ai/insights", guard, insightsHandler); }
  else { app.get("/api/export/records", exportHandler); app.post("/api/ai/insights", insightsHandler); app.get("/api/ai/insights", insightsHandler); }
}
