import app from '../server.js';

// Single serverless function serving the whole demo (pages + API) via the Express app.
// Vercel pre-reads the request body; flag it as already parsed so Express's body
// parsers don't try to re-read the consumed stream.
export default function handler(req, res) {
  if (req.body !== undefined) req._body = true;
  return app(req, res);
}
