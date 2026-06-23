# Chrome FC — Printify fulfillment bridge

When a jersey is paid for on Whop, this submits the print-on-demand order to
Printify (single blueprint + per-order image positioning), then pushes the
carrier tracking back onto the Whop payment.

```
Buyer → Whop checkout → payment.succeeded
      → /api/whop-webhook   → Printify: create order (design + size variant + address)
Printify ships → order:shipment:created
      → /api/printify-webhook → Whop: POST /shipments (tracking)
```

## Already wired (lib/fulfillment.js)
- Shop `28024004`, blueprint `1087`, print provider `83`
- Size → variant: S 91890 · M 91891 · L 91892 · XL 91893
- 5 designs pre-uploaded to Printify (image ids in `DESIGN`)
- All 20 Whop size-plans mapped in `PLAN_MAP` (plan → country + size)

## To activate
1. **Deploy** (this repo is already on Vercel) and set env vars in the Vercel project:
   - `PRINTIFY_TOKEN` — Printify Personal Access Token
   - `WHOP_API_KEY` — Chrome FC key (already set; rotate the one shared in chat)
   - `WHOP_WEBHOOK_SECRET` — from the Whop webhook below (enables signature check)
   - `PRINTIFY_WEBHOOK_SECRET` — optional, enables Printify signature check
2. **Create the Whop webhook** → `POST /api/v1/webhooks`
   `{ company_id, url:"https://chrome-fc.vercel.app/api/whop-webhook", events:["payment.succeeded"] }`
3. **Create the Printify webhook** → `POST /v1/shops/28024004/webhooks.json`
   `{ topic:"order:shipment:created", url:"https://chrome-fc.vercel.app/api/printify-webhook" }`

## Before going live — confirm
- Field paths in `api/whop-webhook.js` (planId + shipping address) against one real
  `payment.succeeded` payload, then lock them in. Country code must be ISO-2 (US).
- Test order: buy a kit (or Whop test mode), confirm a Printify order is created;
  it stays **on hold** until sent to production, so you can cancel the test in Printify.
- Designs are the mockup images for now — re-upload print-ready front/back files and
  swap the ids in `DESIGN` when ready.
- Pricing covers Printify product cost + shipping + margin.
