# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two groups, weighted about equally:

- **New customers**, mostly women from school age to working age. They find the shop through photos of its work, compare nail designs and prices on their phone, and book online.
- **Regulars from the neighborhood**, who come back for hair or nails. They want to see the price and the next free slot quickly, then book again, reschedule or cancel without calling.

Most visits happen on a phone. The shop owner and staff use the separate admin side, which is out of scope for customer-facing design work.

## Product Purpose

Lucky Salon is the website of one neighborhood hair and nail salon in Thailand. Customers use it to see services and prices, browse nail designs, try nail colors on a photo of their own hand, and book a time. They can also check, reschedule and cancel their own bookings and leave reviews.

The site succeeds when a visitor goes from "I like this design" to a confirmed booking without phoning the shop, and when the shop stops double-booking or losing appointments.

## Positioning

- **Try before booking.** Customers try nail colors and finishes on a photo of their own hand, and an AI model suggests designs, before they book. Nearby salons cannot offer this.
- **Korean-style nail designs.** Soft, sheer, cute work with bows, French tips and glitter is the shop's specialty.
- **Hair and nails in one place.** Several services can be booked back to back in one visit.
- **Self-service booking.** Customers book any time, reschedule or cancel on their own, and get reminders on LINE.

## Operating Context

- The frontend is React with Vite and Tailwind and is deployed on Vercel. The backend is FastAPI and is deployed on Render.
- Booking flow: choose category and service → date and free time → name and phone → booking code. Customers find their bookings again by phone number and booking code on the history page.
- The shop's name, address, phone, LINE ID, opening hours and holidays are set by the owner in admin settings. Customer pages read them from the API.
- Services, nail designs, prices and photos come from the admin side. Customer pages display data and never hard-code it.
- Every customer-facing word is in Thai, except brand words such as "Lucky Salon" and short decorative script lines.

## Capabilities and Constraints

- Customer routes:
  - `/` home
  - `/booking` booking wizard, accepts `?service=<id>`
  - `/gallery` nail designs
  - `/ai` nail try-on and AI recommendation
  - `/history` the customer's bookings
  - edit-booking page
  - `/privacy`
  - 404 page
- **Design work must not change system behavior.** Out of scope: the backend, the admin pages, API clients, booking and availability logic, and the NailTryOn color logic.
- Thai text needs a line-height of at least 1.4. Tone marks clip with tighter leading.
- Script display faces are used for Latin words only. Avoid "AI" in script, because it reads as "AJ".
- Respect `prefers-reduced-motion`.
- Undecided: the payment method (deposit or pay at the shop) and the timing of the handover to the real shop.

## Brand Commitments

- **Name:** "Lucky Salon", with the subtitle "Nail & Hair Salon" and a small crown over a script wordmark. Never "Nailly"; that name appears in early mockups only.
- **Visual reference made binding by the owner:** the pink "Nailly" mockup and the Lucky Salon services mockup supplied in the conversation of 2026-11-25. They show:
  - a dreamy pink salon photo backdrop with frosted-glass cards;
  - a pill navigation bar with icons;
  - a script headline "It's your style";
  - a Popular Styles photo card, a Try On Color card, and an "Our Nails" photo strip;
  - a highlight bar of four features;
  - satin bows, ribbons, glossy hearts and sparkles as decoration;
  - glossy candy-pink buttons.

  The owner wants the site to look like these references.
- **Voice:** sweet, friendly and caring, like a nail technician who pays attention to detail.

## Evidence on Hand

- Real photos of the shop's work exist. The owner will send them later. Until then, illustrative images are placeholders, and the layout must make swapping in real photos easy.
- Real reviews: none yet. Customers write reviews through the site. Never fabricate reviews, ratings, like counts, customer numbers or awards.
- Service names, prices and durations: these come from the admin data. Do not invent any.

## Product Principles

1. **Designs lead to booking.** Every nail design or service a visitor admires is one tap away from booking it.
2. **Show the shop's real work.** Photos of real work and the visitor's own hand persuade better than claims, so never fake proof.
3. **Be quick for regulars.** Price, free time and "my bookings" stay easy to reach for people who already know the shop.
4. **Keep it cute on top, solid underneath.** The decoration can be lavish, but booking, rescheduling and cancelling must stay clear and reliable on a phone.

## Accessibility & Inclusion

- Mobile first, because most customers book on a phone.
- Body text must keep readable contrast on pink and glass surfaces.
- Keep the reduced-motion fallbacks, and make keyboard focus visible.
