import { runSerializedQuery, runRpc } from '../lib/localdb.js';

// Query endpoint for the manager portal (demo/assets/localdb.js browser shim).
// Prototype-only: this exposes the demo data store to the browser the same way the old
// Supabase anon-key client did — there is no real customer data behind it.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const body = req.body || {};
  try {
    if (body.op === 'rpc') {
      const out = await runRpc(String(body.name || ''), body.params || {});
      return res.status(200).json(out);
    }
    const out = await runSerializedQuery({ table: body.table, calls: body.calls });
    return res.status(200).json(out);
  } catch (err) {
    return res.status(200).json({ data: null, error: { message: err.message } });
  }
}
