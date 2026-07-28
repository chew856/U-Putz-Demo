// Local JSON database that speaks enough of the supabase-js / PostgREST API for this demo:
// chainable filters, insert/update/delete with returning, or()-strings, one-level embeds
// (e.g. customers(name)), count/head, and the adjust_hours / adjust_points RPCs.
// Data lives in data/db.json (auto-seeded with U-Puttz demo data on first run).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { winnipegTodayISO } from './booking.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

const TABLES = ['settings', 'bookings', 'customers', 'bay_categories', 'booking_statuses', 'tags',
  'memberships', 'price_templates', 'schedule_overrides', 'schedule_templates', 'hour_cards',
  'hour_transactions', 'point_transactions'];

// Column defaults applied on insert (mirrors the old Postgres schema defaults).
const DEFAULTS = {
  bookings: { status: 'confirmed', source: 'online', tags: [], status_label: null, customer_name: null,
    customer_email: null, customer_phone: null, amount_cents: null, stripe_payment_intent: null,
    note: null, expires_at: null, cancelled_at: null },
  customers: { name: null, email: null, phone: null, membership_id: null, membership_expires: null,
    membership_flag: null, notes: null, hours_balance_min: 0, points_balance: 0, sms_opt_in: true,
    waiver_code: null, waiver_name: null, waiver_signed_at: null, waiver_version: null,
    legacy_bookings: 0, legacy_cancelled: 0, legacy_no_show: 0, legacy_attendee: 0 },
  schedule_overrides: { is_closed: false, open_hour: null, close_hour: null, note: null, bay_ids: [],
    end_date: null, start_min: null, end_min: null, is_active: true, status_color: null, status_open: false },
  bay_categories: { color: '#bfd730', sort: 0 },
  booking_statuses: { color: '#4ec06a', sort: 0, kind: 'open' },
  tags: { color: '#c4e538' },
  memberships: { price_cents: 0, period: 'month', discount_pct: 0, perks: null, color: '#c4e538', sort: 0 },
  hour_cards: { hours: 0, price_cents: 0, color: '#4aa3ff', sort: 0 },
  hour_transactions: { kind: 'adjust', note: null, booking_id: null, ref: null },
  point_transactions: { kind: 'adjust', note: null, booking_id: null, ref: null },
};

// One-level foreign-key embeds: table -> { relatedTable: fkColumnOnThisTable }
const REL = {
  point_transactions: { customers: 'customer_id' },
  hour_transactions: { customers: 'customer_id' },
  customers: { memberships: 'membership_id' },
};

const nowISO = () => new Date().toISOString();

