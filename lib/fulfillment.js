// Chrome FC fulfillment config + Whop/Printify helpers.
// Fill PLAN_MAP with real Printify product_id + per-size variant_id once the
// designer publishes the 5 jerseys in Printify (variant ids = sizes).

export const COMPANY_ID = "biz_yc69p1uc6bYgxS";

// plan_id (Whop)  ->  Printify product + size→variant
export const PLAN_MAP = {
  plan_neYQvYQ4fvxHn: { name: "USA",       printify_product_id: "TODO", variants: { S: 0, M: 0, L: 0, XL: 0 } },
  plan_scOsVRtXTjgRP: { name: "Mexico",    printify_product_id: "TODO", variants: { S: 0, M: 0, L: 0, XL: 0 } },
  plan_ULkzKIourRVfS: { name: "Argentina", printify_product_id: "TODO", variants: { S: 0, M: 0, L: 0, XL: 0 } },
  plan_WHztszc1Wy222: { name: "Brazil",    printify_product_id: "TODO", variants: { S: 0, M: 0, L: 0, XL: 0 } },
  plan_c9xhCHIg1nJH4: { name: "Scotland",  printify_product_id: "TODO", variants: { S: 0, M: 0, L: 0, XL: 0 } },
};

const PRINTIFY = "https://api.printify.com/v1";
const WHOP = "https://api.whop.com/api/v1";

function pf(path, method, body) {
  return fetch(PRINTIFY + path, {
    method,
    headers: { Authorization: `Bearer ${process.env.PRINTIFY_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async r => ({ status: r.status, json: await r.json().catch(() => ({})) }));
}

function wh(path, method, body) {
  return fetch(WHOP + path, {
    method,
    headers: { Authorization: `Bearer ${process.env.WHOP_API_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async r => ({ status: r.status, json: await r.json().catch(() => ({})) }));
}

// Create a Printify order from a paid Whop order. external_id = whop payment id,
// so the Printify shipment webhook can map tracking back to the right Whop payment.
export async function createPrintifyOrder({ paymentId, planId, size, address }) {
  const map = PLAN_MAP[planId];
  if (!map) throw new Error(`no Printify mapping for plan ${planId}`);
  const variant = map.variants[(size || "M").toUpperCase()];
  if (!variant) throw new Error(`no variant for size ${size} on ${map.name}`);

  return pf(`/shops/${process.env.PRINTIFY_SHOP_ID}/orders.json`, "POST", {
    external_id: paymentId,
    label: `Chrome FC — ${map.name} (${size})`,
    line_items: [{ product_id: map.printify_product_id, variant_id: variant, quantity: 1 }],
    shipping_method: 1,
    send_shipping_notification: false,
    address_to: address,
  });
}

// Push a carrier tracking code onto the Whop payment so the buyer gets notified.
export async function pushTrackingToWhop({ paymentId, trackingCode }) {
  return wh("/shipments", "POST", { company_id: COMPANY_ID, payment_id: paymentId, tracking_code: trackingCode });
}

export async function readRawBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === "string" ? Buffer.from(c) : c);
  return Buffer.concat(chunks).toString("utf8");
}
