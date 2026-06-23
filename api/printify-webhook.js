// Printify → Whop. Fires when an order ships; pushes tracking onto the Whop payment.
export const config = { api: { bodyParser: false } };

import crypto from "node:crypto";
import { pushTrackingToWhop, readRawBody } from "../lib/fulfillment.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const raw = await readRawBody(req);

  // Printify signs with HMAC-SHA256 over the raw body (header: X-Pfy-Signature: sha256=…)
  if (process.env.PRINTIFY_WEBHOOK_SECRET) {
    const sig = (req.headers["x-pfy-signature"] || "").replace("sha256=", "");
    const expected = crypto.createHmac("sha256", process.env.PRINTIFY_WEBHOOK_SECRET).update(raw).digest("hex");
    if (sig !== expected) return res.status(401).json({ error: "bad signature" });
  }

  res.status(200).json({ received: true });

  const evt = JSON.parse(raw || "{}");
  if (!/shipment/i.test(evt.type || "")) return;

  const data = evt.resource?.data || evt.data || {};
  const paymentId = data.external_id;                       // we set this on order create
  const shipment = (data.shipments || [])[0] || {};
  const trackingCode = shipment.tracking_number || shipment.number;
  if (!paymentId || !trackingCode) return;

  try {
    const r = await pushTrackingToWhop({ paymentId, trackingCode });
    console.log("whop shipment", r.status, JSON.stringify(r.json).slice(0, 200));
  } catch (e) {
    console.error("tracking push failed", paymentId, e?.message || e);
  }
}