/* ---------- Seed data (U-Puttz Amusement Centre demo) ---------- */
function addDaysISO(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function seed() {
  const today = winnipegTodayISO();
  const tomorrow = addDaysISO(today, 1);
  const uuid = () => randomUUID();
  const ts = nowISO();

  const memberships = [
    { id: uuid(), name: 'Putt Club — Monthly', price_cents: 2999, period: 'month', discount_pct: 10,
      perks: '10% off sim time · free ball rental · member events', color: '#bfd730', sort: 0, created_at: ts },
    { id: uuid(), name: 'Putt Club — Annual', price_cents: 29900, period: 'year', discount_pct: 15,
      perks: '15% off sim time · 2 free guest passes · priority booking', color: '#f9a01c', sort: 1, created_at: ts },
  ];

  const customers = [
    { id: uuid(), name: 'Alex Friesen', email: 'alex.friesen@example.com', phone: '(204) 555-0142',
      hours_balance_min: 300, points_balance: 140, waiver_signed_at: ts, waiver_version: 'v2',
      waiver_name: 'Alex Friesen', waiver_code: 'UP-ALX42' },
    { id: uuid(), name: 'Sam Dyck', email: 'sam.dyck@example.com', phone: '(204) 555-0187',
      hours_balance_min: 0, points_balance: 60 },
    { id: uuid(), name: 'Jordan Peters', email: 'jordan.peters@example.com', phone: '(204) 555-0163',
      hours_balance_min: 120, points_balance: 25, membership_id: memberships[0].id,
      membership_expires: addDaysISO(today, 24) },
    { id: uuid(), name: 'Riley Hildebrand', email: 'riley.h@example.com', phone: '(204) 555-0119',
      hours_balance_min: 0, points_balance: 0 },
  ].map((c) => ({ ...DEFAULTS.customers, id: null, created_at: ts, ...c }));

  const bookings = [
    { bay_id: 'B1', booking_date: today, start_min: 17 * 60, end_min: 19 * 60, status: 'confirmed',
      status_label: 'Booked', customer_name: 'Jordan Peters', customer_email: 'jordan.peters@example.com',
      customer_phone: '(204) 555-0163', amount_cents: 6400, source: 'online' },
    { bay_id: 'B3', booking_date: today, start_min: 18 * 60, end_min: 19 * 60 + 30, status: 'confirmed',
      status_label: 'Checked In', customer_name: 'Sam Dyck', customer_email: 'sam.dyck@example.com',
      customer_phone: '(204) 555-0187', amount_cents: 4800, source: 'manager' },
    { bay_id: 'B5', booking_date: today, start_min: 19 * 60, end_min: 21 * 60, status: 'confirmed',
      status_label: 'Group Booking', customer_name: 'Friesen birthday party', customer_email: 'alex.friesen@example.com',
      customer_phone: '(204) 555-0142', amount_cents: 7200, source: 'manager', note: 'Birthday — 6 guests, cake at 8' },
    { bay_id: 'B2', booking_date: tomorrow, start_min: 12 * 60, end_min: 14 * 60, status: 'blocked',
      note: 'Maintenance — projector service', source: 'manager' },
    { bay_id: 'B4', booking_date: tomorrow, start_min: 18 * 60, end_min: 20 * 60, status: 'confirmed',
      status_label: 'Booked', customer_name: 'Riley Hildebrand', customer_email: 'riley.h@example.com',
      customer_phone: '(204) 555-0119', amount_cents: 6400, source: 'online' },
  ].map((b) => ({ ...DEFAULTS.bookings, id: uuid(), created_at: ts, ...b }));

  const hour_transactions = [
    { id: uuid(), customer_id: customers[0].id, minutes: 300, kind: 'purchase', note: '5-Hour Card purchase', booking_id: null, ref: 'seed-hours-1', created_at: ts },
    { id: uuid(), customer_id: customers[2].id, minutes: 120, kind: 'purchase', note: 'Promo credit', booking_id: null, ref: 'seed-hours-2', created_at: ts },
  ];
  const point_transactions = [
    { id: uuid(), customer_id: customers[0].id, points: 140, kind: 'earn', note: 'Time played', booking_id: null, ref: 'seed-pts-1', created_at: ts },
    { id: uuid(), customer_id: customers[1].id, points: 60, kind: 'earn', note: 'Time played', booking_id: null, ref: 'seed-pts-2', created_at: ts },
    { id: uuid(), customer_id: customers[2].id, points: 25, kind: 'earn', note: 'Time played', booking_id: null, ref: 'seed-pts-3', created_at: ts },
  ];

  const statuses = [
    ['Booked', '#f3665e', 'booking'], ['Held', '#ed3623', 'booking'], ['Promotion', '#91226e', 'booking'],
    ['Call-In', '#ea331f', 'booking'], ['Walk-In', '#ed3623', 'booking'],
    ['Booked (Pending Confirmation)', '#ce9f1c', 'booking'], ['Group Booking', '#5a3d3a', 'booking'],
    ['Booked (Payment Accepted)', '#ed3623', 'booking'], ['Checked In', '#8099ff', 'booking'],
    ['Paid', '#9780ff', 'booking'], ['Held (Payment Pending)', '#a08b03', 'booking'],
    ['Break', '#c23d3d', 'closed'], ['Closed', '#ff0000', 'closed'], ['Maintenance', '#000000', 'closed'],
    ['Happy Hour', '#1398aa', 'open'], ['Open', '#5fb448', 'open'], ['Open (Prime Rate)', '#329532', 'open'],
    ['Please call (204) 582-2166 to book', '#329532', 'closed'], ['Reserved', '#f17b3b', 'closed'],
  ].map(([label, color, kind], i) => ({ id: uuid(), label, color, kind, sort: i, created_at: ts }));

  const hours = { 0: [9, 21], 1: [11, 23], 2: [11, 23], 3: [11, 23], 4: [11, 23], 5: [11, 23], 6: [9, 23] };
  const rates = { weekdayOffPeak: 25, weekdayPeak: 32, weekendOffPeak: 30, weekendPeak: 36, peakStartHour: 17 };

  return {
    settings: [{
      id: 1,
      bays: [
        { id: 'B1', name: 'The Albatross Bay', sim: 'Uneekor EYE XO', description: 'Tour-level ball & club data — built for serious practice' },
        { id: 'B2', name: 'The Eagle Bay', sim: 'Uneekor EYE XO', description: 'Full course play — 200+ world-famous courses' },
        { id: 'B3', name: 'The Birdie Bay', sim: 'Uneekor EYE XO', description: 'Casual rounds & closest-to-the-pin challenges' },
        { id: 'B4', name: 'The Mulligan Bay', sim: 'TrackMan 4', description: 'Beginner-friendly — on-screen tips and auto replays' },
        { id: 'B5', name: 'The Party Bay', sim: 'TrackMan 4', description: 'Our biggest bay — perfect for groups & birthdays' },
      ],
      hours, rates, bay_rates: {}, min_mins: 60, max_party: 6, slot_step: 30,
      weekly_status: {}, online_status_label: 'Booked',
      points: { earnPerHour: 5, redeemPer100: 10 }, pay: {}, updated_at: ts,
    }],
    bookings, customers, memberships, hour_transactions, point_transactions,
    booking_statuses: statuses,
    bay_categories: [
      { id: uuid(), name: 'Uneekor EYE XO', color: '#bfd730', sort: 0, created_at: ts },
      { id: uuid(), name: 'TrackMan 4', color: '#f9a01c', sort: 1, created_at: ts },
      { id: uuid(), name: 'Party Room', color: '#9b8cff', sort: 2, created_at: ts },
    ],
    tags: [
      { id: uuid(), name: 'Birthday', color: '#f9a01c', created_at: ts },
      { id: uuid(), name: 'League Night', color: '#4aa3ff', created_at: ts },
      { id: uuid(), name: 'VIP', color: '#bfd730', created_at: ts },
      { id: uuid(), name: 'Corporate', color: '#9b8cff', created_at: ts },
    ],
    price_templates: [
      { id: uuid(), name: 'Standard rates', rates, bay_ids: [], created_at: ts },
    ],
    schedule_templates: [
      { id: uuid(), name: 'Regular week', hours, created_at: ts },
    ],
    schedule_overrides: [],
    hour_cards: [
      { id: uuid(), name: '5-Hour Card', hours: 5, price_cents: 11000, color: '#4aa3ff', sort: 0, created_at: ts },
      { id: uuid(), name: '10-Hour Card', hours: 10, price_cents: 20000, color: '#4ec06a', sort: 1, created_at: ts },
      { id: uuid(), name: '20-Hour Card', hours: 20, price_cents: 38000, color: '#9b8cff', sort: 2, created_at: ts },
    ],
  };
}

/* ---------- Store ---------- */
let DB = null;
let persistOK = true;
let saveTimer = null;

function load() {
  if (DB) return DB;
  try {
    DB = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    DB = seed();
    // give the seeded customers real ids (seed uses null placeholders from the DEFAULTS merge)
    for (const c of DB.customers) if (!c.id) c.id = randomUUID();
    saveSoon();
  }
  for (const t of TABLES) DB[t] ||= [];
  return DB;
}

function saveSoon() {
  if (!persistOK) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(DB, null, 1));
    } catch (e) {
      persistOK = false;   // e.g. read-only serverless FS — run in-memory only
      console.warn('localdb: file persistence disabled:', e.message);
    }
  }, 250);
  if (saveTimer.unref) saveTimer.unref();
}

