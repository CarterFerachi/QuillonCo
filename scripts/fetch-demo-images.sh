#!/usr/bin/env bash
# Downloads the Higgsfield-generated QuillonCo campaign imagery into
# shopify-theme/assets/ so the theme can ship the images as local assets
# instead of hotlinking the Higgsfield CDN.
#
# After running, update snippets/demo-image.liquid to use
# {{ 'q-<name>.png' | asset_url }} instead of the CDN URLs.
set -euo pipefail

CDN="https://d8j0ntlcm91z4.cloudfront.net/user_3FVcuBaoBTkgMgDv4hAHDXGVk6V"
DEST="$(cd "$(dirname "$0")/.." && pwd)/shopify-theme/assets"

declare -A IMAGES=(
  [q-hero]="hf_20260702_233529_381f4b7d-6700-47b3-bdb7-889de6481f74"
  [q-hero-2]="hf_20260702_233614_39afa232-98e2-4755-b963-b93ba28b9f76"
  [q-product-navy]="hf_20260702_233539_d7002d85-30b8-41ef-93a8-97400d74aeec"
  [q-product-green]="hf_20260702_233540_e490e605-9ce0-4d23-bc29-77033a291e7a"
  [q-product-white]="hf_20260702_233542_ec3205d6-430b-4045-b264-f6609f16e370"
  [q-story]="hf_20260702_233544_8d381104-77dd-45e1-b034-1d12513e1e18"
  [q-life-club]="hf_20260702_233554_0d8b4097-e6db-426a-bb1f-035b9b2d4b2d"
  [q-life-office]="hf_20260702_233555_bea96c5d-4b71-4d5f-8630-fd8846b54577"
  [q-life-tennis]="hf_20260702_233557_1ab33fcd-e013-47e8-be6e-dd28125ff1c9"
  [q-life-travel]="hf_20260702_233559_3e350de4-902b-4951-a03f-83773f007208"
  [q-life-dinner]="hf_20260702_233612_49d275a0-5297-4a63-bee9-3dc5a2cf8524"
)

mkdir -p "$DEST"
for name in "${!IMAGES[@]}"; do
  echo "Fetching $name..."
  curl -fsSL -o "$DEST/$name.png" "$CDN/${IMAGES[$name]}.png"
  curl -fsSL -o "$DEST/$name-min.webp" "$CDN/${IMAGES[$name]}_min.webp"
done
echo "Done. Images saved to $DEST"
