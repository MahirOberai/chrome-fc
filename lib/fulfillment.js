// Chrome FC fulfillment — Whop order → Printify print-on-demand → tracking back to Whop.
// Single blueprint + per-order image positioning (no pre-made products per customer).
// Token is read from env (PRINTIFY_TOKEN) — never hard-coded (repo is public).

export const COMPANY_ID = "biz_yc69p1uc6bYgxS";

// Printify references (from the working order flow)
const SHOP = "28024004";
const BLUEPRINT = 1087;
const PRINT_PROVIDER = 83;
const SIZE_VARIANT = { S: 91890, M: 91891, L: 91892, XL: 91893 }; // XS 91889 · 2XL 91894 · 3XL 91895 · 4XL 91896

// Designs pre-uploaded to Printify (image ids). Re-upload print-ready front/back files later and swap these.
const DESIGN = {
  usa:       "6a3b0299af18731d35f6e9ea",
  mexico:    "6a3b0299a2c8dbbe0a9ef47d",
  argentina: "6a3b029a516b4a2eb04028fd",
  brazil:    "6a3b029ba0ad25ec204d3978",
  scotland:  "6a3b029cd4c5c9dd2430548d",
};

// Whop size-plan id -> { country, size }. Size is implied by the plan.
export const PLAN_MAP = {
  plan_RwqDtm0thjiFl:{country:"usa",size:"S"}, plan_774KWMxHATmEy:{country:"usa",size:"M"}, plan_V9bnWYbtiRwRv:{country:"usa",size:"L"}, plan_bN7186UWdefl8:{country:"usa",size:"XL"},
  plan_H4Z03CPGLWQ6k:{country:"mexico",size:"S"}, plan_NYelmilYTNJ06:{country:"mexico",size:"M"}, plan_U5oQQLyluNqbH:{country:"mexico",size:"L"}, plan_cFkQeK70zzuHq:{country:"mexico",size:"XL"},
  plan_W9JDQdeasCuHF:{country:"argentina",size:"S"}, plan_NKnjQMhLTH45H:{country:"argentina",size:"M"}, plan_9HIgkYWfl7hxf:{country:"argentina",size:"L"}, plan_cweX30LjxSN7Q:{country:"argentina",size:"XL"},
  plan_7AUsYszgOcADK:{country:"brazil",size:"S"}, plan_B5jPc9XFls03f:{country:"brazil",size:"M"}, plan_oM2E9zPLMjcSs:{country:"brazil",size:"L"}, plan_ge35T7vegEEL1:{country:"brazil",size:"XL"},
  plan_tq87uEy9Rm7oy:{country:"scotland",size:"S"}, plan_RGuVzPWt9Ix1x:{country:"scotland",size:"M"}, plan_h0mvrGZCSkjyr:{country:"scotland",size:"L"}, plan_PbWsofktsj7dA:{country:"scotland",size:"XL"},
};

const PRINTIFY = "https://api.printify.com/v1";
const WHOP = "https://api.whop.com/api/v1";

const pf = (path, method, body) => fetch(PRINTIFY + path, {
  method, headers: { Authorization: `Bearer ${process.env.PRINTIFY_TOKEN}`, "Content-Type": "application/json" },
  body: body ? JSON.stringify(body) : undefined,
}).then(async r => ({ status: r.status, json: await r.json().catch(() => ({})) }));

const wh = (path, method, body) => fetch(WHOP + path, {
  method, headers: { Authorization: `Bearer ${process.env.WHOP_API_KEY}`, "Content-Type": "application/json" },
  body: body ? JSON.stringify(body) : undefined,
}).then(async r => ({ status: r.status, json: await r.json().catch(() => ({})) }));

// Whop paid order -> Printify order. external_id = whop payment id (maps tracking back).
export async function createPrintifyOrder({ paymentId, planId, address }) {
  const m = PLAN_MAP[planId];
  if (!m) throw new Error(`no Printify mapping for plan ${planId}`);
  const variant = SIZE_VARIANT[m.size];
  const img = DESIGN[m.country];

  return pf(`/shops/${SHOP}/orders.json`, "POST", {
    external_id: paymentId,
    label: `Chrome FC — ${m.country} (${m.size})`,
    line_items: [{
      print_provider_id: PRINT_PROVIDER,
      blueprint_id: BLUEPRINT,
      variant_id: variant,
      print_areas: { front: img, back: img },
      quantity: 1,
    }],
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
