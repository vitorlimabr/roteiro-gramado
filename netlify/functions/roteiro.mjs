import { getStore } from "@netlify/blobs";

const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });

export default async (req) => {
  const store = getStore({ name: "roteiro", consistency: "strong" });

  if (req.method === "GET") {
    const data = await store.get("estado", { type: "json" });
    return json(data || { rev: 0, state: null });
  }

  const code = Netlify.env.get("EDIT_CODE");
  if (!code || req.headers.get("x-edit-code") !== code) {
    await new Promise((r) => setTimeout(r, 800));
    return json({ error: "codigo" }, 401);
  }

  if (req.method === "POST") return json({ ok: true });

  if (req.method === "PUT") {
    let body;
    try { body = await req.json(); } catch { return json({ error: "json" }, 400); }
    if (!body || typeof body.state !== "object" || body.state === null || JSON.stringify(body.state).length > 100000) {
      return json({ error: "estado" }, 400);
    }
    const current = (await store.get("estado", { type: "json" })) || { rev: 0, state: null };
    if (body.baseRev !== current.rev) return json(current, 409);
    const next = { rev: current.rev + 1, state: body.state, updatedAt: new Date().toISOString() };
    await store.setJSON("estado", next);
    return json(next);
  }

  return json({ error: "metodo" }, 405);
};

export const config = { path: "/api/roteiro" };