// Reset to a fresh seed (handy for demos): deletes the data file and reloads.
export function resetDb() {
  DB = null;
  try { fs.rmSync(DATA_FILE, { force: true }); } catch {}
  load();
}

/* ---------- Value comparison / filter helpers ---------- */
function cmp(a, b) {
  if (typeof a === 'number' || typeof b === 'number') {
    const na = Number(a), nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na < nb ? -1 : na > nb ? 1 : 0;
  }
  const sa = String(a), sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}
const isNil = (v) => v === null || v === undefined;

function likeRegex(pattern, insensitive) {
  const esc = String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.');
  return new RegExp('^' + esc + '$', insensitive ? 'i' : '');
}

function passes(row, f) {
  const v = f.col !== undefined ? row[f.col] : undefined;
  switch (f.m) {
    case 'eq': return !isNil(v) && cmp(v, f.val) === 0;
    case 'neq': return !isNil(v) && cmp(v, f.val) !== 0;
    case 'gt': return !isNil(v) && cmp(v, f.val) > 0;
    case 'gte': return !isNil(v) && cmp(v, f.val) >= 0;
    case 'lt': return !isNil(v) && cmp(v, f.val) < 0;
    case 'lte': return !isNil(v) && cmp(v, f.val) <= 0;
    case 'like': return !isNil(v) && likeRegex(f.val, false).test(String(v));
    case 'ilike': return !isNil(v) && likeRegex(f.val, true).test(String(v));
    case 'is': return f.val === null ? isNil(v) : v === f.val;
    case 'in': return !isNil(v) && (f.val || []).some((x) => cmp(v, x) === 0);
    case 'contains': return Array.isArray(v) && (f.val || []).every((x) => v.some((y) => cmp(x, y) === 0));
    case 'not': return !passes(row, { m: f.op, col: f.col, val: f.val });
    case 'or': return parseOr(f.str).some((c) => passes(row, c));
    default: return true;
  }
}

