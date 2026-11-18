// Minimal Supabase stand-in: GoTrue-style auth + PostgREST-style REST over a real Postgres with RLS.
import http from "http"; import crypto from "crypto"; import pg from "pg";
const pool = new pg.Pool({ host: "/tmp/pg", port: 54329, user: "postgres", database: "fnb" });
const CONFIRM = process.env.CONFIRM === "1", TTL = +(process.env.TTL || 3600);
const refresh = new Map();
const tok = (u) => { const exp = Math.floor(Date.now() / 1000) + TTL; const access = Buffer.from(JSON.stringify({ sub: u.id, email: u.email, role: "authenticated", exp })).toString("base64url"); const rt = crypto.randomBytes(12).toString("hex"); refresh.set(rt, u); return { access_token: access, refresh_token: rt, token_type: "bearer", expires_in: TTL, expires_at: exp, user: { id: u.id, email: u.email } }; };
const claims = (req) => { const a = req.headers.authorization || ""; if (!a.startsWith("Bearer ")) return null; try { const c = JSON.parse(Buffer.from(a.slice(7), "base64url").toString()); if (c.exp < Date.now() / 1000) return "expired"; return c; } catch { return null; } };
const hash = (p) => crypto.createHash("sha256").update(p).digest("hex");
const PK = { saves: ["user_id", "slot"], league: ["id"], events: ["id"], profiles: ["id"] };
const send = (res, code, body) => { res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "apikey, authorization, content-type, prefer", "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS" }); res.end(body === undefined ? "" : JSON.stringify(body)); };
const ident = (s) => { if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw new Error("bad ident " + s); return '"' + s + '"'; };
async function asRole(c, fn) {
  const cl = await pool.connect();
  try { await cl.query("begin"); await cl.query("set local role " + (c ? "authenticated" : "anon")); await cl.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(c || { role: "anon" })]);
    const r = await fn(cl); await cl.query("commit"); return r; } catch (e) { await cl.query("rollback").catch(() => {}); throw e; } finally { cl.release(); }
}
const log = []; export { log };
http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return send(res, 204);
  const u = new URL(req.url, "http://x"); let raw = ""; for await (const ch of req) raw += ch; const body = raw ? JSON.parse(raw) : null;
  log.push(req.method + " " + u.pathname); if (process.env.VERBOSE) console.log(req.method, u.pathname + u.search, raw.slice(0, 120));
  try {
    if (!req.headers.apikey) return send(res, 401, { message: "No API key found in request" });
    // ---- auth ----
    if (u.pathname === "/auth/v1/signup") {
      const ex = await pool.query("select id from auth.users where lower(email)=lower($1)", [body.email]); if (ex.rows.length) return send(res, 422, { msg: "User already registered", code: 422 });
      const r = await pool.query("insert into auth.users (email, encrypted_password, email_confirmed_at) values ($1,$2,$3) returning id, email", [body.email, hash(body.password), CONFIRM ? null : new Date()]);
      return send(res, 200, CONFIRM ? { id: r.rows[0].id, email: body.email, confirmation_sent_at: new Date().toISOString() } : tok(r.rows[0]));
    }
    if (u.pathname === "/auth/v1/token") {
      if (u.searchParams.get("grant_type") === "password") { const r = await pool.query("select id, email, email_confirmed_at from auth.users where lower(email)=lower($1) and encrypted_password=$2", [body.email, hash(body.password)]);
        if (!r.rows.length) return send(res, 400, { error: "invalid_grant", error_description: "Invalid login credentials" }); if (!r.rows[0].email_confirmed_at) return send(res, 400, { error: "invalid_grant", error_description: "Email not confirmed" }); return send(res, 200, tok(r.rows[0])); }
      const usr = refresh.get(body.refresh_token); if (!usr) return send(res, 400, { error: "invalid_grant", error_description: "Invalid Refresh Token" }); refresh.delete(body.refresh_token); return send(res, 200, tok(usr));
    }
    const c = claims(req); if (c === "expired") return send(res, 401, { message: "JWT expired" });
    if (u.pathname === "/auth/v1/user") { if (!c) return send(res, 401, { message: "no user" }); if (req.method === "PUT") await pool.query("update auth.users set encrypted_password=$1 where id=$2", [hash(body.password), c.sub]); return send(res, 200, { id: c.sub, email: c.email }); }
    if (u.pathname === "/auth/v1/logout") return send(res, 204);
    if (u.pathname === "/auth/v1/recover") return send(res, 200, {});
    // ---- rpc ----
    const rp = u.pathname.match(/^\/rest\/v1\/rpc\/(\w+)$/);
    if (rp) { const fn = rp[1], args = body || {}, keys = Object.keys(args);
      const meta = await pool.query("select proretset, prorettype::regtype::text t from pg_proc where proname=$1 and pronamespace='public'::regnamespace", [fn]);
      const sql = "select * from public." + ident(fn) + "(" + keys.map((k, i) => ident(k) + " => $" + (i + 1)).join(",") + ")";
      const r = await asRole(c, (cl) => cl.query(sql, keys.map((k) => args[k])));
      if (meta.rows[0].proretset) return send(res, 200, r.rows); if (meta.rows[0].t === "void") return send(res, 204); return send(res, 200, Object.values(r.rows[0])[0]);
    }
    // ---- tables ----
    const tm = u.pathname.match(/^\/rest\/v1\/(\w+)$/); if (!tm) return send(res, 404, { message: "not found" });
    const table = tm[1], where = [], vals = [];
    for (const [k, v] of u.searchParams) { if (k === "select" || k === "order" || k === "limit") continue; const m = v.match(/^eq\.(.*)$/); if (!m) throw new Error("only eq filters"); vals.push(m[1]); where.push(ident(k) + "::text = $" + vals.length); }
    const W = where.length ? " where " + where.join(" and ") : "";
    if (req.method === "GET") { const sel = (u.searchParams.get("select") || "*").split(",").map((s) => s === "*" ? "*" : ident(s)).join(","); const r = await asRole(c, (cl) => cl.query("select " + sel + " from public." + ident(table) + W, vals)); return send(res, 200, r.rows); }
    if (req.method === "DELETE") { await asRole(c, (cl) => cl.query("delete from public." + ident(table) + W, vals)); return send(res, 204); }
    if (req.method === "POST") {
      const rows = Array.isArray(body) ? body : [body], merge = /merge-duplicates/.test(req.headers.prefer || "");
      await asRole(c, async (cl) => { for (const row of rows) { const ks = Object.keys(row); const vs = ks.map((k) => (row[k] !== null && typeof row[k] === "object") ? JSON.stringify(row[k]) : row[k]);
        let sql = "insert into public." + ident(table) + " (" + ks.map(ident).join(",") + ") values (" + ks.map((_, i) => "$" + (i + 1)).join(",") + ")";
        if (merge) sql += " on conflict (" + PK[table].map(ident).join(",") + ") do update set " + ks.filter((k) => !PK[table].includes(k)).map((k) => ident(k) + " = excluded." + ident(k)).join(",");
        await cl.query(sql, vs); } });
      return send(res, 201);
    }
    send(res, 405, { message: "method" });
  } catch (e) { const rls = /row-level security|permission denied/.test(e.message); if (process.env.VERBOSE) console.log("ERR", e.message); send(res, rls ? 403 : 400, { message: e.message, code: e.code }); }
}).listen(54400, () => console.log("mock supabase on :54400"));
