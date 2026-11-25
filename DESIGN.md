# Design

Visual system of the Lucky Salon customer site, as built on 2026-11-25. The owner made the pink mockups binding (see PRODUCT.md › Brand Commitments). The admin pages are out of scope.

## World

A dreamy pink nail salon, seen through frosted glass. A softly blurred photo of the shop, tinted pink, sits behind everything. Content lives on frosted pink-white glass cards. Satin bows, ribbons, glossy hearts and white sparkles decorate the edges and never sit on top of text.

## Color

| Role | Value | Use |
|---|---|---|
| Ground | `#FBE3EC` plus `public/photos/salon-backdrop.webp` under a pink wash | page background (`DreamyBackground`) |
| Ink | `#3D2230` / `#4A2A37` | headings, body |
| Ink soft | `#7A4A5E` / `#6E4255` | secondary text on glass (rose-tinted, never gray) |
| Accent | `#EC4C82`, gradient from `#F88AB0` | primary buttons, active nav, prices (`text-rose-600`) |
| Decoration | `#F9A9C8`, `#FFE0EC`, white | bows, hearts, ribbons, sparkles |

## Surfaces (`src/index.css`)

- **`.glass`**: frosted pink-white card. It has a 16px backdrop blur, a white hairline rim, an inner top highlight and a soft plum drop shadow. Use it for home cards, service rows and gallery cards.
- **`.glass-solid`**: a more opaque version for forms, booking steps, history and long text.
- **`.glass-btn`**: round glass button for chevrons, tool icons and small secondary links.
- **`.btn-candy` / `.btn-candy-soft`**: glossy candy buttons with a dashed "stitch". Each screen has one primary action.
- **Radii:**
  - glass cards: 24–30px;
  - photo frames: a 5px white border at 20–22px radius;
  - pills: fully rounded.

## Type

- **Mali** (`font-display`): headings and buttons, weight 600, line-height 1.4 or more for Thai.
- **Prompt**: body text.
- **Great Vibes** (`font-script`): Latin-only accent lines such as "It's your style" and the logo. Never "AI" in script.

## Decoration (`src/components/Decor.jsx`)

The decorations are all hand-authored SVG:

- `SatinBow`, `GlassHeart`, `Sparkle`, `RibbonSwoosh`, `PolishBottle`, `CrownBear`.
- `DreamyBackground variant="full"` is for the home page; `"calm"` is for the other pages and has fewer pieces.
- Corner bows, and the bow on the Popular Styles card corner, are part of the identity.

## Icons

`src/components/Icon.jsx` is the single line-icon set, at 24×24 with a 1.5 stroke. No emoji in the UI.

## Motion

- Entrance uses `lucky-fade-up` with ease `cubic-bezier(0.22,1,0.36,1)`.
- Signature moments:
  - the Popular Styles card has a 3D mouse tilt and a flip-in slideshow;
  - the 3D nail in the try-on card turns when the color changes.
- Nothing loops except the carousel autoplay, which pauses on hover, focus and hidden tabs.
- All motion is disabled under `prefers-reduced-motion`.

## Photos

The files in `public/photos/` are Unsplash placeholders (see `CREDITS.txt`). Replace them with the shop's real photos and keep the same file names. Nail designs and service images come from admin uploads.
