# Project Rules & Development Guidelines

> Guiding Principle: "The best code is the code you never wrote." (Ponytail Minimalist Engineering)

## 1. Core Engineering Rules
1. **Elimination & YAGNI First:** Do not write speculative helpers, wrapper classes, or premature abstractions. Solve the concrete requirement with direct, robust code.
2. **Codebase Reuse:** Always check existing components in `components/ui/` and functions in `lib/` before adding new files or helpers.
3. **No Hardcoded Hex Colors:** Always use CSS variable utilities (e.g. `bg-background`, `text-primary`, `bg-cta`, `border-border`).
4. **Strict TypeScript:** No `any`. Explicit interfaces for component props, API payloads, WebSocket frames, and database entities.
5. **No Third-Party Bloat:** Do not introduce external libraries when native platform features (Web Crypto API, native WebSockets, Fetch, CSS transforms) suffice.

---

## 2. Financial & Security Invariants (Non-Negotiable)
1. **Atomic State Transactions:** All balance deductions and payouts must execute inside atomic transactions (PostgreSQL `SELECT ... FOR UPDATE` or Redis Lua scripts). Never perform non-transactional balance mutations.
2. **Cryptographic Randomness (CSPRNG):** Never use `Math.random()` for seeds or outcomes. Use `crypto.randomBytes(32)` on the server and `crypto.getRandomValues()` on the client.
3. **Commit-Reveal Sequence:** The `SHA-256(ServerSeed)` must be sent to the client **before** the bet is received. The plain `ServerSeed` must never be revealed until the seed pair is explicitly rotated.
4. **Dynamic Bet Caps (Kelly Criterion):**
   $$\text{Max Profit Per Round} \le 1\% \times \text{Liquid Hot Wallet Reserves}$$
   Any bet where $(\text{Amount} \times \text{Multiplier} - \text{Amount}) > \text{MaxProfit}$ must be rejected by the backend.
5. **Zero Secret Leaks:** Private keys, seed pre-images, and database connection strings must never be committed to Git or exposed in client bundles (`NEXT_PUBLIC_`).

---

## 3. 3D & UI Component Blending Rules
- **Canvas Isolation:** Three.js / React Three Fiber `<Canvas>` elements must be wrapped in error boundaries and `<Suspense>` components with an immediate 2D fallback.
- **Asset Size Limit:** Blender 3D `.glb` exports must not exceed 1.5MB. Draco compression is mandatory.
- **Motion Safety:** All animations must respect `prefers-reduced-motion` via standard hooks or CSS media queries.
- **Icon Consistency:** Use `lucide-react` icons exclusively. Do not mix disparate icon libraries.

---

## 4. Documentation Drift Prevention
- Whenever a database schema, API route, smart contract method, or component library is modified, update `Architecture.md` and `Design.md`.
- Never mark a phase complete in `Phase.docs.md` until code compiles cleanly with zero lint or type errors.

---

## 5. Pre-Commit Verification Gate
Before declaring any task or phase done, run:
```bash
npm run lint && tsc --noEmit && npm run build
```
The exit code must be `0` with zero compiler warnings or errors.
