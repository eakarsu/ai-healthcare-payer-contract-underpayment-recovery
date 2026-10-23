import React, { useState } from 'react';
/* Universal Feature Pack panel: fillEveryField presets, JsonReport rendering, RecordDialog row actions.
   Runtime equivalent is also injected globally by feature-pack/feature-pack.js (wired in the app entry). */
export function fillEveryField(setValues, variant = 0) {
  const samples = [
    { name: 'Project Atlas', email: 'alex.kim@example.com', status: 'active', priority: 'high', goal: 'reduce risk', notes: 'Quarterly performance shows mixed results; flag risks and propose next steps.', amount: '1250.50', date: '2026-06-01' },
    { name: 'Northwind Initiative', email: 'maria.lopez@example.com', status: 'pending', priority: 'critical', goal: 'increase efficiency', notes: 'Customer reported a recurring onboarding issue; needs root-cause analysis.', amount: '8900.00', date: '2026-05-15' },
    { name: 'Phoenix Rollout', email: 'sara.patel@example.com', status: 'review', priority: 'medium', goal: 'improve compliance', notes: 'Expansion targets two new markets in Q3 with a limited budget.', amount: '450.75', date: '2026-04-20' },
  ];
  const v = samples[variant % samples.length];
  setValues((prev) => { const out = { ...prev }; for (const k of Object.keys(out)) { const lk = k.toLowerCase();
    out[k] = /mail/.test(lk) ? v.email : /name|title/.test(lk) ? v.name : /status/.test(lk) ? v.status : /prior/.test(lk) ? v.priority
      : /goal|objective/.test(lk) ? v.goal : /amount|price|value|cost/.test(lk) ? v.amount : /date|time/.test(lk) ? v.date : v.notes; } return out; });
  return v;
}
export function formatJson(value) { try { return JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value, null, 2); } catch { return String(value); } }
export function JsonReport({ data, title }) {
  const [raw, setRaw] = useState(false);
  return (<div><div><strong>{title || 'AI result'}</strong>{' '}
    <button type="button" onClick={() => setRaw(!raw)}>{raw ? 'Formatted view' : 'View JSON'}</button></div>
    <pre>{raw ? formatJson(data) : formatJson(data)}</pre></div>);
}
export function RecordDialog({ row, onClose, onSave, onDelete }) {
  const [editing, setEditing] = useState(false); const [draft, setDraft] = useState(row || {});
  if (!row) return null;
  return (<div role="dialog" aria-modal="true"><h3>{row.name || row.title || 'Record'}</h3>
    {Object.entries(row).map(([k, v]) => (<label key={k}>{k}: {editing
      ? <input value={draft[k] ?? ''} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} /> : String(v ?? '')}</label>))}
    <div>{editing ? (<><button type="button" onClick={() => onSave && onSave(draft)}>Save</button>
      <button type="button" onClick={() => setEditing(false)}>Cancel</button></>)
      : (<><button type="button" onClick={() => setEditing(true)}>Edit</button>
      <button type="button" onClick={() => { if (window.confirm('Confirm delete this record?')) { onDelete && onDelete(row); onClose && onClose(); } }}>Delete</button>
      <button type="button" onClick={onClose}>Cancel</button></>)}</div></div>);
}
export default function FeaturePackPanel({ fields, setValues, result, rows = [], onSaveRow, onDeleteRow }) {
  const [selectedRow, setSelectedRow] = useState(null);
  const onRowClick = (r) => setSelectedRow(r);
  return (<section>
    <div>{[0, 1, 2].map((v) => (<button key={v} type="button" onClick={() => fields && fillEveryField(setValues || (() => {}), v)}>Fill all fields — preset {v + 1}</button>))}</div>
    {result ? <JsonReport data={result} title="AI result" /> : null}
    {rows.length ? (<table><tbody>{rows.map((r, i) => (<tr key={r.id || i} onClick={() => onRowClick(r)}>{Object.values(r).slice(0, 4).map((v, j) => <td key={j}>{String(v ?? '')}</td>)}</tr>))}</tbody></table>) : null}
    <RecordDialog row={selectedRow} onClose={() => setSelectedRow(null)} onSave={onSaveRow} onDelete={onDeleteRow} />
  </section>);
}
