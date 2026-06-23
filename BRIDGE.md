# Chrome FC — Printify fulfillment bridge

When a jersey is paid for on Whop, this submits the print-on-demand order to
Printify, then pushes the carrier tracking back onto the Whop payment.

```
Buyer → Whop checkout → payment.succeeded
      → /api/whop-webhook   → Printify: create order (design + size + address)
Printify ships → order:shipment:created
      → /api/printify-webhook → Whop: POST /shipments (tracking)
```

## Activate (after designs are published in Printify)

1. **Fill `lib/fulfillment.js` → `PLAN_MAP`** with each jersey's
   `printify_product_id` and per-size `variant_id` (from the Printify product).
2. **Deploy to Vercel** (this repo) and set env vars:
   - `WHOP_API_KEY` — Chrome FC key (rotate the one shared in chat first)
   - `WHOP_WEBHOOK_SECRET` — from the Whop webhook you create
   - `PRINTIFY_TOKEN` — Printify Personal Access Token
   - `PRINTIFY_SHOP_ID` — from `GET /v1/shops.json`
   - `PRINTIFY_WEBHOOK_SECRET` — optional, enables signature check
3. **Create the Whop webhook** → `POST /api/v1/webhooks`
   `{ company_id, url: "https://<vercel-domain>/api/whop-webhook", events: ["payment.succeeded"] }`
4. **Create the Printify webhook** → `POST /v1/shops/{shop}/webhooks.json`
   `{ topic: "order:shipment:created", url: "https://<vercel-domain>/api/printify-webhook" }`

## Confirm before going live
- Field paths in `api/whop-webhook.js` (planId / size / shipping address) are
  parsed defensively — verify them against one real `payment.succeeded` payload
  and lock them in.
- Size reaches the webhook via the **Size custom field** on each plan.
- Pricing covers Printify cost + shipping + margin.