// PostgREST or() string: "col.op.value,col.op.value" (values may contain dots).
function parseOr(str) {
  return String(str || '').split(',').map((part) => {
    const i1 = part.indexOf('.');
    const i2 = part.indexOf('.', i1 + 1);
    if (i1 < 0 || i2 < 0) return { m: 'noop' };
    const col = part.slice(0, i1), op = part.slice(i1 + 1, i2);
    let val = part.slice(i2 + 1);
    if (op === 'is') val = val === 'null' ? null : val === 'true';
    return { m: op, col, val };
  });
}

/* ---------- Constraints (mirror the old Postgres schema) ---------- */
function bookingConflict(db, cand, excludeId) {
  if (cand.status === 'cancelled') return null;
  const s = Number(cand.start_min), e = Number(cand.end_min);
  for (const b of db.bookings) {
    if (b.id === excludeId || b.status === 'cancelled') continue;
    if (b.bay_id !== cand.bay_id || b.booking_date !== cand.booking_date) continue;
    if (s < Number(b.end_min) && e > Number(b.start_min)) {
      return { code: '23P01', message: 'conflicting key value violates exclusion constraint "bookings_no_overlap"' };
    }
  }
  return null;
}

function customerEmailConflict(db, email, excludeId) {
  if (!email) return null;
  const hit = db.customers.find((c) => c.id !== excludeId && c.email && String(c.email).toLowerCase() === String(email).toLowerCase());
  return hit ? { code: '23505', message: 'duplicate key value violates unique constraint "customers_email_key"' } : null;
}

/* ---------- Select-string parsing (projection + embeds) ---------- */
function parseSelect(cols) {
  const out = { star: false, cols: [], embeds: [] };
  const s = String(cols || '*').trim();
  if (!s || s === '*') { out.star = true; return out; }
  let depth = 0, tok = '';
  const toks = [];
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { toks.push(tok); tok = ''; } else tok += ch;
  }
  if (tok) toks.push(tok);
  for (const t of toks.map((x) => x.trim()).filter(Boolean)) {
    const m = t.match(/^([a-zA-Z_]+)\(([^)]*)\)$/);
    if (m) out.embeds.push({ table: m[1], cols: m[2].split(',').map((x) => x.trim()).filter(Boolean) });
    else if (t === '*') out.star = true;
    else out.cols.push(t);
  }
  return out;
}

function project(db, table, row, sel) {
  if (sel.star && !sel.embeds.length) return { ...row };
  const out = {};
  if (sel.star) Object.assign(out, row);
  else for (const c of sel.cols) out[c] = row[c] === undefined ? null : row[c];
  for (const em of sel.embeds) {
    const fk = (REL[table] || {})[em.table];
    let rel = null;
    if (fk && row[fk] != null) {
      const hit = (db[em.table] || []).find((r) => r.id === row[fk]);
      if (hit) {
        rel = {};
        for (const c of (em.cols.length ? em.cols : Object.keys(hit))) rel[c] = hit[c] === undefined ? null : hit[c];
      }
    }
    out[em.table] = rel;
  }
  return out;
}

