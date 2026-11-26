# Lucky Salon: working rules for Claude

Lucky Salon is the booking site of one hair and nail salon in Thailand.
- Frontend: React, Vite and Tailwind in `frontend/`, deployed on Vercel.
- Backend: FastAPI in `backend/`, deployed on Render.
- Product context: `PRODUCT.md`. Visual system: `DESIGN.md`.

Reply to the owner in Thai.

## How a task arrives

The owner gives a task and its scope, for example:

- **Task:** what they want
- **Scope:** which pages or parts may change, and what must not
- **Reference:** a sample image or site, if any
- **Mode:** ask before starting, or just do it

Before starting, pick the skills from the table below and state them in one short line: which skills, and why. If the task or scope is unclear, ask first.

## Which skills to use

| Kind of task | Skills, in order |
|---|---|
| New feature, or an idea that is not settled yet | `brainstorming` → `writing-plans` → implement → `verification-before-completion` |
| A plan that is already written | `executing-plans`, or `subagent-driven-development` when its tasks are independent |
| Several unrelated tasks at once | `dispatching-parallel-agents` |
| Bug or failing test | `systematic-debugging` → `test-driven-development` (a test that stops it coming back) |
| Look, layout or polish of customer pages | `impeccable` (+ `unslop`), following `DESIGN.md` |
| Critique or audit of the design | `impeccable` critique / audit |
| Motion or micro-interactions | `cast` or `gsap-react` + `motion-design` |
| Scroll-driven animation | `gsap-scrolltrigger` + `gsap-react` |
| 3D (nail, bottle, hand) | `threejs-react-three-fiber` + the relevant `threejs-*` |
| Copying the style of a reference image or site | `design-dna`, then `impeccable` |
| Keep a change minimal, or check a change or the repo for bloat, bugs and risk | `ponytail` (smallest complete change), `ponytail-review` (one change), `ponytail-audit` (whole repo, report only) |
| Work is done and ready to merge | `requesting-code-review` → `finishing-a-development-branch` |
| A review comes back | `receiving-code-review` |

Ask the owner before running heavy or costly skills: `bunshin`, `paint`, `impeccable` redesign or `overdrive`, and any work that spawns many subagents.

## Do not touch without an explicit request

- Backend code, admin pages, API clients (`frontend/src/api`)
- Booking and availability logic, and the NailTryOn color logic
- Design work changes the look only, never system behavior.
- Never fabricate reviews, ratings, prices, customer counts or awards. Service data comes from admin.
- Never ask the owner to paste secrets (JWT_SECRET, API keys, 2FA codes) into chat.
- Never restore over live customer data.
- Backup files contain customer names and phone numbers, so never publish or share them.
- Do not touch the "rovshop" Vercel project.

## Before saying "done"

1. Run the tests and the build:
   - `cd frontend && npm test` (all tests must pass)
   - `cd frontend && npm run build`
2. Check UI changes in a real browser with Playwright, at phone, tablet and desktop widths. There must be no horizontal overflow and no page errors.
3. When booking-related files changed, run a full test booking end to end.
4. Report what was verified and what was not.

## Git

- Work on the session's assigned branch. Do not push to `main` without permission.
- Do not open a PR unless asked.
- Skills in `.claude/skills/` are vendored copies. Each has `LICENSE` and `SOURCE.txt`. Do not edit them, and do not install hooks from them.
