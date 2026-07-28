/* Drop-in replacement for the supabase-js browser client, backed by the demo's own
 * /api/db endpoint (local JSON store). Supports the query surface the manager portal
 * uses: from().select/insert/update/delete + filters, or(), order, limit, single,
 * maybeSingle, count/head, rpc(), and a simulated auth session (prototype: any
 * email/password signs in; the page loads already signed in). */
(function () {
  'use strict';

  async function exec(payload) {
    try {
      const r = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const out = await r.json();
      return { data: out.data ?? null, error: out.error ?? null, count: out.count ?? null };
    } catch (e) {
      return { data: null, error: { message: 'Network error — is the demo server running? (' + e.message + ')' }, count: null };
    }
  }

  var METHODS = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'like', 'ilike', 'is', 'in', 'contains', 'not', 'or', 'order', 'limit', 'range',
    'single', 'maybeSingle'];

  function Query(table) { this._table = table; this._calls = []; }
  METHODS.forEach(function (m) {
    Query.prototype[m] = function () {
      this._calls.push([m].concat(Array.prototype.slice.call(arguments)));
      return this;
    };
  });
  Query.prototype.then = function (resolve, reject) {
    return exec({ op: 'query', table: this._table, calls: this._calls }).then(resolve, reject);
  };

  // --- Simulated auth: signed in by default so the demo opens straight on the portal ---
  var signedIn = true;
  var authCallback = null;
  var session = { user: { email: 'manager@u-puttz.ca' }, access_token: 'demo' };

  var auth = {
    getSession: function () { return Promise.resolve({ data: { session: signedIn ? session : null }, error: null }); },
    onAuthStateChange: function (cb) { authCallback = cb; return { data: { subscription: { unsubscribe: function () {} } } }; },
    signInWithPassword: function (creds) {
      signedIn = true;
      if (creds && creds.email) session.user.email = creds.email;
      if (authCallback) authCallback('SIGNED_IN', session);
      return Promise.resolve({ data: { session: session }, error: null });
    },
    signOut: function () {
      signedIn = false;
      if (authCallback) authCallback('SIGNED_OUT', null);
      return Promise.resolve({ error: null });
    },
  };

  window.supabase = {
    createClient: function () {
      return {
        from: function (table) { return new Query(table); },
        rpc: function (name, params) { return exec({ op: 'rpc', name: name, params: params || {} }); },
        auth: auth,
      };
    },
  };
})();