/* ---------- Query builder ---------- */
class LocalQuery {
  constructor(table) {
    this.table = table;
    this.action = 'select';
    this.cols = '*';
    this.selOpts = {};
    this.filters = [];
    this.orders = [];
    this.limitN = null;
    this.mode = null;        // 'single' | 'maybeSingle'
    this.payload = null;
    this.returning = null;   // select() after insert/update/delete
  }
  select(cols, opts) {
    if (this.action === 'select') { this.cols = cols || '*'; this.selOpts = opts || {}; }
    else this.returning = cols || '*';
    return this;
  }
  insert(rows) { this.action = 'insert'; this.payload = rows; return this; }
  update(patch) { this.action = 'update'; this.payload = patch; return this; }
  delete() { this.action = 'delete'; return this; }
  eq(c, v) { this.filters.push({ m: 'eq', col: c, val: v }); return this; }
  neq(c, v) { this.filters.push({ m: 'neq', col: c, val: v }); return this; }
  gt(c, v) { this.filters.push({ m: 'gt', col: c, val: v }); return this; }
  gte(c, v) { this.filters.push({ m: 'gte', col: c, val: v }); return this; }
  lt(c, v) { this.filters.push({ m: 'lt', col: c, val: v }); return this; }
  lte(c, v) { this.filters.push({ m: 'lte', col: c, val: v }); return this; }
  like(c, v) { this.filters.push({ m: 'like', col: c, val: v }); return this; }
  ilike(c, v) { this.filters.push({ m: 'ilike', col: c, val: v }); return this; }
  is(c, v) { this.filters.push({ m: 'is', col: c, val: v }); return this; }
  in(c, v) { this.filters.push({ m: 'in', col: c, val: v }); return this; }
  contains(c, v) { this.filters.push({ m: 'contains', col: c, val: v }); return this; }
  not(c, op, v) { this.filters.push({ m: 'not', col: c, op, val: v }); return this; }
  or(str) { this.filters.push({ m: 'or', str }); return this; }
  order(c, o) { this.orders.push([c, !(o && o.ascending === false)]); return this; }
  limit(n) { this.limitN = n; return this; }
  range(a, b) { this.rangeAB = [a, b]; return this; }
  single() { this.mode = 'single'; return this; }
  maybeSingle() { this.mode = 'maybeSingle'; return this; }

  _exec() {
    const db = load();
    const rows = db[this.table];
    if (!rows) return { data: null, error: { message: `relation "${this.table}" does not exist` } };
    const match = () => rows.filter((r) => this.filters.every((f) => passes(r, f)));

    try {
      if (this.action === 'select') {
        let out = match();
        for (const [c, asc] of [...this.orders].reverse()) {
          out = [...out].sort((a, b) => {
            const av = a[c], bv = b[c];
            if (isNil(av) && isNil(bv)) return 0;
            if (isNil(av)) return 1;
            if (isNil(bv)) return -1;
            return asc ? cmp(av, bv) : cmp(bv, av);
          });
        }
        const count = (this.selOpts.count === 'exact') ? out.length : null;
        if (this.selOpts.head) return { data: null, error: null, count };
        if (this.rangeAB) out = out.slice(this.rangeAB[0], this.rangeAB[1] + 1);
        if (this.limitN != null) out = out.slice(0, this.limitN);
        const sel = parseSelect(this.cols);
        let data = out.map((r) => project(db, this.table, r, sel));
        return this._shape(data, count);
      }

      if (this.action === 'insert') {
        const list = Array.isArray(this.payload) ? this.payload : [this.payload];
        const inserted = [];
        // validate everything first so a multi-row insert is all-or-nothing
        for (const raw of list) {
          const row = { id: raw.id || randomUUID(), created_at: raw.created_at || nowISO(),
            ...(DEFAULTS[this.table] || {}), ...raw };
          if (this.table === 'bookings') {
            const err = bookingConflict(db, row, null);
            if (err) return { data: null, error: err };
          }
          if (this.table === 'customers') {
            const err = customerEmailConflict(db, row.email, null);
            if (err) return { data: null, error: err };
          }
          if (this.table === 'point_transactions') {
            if (row.kind === 'earn' && row.booking_id && db.point_transactions.some((t) => t.kind === 'earn' && t.booking_id === row.booking_id))
              return { data: null, error: { code: '23505', message: 'duplicate key value violates unique index "point_tx_earn_once"' } };
            if (row.ref && db.point_transactions.some((t) => t.ref === row.ref))
              return { data: null, error: { code: '23505', message: 'duplicate key value violates unique index "point_tx_ref_once"' } };
          }
          inserted.push(row);
        }
        rows.push(...inserted);
        saveSoon();
        return this._returning(db, inserted);
      }

      if (this.action === 'update') {
        const hits = match();
        // constraint check with the patch applied (exclude the row itself)
        for (const r of hits) {
          const next = { ...r, ...this.payload };
          if (this.table === 'bookings') {
            const err = bookingConflict(db, next, r.id);
            if (err) return { data: null, error: err };
          }
          if (this.table === 'customers' && 'email' in (this.payload || {})) {
            const err = customerEmailConflict(db, next.email, r.id);
            if (err) return { data: null, error: err };
          }
        }
        for (const r of hits) Object.assign(r, this.payload);
        saveSoon();
        return this._returning(db, hits);
      }

      if (this.action === 'delete') {
        const hits = match();
        db[this.table] = rows.filter((r) => !hits.includes(r));
        saveSoon();
        return this._returning(db, hits);
      }
    } catch (e) {
      return { data: null, error: { message: e.message } };
    }
    return { data: null, error: { message: 'unsupported action' } };
  }

