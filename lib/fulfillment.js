// Chrome FC fulfillment config + Whop/Printify helpers.
// Each size is its own Whop plan, so the plan id alone tells us country + size.
// Fill printify_product_id + variant_id per plan once the jerseys are published in Printify.

export const COMPANY_ID = "biz_yc69p1uc6bYgxS";

// whop plan id (size-specific) -> Printify product + variant
export const PLAN_MAP = {
  // USA
  plan_RwqDtm0thjiFl: { name: "USA", size: "S",  printify_product_id: "TODO", variant_id: 0 },
  plan_774KWMxHATmEy: { name: "USA", size: "M",  printify_product_id: "TODO", variant_id: 0 },
  plan_V9bnWYbtiRwRv: { name: "USA", size: "L",  printify_product_id: "TODO", variant_id: 0 },
  plan_bN7186UWdefl8: { name: "USA", size: "XL", printify_product_id: "TODO", variant_id: 0 },
  // Mexico
  plan_H4Z03CPGLWQ6k: { name: "Mexico", size: "S",  printify_product_id: "TODO", variant_id: 0 },
  plan_NYelmilYTNJ06: { name: "Mexico", size: "M",  printify_product_id: "TODO", variant_id: 0 },
  plan_U5oQQLyluNqbH: { name: "Mexico", size: "L",  printify_product_id: "TODO", variant_id: 0 },
  plan_cFkQeK70zzuHq: { name: "Mexico", size: "XL", printify_product_id: "TODO", variant_id: 0 },
  // Argentina
  plan_W9JDQdeasCuHF: { name: "Argentina", size: "S",  printify_product_id: "TODO", variant_id: 0 },
  plan_NKnjQMhLTH45H: { name: "Argentina", size: "M",  printify_product_id: "TODO", variant_id: 0 },
  plan_9HIgkYWfl7hxf: { name: "Argentina", size: "L",  printify_product_id: "TODO", variant_id: 0 },
  plan_cweX30LjxSN7Q: { name: "Argentina", size: "XL", printify_product_id: "TODO", variant_id: 0 },
  // Brazil
  plan_7AUsYszgOcADK: { name: "Brazil", size: "S",  printify_product_id: "TODO", variant_id: 0 },
  plan_B5jPc9XFls03f: { name: "Brazil", size: "M",  printify_product_id: "TODO", variant_id: 0 },
  plan_oM2E9zPLMjcSs: { name: "Brazil", size: "L",  printify_product_id: "TODO", variant_id: 0 },
  plan_ge35T7vegEEL1: { name: "Brazil", size: "XL", printify_product_id: "TODO", variant_id: 0 },
  // Scotland
  plan_tq87uEy9Rm7oy: { name: "Scotland", size: "S",  printify_product_id: "TODO", variant_id: 0 },
  plan_RGuVzPWt9Ix1x: { name: "Scotland", size: "M",  printify_product_id: "TODO", variant_id: 0 },
  plan_h0mvrGZCSkjyr: { name: "Scotland", size: "L",  printify_product_id: "TODO", variant_id: 0 },
  plan_PbWsofktsj7dA: { name: "Scotland", size: "XL", printify_product_id: "TODO", variant_id: 0 },
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
// so the Printify shipment webhook maps tracking back to the right Whop payment.
export async function createPrintifyOrder({ paymentId, planId, address }) {
  const m = PLAN_MAP[planId];
  if (!m) throw new Error(`no Printify mapping for plan ${planId}`);

  return pf(`/shops/${process.env.PRINTIFY_SHOP_ID}/orders.json`, "POST", {
    external_id: paymentId,
    label: `Chrome FC — ${m.name} (${m.size})`,
    line_items: [{ product_id: m.printify_product_id, variant_id: m.variant_id, quantity: 1 }],
    shipping_method: 1,
    send_shipping_notification: false,
    address_to: address,
  });
}

export async function pushTrackingToWhop({ paymentId, trackingCode }) {
  return wh("/shipments", "POST", { company_id: COMPANY_ID, payment_id: paymentId, tracking_code: trackingCode });
}

export async function readRawBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === "string" ? Buffer.from(c) : c);
  return Buffer.concat(chunks).toString("utf8");
}
