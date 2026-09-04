# Product Requirements Document (PRD)

## 1. Project Overview & Vision
- **Project Name:** CypherRoll
- **Tagline / One-Liner:** The Next-Generation Provably Fair, High-Performance Web3 & Privacy-First Casino.
- **Target Audience:** Crypto-native traders, Web3 gamers, high-frequency bettors, privacy-first privacy advocates (Tor users), and fairness skeptics seeking mathematically auditable gaming.
- **Primary Objective:** Deliver a Rollbit-grade online gambling experience with sub-50ms bet latency, seamless multi-chain wallet connections (Solana + EVM), immutable smart contract escrow vaults, verifiable cryptographic fairness, and rich interactive 3D assets rendered via React Three Fiber.

---

## 2. Core User Stories & Workflows
- **As a Web3 Bettor:** I want to connect my Phantom or MetaMask wallet with one click (SIWE/SIWS) so that I can play immediately without filling out invasive registration forms or passwords.
- **As a High-Speed Gambler:** I want instantaneous game resolution (<50ms) in Crash, Dice, and Plinko so that I can place micro-bets rapidly without waiting for blockchain block confirmations.
- **As a Fairness Skeptic:** I want to inspect the SHA-256 pre-committed Server Seed, set my own Client Seed, and independently verify the HMAC-SHA256 outcome formula so that I know the house cannot rig the game.
- **As a Privacy Advocate:** I want to access the platform via Tor Onion Services (`.onion`) with zero WebRTC IP leakage so that my identity and location remain strictly confidential.
- **As an Investor / Liquidity Provider:** I want to stake capital into the Community Bankroll Vault so that I can passively earn a proportional share of the platform's 1.5% House Edge.

---

## 3. Feature Requirements

### Priority 0 (Must-Have for Production MVP)
- [ ] **Non-Custodial Multi-Chain Wallet Auth:** Support for Solana Wallet Adapter (Phantom, Solflare) and RainbowKit (MetaMask, Rabby, Coinbase) using SIWE/SIWS cryptographically signed sessions.
- [ ] **Provably Fair RNG Engine:** Implementation of HMAC-SHA256 commit-reveal algorithm with public seed rotation and in-browser calculation verifier.
- [ ] **Core Game Suite:**
  - **CypherDice:** Slider-based 0.00–99.99 roll with dynamic win chance, multiplier calculator, and auto-betting rules (Martingale, flat).
  - **CypherCrash:** Real-time exponential multiplier curve running on a 50ms WebSocket tick with cash-out triggers and crash explosion.
- [ ] **Smart Contract Escrow Vaults:** Non-custodial deposit contracts on Solana (Anchor) and EVM (Arbitrum/Base) with operator signature-verified withdrawals.
- [ ] **Interactive 3D Visuals:** Blender-modeled, Draco-compressed 3D interactive dice and crash rocket elements rendered via Three.js / React Three Fiber with 2D canvas fallback.
- [ ] **2-Tier Database Architecture:** Redis 7+ for in-memory sub-millisecond atomic state and PostgreSQL 16 with row-level locks (`SELECT FOR UPDATE`) for the immutable ledger.

### Priority 1 (High Value Enhancements)
- [ ] **Tiered VIP Rakeback & Cashback:** Dynamic return of 10%–25% of the calculated mathematical house edge back to active bettors based on wager volume tiers.
- [ ] **Live Global Bets Feed:** Low-overhead WebSocket broadcasting of high-roller wins, recent bets, and leaderboard stats.
- [ ] **Dynamic Kelly Criterion Bet Capper:** Automatic enforcement of max payout ceilings:
  $$\text{Max Profit} \le 1\% \text{ of Liquid Hot Vault Reserves}$$
- [ ] **Tor Onion Service v3 Deployment:** Native `.onion` endpoint configuration with Unix domain sockets and zero IP logging.

### Priority 2 (Ecosystem & Growth)
- [ ] **Community Bankroll Staking (LP Vault):** Decentralized vault allowing players to underwrite the casino bankroll and share in gross gaming revenue (GGR).
- [ ] **CypherRoll Token ($CYPH) Integration:** Buyback and burn mechanism driven by 20% of net platform revenue.

---

## 4. Tooling & MCP Integration Layer
*List of MCP servers and capabilities powering the development and maintenance of CypherRoll:*
- **MCP Servers:**
  - `blender`: Automated headless 3D asset generation, material assignment, and Draco-compressed `.glb` export.
  - `shadcn`: Radix-based accessible UI primitives (modals, sliders, tables, tabs, badges).
  - `21st`: Rapid installation of curated community blocks and dark-mode glassmorphic layouts.
- **Skills Activated:**
  - `ui-ux-pro-max`: Design system tokens, color palettes, and typography audit.
  - `magicui`: Particle backgrounds, bento grids, and border beams for the landing and VIP sections.
  - `smoothui`: Spring physics for live multiplier numbers and animated balance counters.

---

## 5. Non-Functional Requirements
- **Performance:** Sub-50ms WebSocket bet responses, sub-second initial page render, 3D assets under 1.5MB total payload.
- **Accessibility:** WCAG AAA compliance, high contrast ratio (minimum 4.5:1), keyboard navigable controls, full `prefers-reduced-motion` support.
- **Security:** CSPRNG seed generation (`crypto.randomBytes(32)`), zero plaintext secret logging, row-level database serialization preventing concurrency double-spends.
- **Responsiveness:** Flawless responsiveness across Mobile (375px), Tablet (768px), and Desktop (1024px+).
