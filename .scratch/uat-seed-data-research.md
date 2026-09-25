# UAT seed data research

Snapshot refreshed on 2026-09-25 for the lab/UAT environment. The seed stores a curated snapshot, not a live crawler. Product copy is shortened, and no customer data is copied from source stores.

The catalog now contains 60 products and 120 variants. This is five times the previous 12-product snapshot. Every product has two variants with unique SKUs; source variants are preserved where available, and a deterministic alternate edition is added for UAT coverage. Product galleries now use every image exposed by the source detail feeds, capped at four per product.

## Sources

| Source        | Public endpoint used                                                                                            | Used for                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| LP Club       | https://lpclub.vn/products.json                                                                                 | Used vinyl/cassette catalog shape, VND price range, condition and single-item stock behavior       |
| LP Club       | https://lpclub.vn/products.json?limit=250                                                                       | 205 available catalog candidates used for the expanded snapshot                                    |
| LP Club       | https://lpclub.vn/products/lou-reed-between-thought-and-expression-the-lou-reed-anthology-cassette.json         | Lou Reed image, price, product name and stock                                                      |
| LP Club       | https://lpclub.vn/products/kraftwerk-radio-activity-vinyl-lp.json                                               | Kraftwerk image, price, product name and stock                                                     |
| LP Club       | https://lpclub.vn/products/can-out-of-reach-vinyl-lp.json                                                       | Can image, price, product name and stock                                                           |
| LP Club       | https://lpclub.vn/products/johnny-griffin-the-congregation-vinyl-lp.json                                        | Johnny Griffin image, price, product name and stock                                                |
| LP Club       | https://lpclub.vn/products/suede-vinyl-lp.json                                                                  | Suede image, price, product name and stock                                                         |
| LP Club       | https://lpclub.vn/products/three-cheers-for-sweet-revenge-vinyl-lp.json                                         | My Chemical Romance image, price, product name and stock                                           |
| LP Club       | https://lpclub.vn/products/michael-buble-nobody-but-me-silver-vinyl-lp.json                                     | Michael Buble image, price, product name and stock                                                 |
| Times Records | https://shop.hangdiathoidai.com/products/phung-khanh-linh-citopia-the-2nd-album-sunshine-vinyl-lp-dia-than.json | CITOPIA title, format, SKU, VND price, stock, image and tracklist context                          |
| Times Records | https://shop.hangdiathoidai.com/products/phung-khanh-linh-giua-mot-van-nguoi-the-3rd-album-bang-cassette.json   | Cassette title, SKU, VND price, stock and image                                                    |
| Times Records | https://shop.hangdiathoidai.com/products/phung-khanh-linh-mascot-keyring-official-merch.json                    | Merch title, SKU, size, VND price, stock and image                                                 |
| Times Records | https://shop.hangdiathoidai.com/products/pham-anh-duy-23-dia-cd.json                                            | CD title, VND price, stock and image                                                               |
| Times Records | https://shop.hangdiathoidai.com/products/amee-dreamee-dia-cd.json                                               | CD title, SKU, VND price, stock and gallery images                                                 |
| Times Records | https://shop.hangdiathoidai.com/sitemap_products_1.xml                                                          | Additional product handles used to fetch 18 current CD/vinyl items through their `.json` endpoints |

## Mapping decisions

- Source product formats map to `categories`: `Vinyl`, `CD`, `Cassette`; the mascot maps to `Keychain`.
- Source product types are normalized to the application values `music` and `merch`.
- LP Club's inventory is mostly one-off used stock, so those variants retain `stockQuantity: 1` and a `Condition: Used` attribute.
- Times Records SKUs are preserved where available. Missing source SKUs receive deterministic local SKUs prefixed by `HDTD-` or `LPCLUB-`.
- Source images remain remote URLs to keep the repository small. Replace with lab-hosted assets before any production use.
- UAT users, addresses, order IDs, gateway IDs and discount codes are synthetic.
- Product images, titles, prices and SKUs come from the source snapshot. For UAT load testing, every variant stock quantity is normalized deterministically to the range `50..100`; source inventory quantities are not treated as production inventory.
- Alternate variants use format-aware labels (`Colored Vinyl`, `Jewel Case`, `Clear Shell`, or `Premium Set`) and a small price uplift for UAT variant selection paths; they are not claims about source inventory.
- 19 products expose two or more source images in the current snapshot; the remaining products expose one source image only and are not padded with duplicated or fabricated URLs.