  _returning(db, rowsOut) {
    if (!this.returning) return this._shape(null, null, rowsOut.length);
    const sel = parseSelect(this.returning);
    return this._shape(rowsOut.map((r) => project(db, this.table, r, sel)), null);
  }

  _shape(data, count) {
    if (this.mode === 'single') {
      if (!data || data.length !== 1) {
        return { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }, count };
      }
      return { data: data[0], error: null, count };
    }
    if (this.mode === 'maybeSingle') return { data: (data && data[0]) || null, error: null, count };
    return { data, error: null, count };
  }

  then(resolve, reject) { return Promise.resolve(this._exec()).then(resolve, reject); }
}

/* ---------- RPCs ---------- */
async function rpc(name, params = {}) {
  const db = load();
  if (name === 'adjust_hours' || name === 'adjust_points') {
    const isHours = name === 'adjust_hours';
    const cust = db.customers.find((c) => c.id === params.p_customer);
    if (!cust) return { data: null, error: { message: 'customer not found' } };
    const balCol = isHours ? 'hours_balance_min' : 'points_balance';
    const delta = Math.round(Number(isHours ? params.p_delta_min : params.p_delta) || 0);
    const newBal = (cust[balCol] || 0) + delta;
    if (newBal < 0) return { data: null, error: { message: isHours ? 'insufficient hours' : 'insufficient points' } };
    if (!isHours) {
      if (params.p_kind === 'earn' && params.p_booking && db.point_transactions.some((t) => t.kind === 'earn' && t.booking_id === params.p_booking))
        return { data: null, error: { message: 'duplicate key value violates unique index "point_tx_earn_once"' } };
      if (params.p_ref && db.point_transactions.some((t) => t.ref === params.p_ref))
        return { data: null, error: { message: 'duplicate key value violates unique index "point_tx_ref_once"' } };
    }
    cust[balCol] = newBal;
    db[isHours ? 'hour_transactions' : 'point_transactions'].push({
      id: randomUUID(), customer_id: cust.id, [isHours ? 'minutes' : 'points']: delta,
      kind: params.p_kind || 'adjust', note: params.p_note || null,
      booking_id: params.p_booking || null, ref: params.p_ref || null, created_at: nowISO(),
    });
    saveSoon();
    return { data: newBal, error: null };
  }
  return { data: null, error: { message: `unknown function ${name}` } };
}

/* ---------- Client ---------- */
export function createLocalClient() {
  return {
    from: (table) => new LocalQuery(table),
    rpc,
  };
}

// Replay a serialized query from the browser shim: { table, calls: [[method, ...args], ...] }.
const ALLOWED = new Set(['select', 'insert', 'update', 'delete', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
  'like', 'ilike', 'is', 'in', 'contains', 'not', 'or', 'order', 'limit', 'range', 'single', 'maybeSingle']);

export async function runSerializedQuery({ table, calls }) {
  if (typeof table !== 'string' || !Array.isArray(calls)) return { data: null, error: { message: 'bad request' } };
  let q = new LocalQuery(table);
  for (const call of calls) {
    if (!Array.isArray(call) || typeof call[0] !== 'string' || !ALLOWED.has(call[0])) {
      return { data: null, error: { message: `unsupported method ${call && call[0]}` } };
    }
    q = q[call[0]](...call.slice(1));
  }
  return await q;
}

export async function runRpc(name, params) { return rpc(name, params); }
