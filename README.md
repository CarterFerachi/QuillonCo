# QuillonCo — Shopify Theme

A production-ready Shopify Online Store 2.0 theme for **QuillonCo**, a premium
athletic apparel brand specializing in high-performance polos. Modern, sporty,
luxury — built to compete with the best apparel sites while staying 100%
native to Shopify.

## Repository layout

```
shopify-theme/        The theme — upload this folder (zipped) to Shopify
├── layout/           theme.liquid + gift card layout
├── config/           settings_schema.json (Theme Editor), settings_data.json
├── locales/          en.default.json
├── sections/         All sections incl. header/footer groups (OS 2.0)
├── snippets/         product-card, price, icons, drawers, pagination, ...
├── templates/        JSON templates (index, product, collection, cart, ...)
└── assets/           base.css, global.js, product.js
scripts/              fetch-demo-images.sh — vendor Higgsfield imagery locally
preview/              Static homepage preview (deployed via Vercel)
quillonco-theme.zip   Ready-to-upload theme package
```

## Deploy to Shopify

1. **Zip upload** — In Shopify admin: *Online Store → Themes → Add theme →
   Upload zip file* and pick `quillonco-theme.zip` (or zip the
   `shopify-theme/` folder contents yourself).
2. **Shopify CLI** — from the repo root:
   ```bash
   cd shopify-theme
   shopify theme push --store your-store.myshopify.com
   ```

### After install

- Create the four featured collections (Performance Polos, New Arrivals,
  Best Sellers, Everyday Essentials) and assign them in the homepage sections.
- Assign your `main-menu` and `footer` menus (mega menu renders automatically
  for links with two levels of children).
- Install the **Shopify Search & Discovery** app to configure collection
  filters (color, size, price, availability) — the collection template reads
  `collection.filters` natively.
- Optional product metafields the theme reads automatically:
  - `custom.fabric_features` (list of single-line text) — fabric callouts
  - `custom.fit_notes` (rich text) — Fit & Fabric accordion
  - `custom.care_instructions` (rich text) — Care accordion
  - `reviews.rating` / `reviews.rating_count` — star rating (compatible with
    most review apps)

## Feature highlights

- **Cart drawer** with free-shipping progress meter, quantity controls and
  Section Rendering API refresh (no page reloads)
- **Predictive search** drawer using Shopify's `/search/suggest` API
- **Mega menu** with promo image, sticky hide-on-scroll header
- **Product page**: grid gallery + zoom modal, variant picker with live
  price/availability, color swatches, size guide modal, fabric technology
  callouts, accordions, sticky add-to-cart bar, JSON-LD structured data,
  360° viewer placeholder badge
- **Collection page**: AJAX faceted filtering (Search & Discovery), sorting,
  quick add by size from product cards
- **Recently viewed** (localStorage) and **related products**
  (recommendations API)
- Scroll-reveal animations with `prefers-reduced-motion` support, lazy-loaded
  responsive images, semantic markup, skip links and focus management

## Imagery

All campaign imagery was generated with **Higgsfield** (Soul v2) — hero,
lifestyle gallery, brand story and studio product shots. The theme currently
references the Higgsfield CDN for demo placeholders; run
`scripts/fetch-demo-images.sh` to download them into `shopify-theme/assets/`
(then point `snippets/demo-image.liquid` at `asset_url`), or simply replace
them with your own photography via the Theme Editor image pickers.

## Preview

`preview/index.html` is a static, no-build mock of the homepage (same CSS
design system) served through Vercel using the rewrites in `vercel.json`.
