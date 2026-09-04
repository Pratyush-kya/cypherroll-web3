# Project Implementation Phases & Roadmap

> Tracking document for the AI agent and developer. Update checkboxes as work completes.

---

## Phase 1: Project Foundation & Tooling Setup
- [ ] **1.1 Initialize Project:** Scaffold Next.js 14+ with App Router, TypeScript (Strict Mode), and Tailwind CSS.
- [ ] **1.2 Configure Design Tokens:** Add the Dark OLED Cyberpunk variables (`--background: #0F172A`, `--primary: #F59E0B`, `--cta: #8B5CF6`) and Google Fonts (`Orbitron`, `Exo 2`, `JetBrains Mono`) to `globals.css`.
- [ ] **1.3 Initialize shadcn/ui:** Setup `components.json` with slate base color and install essential primitives (`button`, `slider`, `dialog`, `tabs`, `badge`).
- [ ] **Verification Gate 1:** `npm run build` succeeds; the base layout renders design tokens cleanly with zero console warnings.

---

## Phase 2: Cryptographic Provably Fair Engine
- [ ] **2.1 Implement Core Cryptography (`lib/provably-fair.ts`):**
  - CSPRNG 256-bit server seed generator.
  - Pre-commitment `SHA-256(ServerSeed)` hashing.
  - `HMAC-SHA256` deterministic roll outcome generator for Dice (0.00–99.99) and Crash (1.00x–10,000.00x).
- [ ] **2.2 Mathematical House Edge Validation:**
  - Enforce 1.0% house edge on Dice and 2.0% on Crash.
  - Unit test verifying empirical RTP converges to 99.0% and 98.0% over 100,000 iterations.
- [ ] **2.3 Public Verifier Component:**
  - Build interactive verification modal where players input Server Seed, Client Seed, and Nonce to independently audit past bets.
- [ ] **Verification Gate 2:** Test suite passes with 100% mathematical reproducibility on known test vectors.

---

## Phase 3: 3D Blender Modeling & Draco GLB Asset Pipeline
- [ ] **3.1 Headless Blender Python Script (`scripts/blender_export_assets.py`):**
  - Script procedural modeling of a 3D Cyberpunk Dice with beveled edges, pips, and glowing neon metallic materials.
  - Script procedural modeling of a 3D Crash Rocket / Multiplier Ring with emissive thruster exhaust.
- [ ] **3.2 Draco Compression & Export:**
  - Execute Blender headlessly: `blender --background --python scripts/blender_export_assets.py` to generate optimized `.glb` files (<1.2MB).
- [ ] **3.3 React Three Fiber Canvas Integration:**
  - Create `<DiceCanvas>` and `<CrashRocket>` components with smooth rotation, lighting, and 2D canvas fallback.
- [ ] **Verification Gate 3:** `.glb` files verify under 1.5MB; 3D canvases render at steady 60 FPS in browser with fallback support.

---

## Phase 4: Web3 Wallet Authentication & Escrow Vaults
- [ ] **4.1 Multi-Chain Connectors:**
  - Configure Solana Wallet Adapter (Phantom, Solflare) for Solana network.
  - Configure RainbowKit + Wagmi + Viem for EVM chains (Arbitrum / Base).
- [ ] **4.2 Cryptographic Session Auth:**
  - Implement Sign-In with Ethereum (SIWE - EIP-4361) and Sign-In with Solana (SIWS) nonce-based authentication.
- [ ] **4.3 Smart Contract Escrow Vault Models:**
  - Solidity contract specification for EVM deposit/withdrawal vault with operator signature verification.
  - Solana Anchor program specification for non-custodial player balance escrow.
- [ ] **Verification Gate 4:** Mock wallets authenticate successfully; signed session tokens validate on backend.

---

## Phase 5: High-Speed Game Suite & UI Implementation
- [ ] **5.1 CypherDice Interface:**
  - Interactive roll slider (1–98 target), win probability calculator, payout multiplier display.
  - Auto-betting rules (Martingale, on-win/loss percentage adjustment).
  - Synchronized 3D dice roll animation.
- [ ] **5.2 CypherCrash Interface:**
  - High-frequency WebSocket multiplier ticker (sub-50ms tick rate).
  - Cashout button with spring animation (`smoothui`) and instant payout calculation.
  - Interactive 3D rocket flight with crash explosion effect.
- [ ] **5.3 Live Bets & Leaderboard Feed:**
  - Compact real-time global bets table with player anonymization, game type, wager, and profit.
- [ ] **Verification Gate 5:** Interactive games run without UI lag; game resolution loop completes under 50ms.

---

## Phase 6: Production Hardening, Concurrency & Security Audit
- [ ] **6.1 Concurrency & Double-Spend Locks:**
  - Test simultaneous rapid bets to verify PostgreSQL `SELECT ... FOR UPDATE` and Redis Lua atomic deductions prevent balance double-spends.
- [ ] **6.2 Dynamic Kelly Criterion Bet Capper:**
  - Enforce max payout rejection when potential profit exceeds 1% of hot vault reserves.
- [ ] **6.3 Final Quality & Build Verification:**
  - Run full linting, TypeScript strict check, and production build:
  ```bash
  npm run lint && tsc --noEmit && npm run build
  ```
- [ ] **Final Verification Gate:** Zero compiler warnings, 100% type safety, production build ready for deployment.
