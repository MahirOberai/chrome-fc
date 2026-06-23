// Whop → Printify. Fires when a jersey is paid for; submits the POD order.
// Vercel: needs the raw body for signature verification, so disable the parser.
export const config = { api: { bodyParser: false } };

import Whop from "@whop/sdk";
import { createPrintifyOrder, readRawBody } from "../lib/fulfillment.js";

const whop = new Whop({ apiKey: process.env.WHOP_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const raw = await readRawBody(req);

  // Verify when a webhook secret is configured; otherwise parse (dev).
  let event;
  if (process.env.WHOP_WEBHOOK_SECRET) {
    try { event = whop.webhooks.unwrap(raw, { headers: req.headers }); }
    catch { return res.status(401).json({ error: "bad signature" }); }
  } else {
    try { event = JSON.parse(raw); } catch { return res.status(400).end(); }
  }

  // ack immediately, fulfill after (Whop retries on non-2xx)
  res.status(200).json({ received: true });

  const type = event.type || event.action || "";   // v1 uses type, v2 uses action
  if (!/payment\.succeeded/.test(type)) return;

  const o = event.data || event.payment || {};
  // ↓↓↓ confirm these paths against one real payload, then lock them in ↓↓↓
  const paymentId = o.id;
  const planId = o.plan_id || o.plan?.id;   // size is implied by the plan (PLAN_MAP)
  const s = o.shipping_address || o.address || {};
  const address = {
    first_name: s.first_name || o.name?.split(" ")[0] || "Customer",
    last_name: s.last_name || o.name?.split(" ").slice(1).join(" ") || "Chrome FC",
    email: o.email || o.user?.email,
    phone: s.phone || "",
    country: s.country, region: s.state || s.region, city: s.city,
    address1: s.line1 || s.address1, address2: s.line2 || s.address2 || "", zip: s.postal_code || s.zip,
  };

  try {
    const r = await createPrintifyOrder({ paymentId, planId, address });
    console.log("printify order", r.status, JSON.stringify(r.json).slice(0, 300));
  } catch (e) {
    console.error("fulfillment failed", paymentId, e?.message || e);
  }
}
