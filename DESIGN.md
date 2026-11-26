# Design

Visual system of the Lucky Salon customer site, rebuilt on 2026-11-26 from the owner's "clean white" mockup (it replaces the earlier dreamy-glass look). The admin pages are out of scope.

## World

A bright white nail desk in soft window light, with cream knit and pink polish. Chrome stays quiet (white surfaces, hairlines, one pink accent). The color and craft go into the photos of nail work: the hero hand photo, the design carousel and the design tiles.

## Color

| Role | Value | Use |
|---|---|---|
| Ground | `#FFF8FA`, soft gradient `#FFFAFB → #FFF6F9` | page background (`DreamyBackground`, no photo, no decoration) |
| Surface | `#FFFFFF` + hairline `rgba(46,31,38,0.06)` | every card (`.glass` / `.glass-solid` now mean white card) |
| Ink | `#2E1F26` | headings, body |
| Ink soft | `#5B4650` / `#6B5560` | secondary text |
| Accent | `#D6336C → #C2185B` | primary buttons, active nav underline, prices (`#C2185B`) |
| Accent tint | `#FFEAF2` | badges, "ดูทั้งหมด" pills, icon circles |
| Star | `#E0457E` | filled star before headings, review stars |
| Logo gold | `#AB7D1F` | only inside the logo files, never as a UI colour |

## Surfaces (`src/index.css`)

- **`.glass` / `.glass-solid`:** white card with a hairline border and a soft pink-tinted drop shadow. Cards are 22–30px radius.
- **`.glass-btn`:** white circle or pill with a pink icon or text, and a pink tint on hover.
- **`.btn-candy`:** the primary pill. Pink gradient, soft shadow, Prompt 500. The class names are kept from the old design so every page picked up the new look without logic edits.
- **`.btn-candy-soft`:** the secondary pill. White with a pink border and pink text.
- **Photo frames:** a 1px hairline at 20–22px radius.

## Type

- **Prompt:** headings and body on customer pages. This is scoped by `.lucky-page` in `index.css`, so admin keeps its fonts. Headings use weight 600–700 with a Thai line-height of 1.3 or more.
- **Wordmark:** "Lucky" in pink and "Salon" in ink, Prompt 600, beside the gold emblem, with the subtitle "Hair & Nail Salon".
- **Great Vibes** (`font-script`): only for "It's your style". Latin text only.

## Layout signatures

- **Header:**
  - a white bar;
  - text-only nav inside a thin rounded outline, with the active item in pink and a 2px underline;
  - an outlined "ประวัติของฉัน" pill with a gold sparkle;
  - a pink "จองคิวเลย" pill;
  - a hamburger at every width.
- **Hero:**
  - on desktop, the hand photo (`public/photos/hero-white.webp`) fills the right ~64% and fades to white toward the text; on phones it sits on top and fades downward;
  - the headline and script sit on the faded area;
  - the white carousel card is tilted 3° on the right;
  - the hours card (`HoursCard`, real settings and holidays) includes "ว่างเร็วสุด".
- **Section headers:** a filled pink star, the title, and a "ดูทั้งหมด" pill on the right.
- **Home order:**
  1. Hero
  2. "ลายเล็บของร้าน" with "บริการของเรา" beside it (`ServicesPreview`)
  3. Try-on card (two columns)
  4. Feature bar
  5. Full services list
  6. Reviews with contact beside it
  7. Footer

## Decoration

None floating. Bows, ribbons, hearts, the polish bottle and the bear were removed, though `Decor.jsx` still holds the drawings. `CrownBear` remains only on the 404 page and the booking-success screen.

## Motion

- **Entrance:** a short fade-up (`lucky-fade-up`) on the hero blocks.
- **Carousel:** 3D tilt on mouse, flip-in slides and a progress dot.
- **Try-on:** the 3D nail turns when the colour changes.
- **Reduced motion:** all of the above is disabled under `prefers-reduced-motion`.

## Photos

The photos in `public/photos/` are Unsplash placeholders, listed in `CREDITS.txt`. Replace each one with a real shop photo under the same file name. Nail designs and service images come from admin uploads.
