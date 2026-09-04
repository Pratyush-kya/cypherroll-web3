# Technical Architecture

## 1. System Overview
- **Application Name:** CypherRoll
- **Architecture Pattern:** 3-Tier Hybrid Web3 Architecture (Off-Chain Execution + On-Chain Settlement)
- **Primary Frontend:** Next.js 14+ (App Router), TypeScript (Strict Mode)
- **Primary Game Engine:** Node.js / Bun WebSocket State Server
- **Primary Databases:** Redis 7+ (In-Memory Hot State) & PostgreSQL 16 (ACID Relational Ledger)
- **Consensus & Settlement:** Multi-chain Smart Contract Vaults (EVM Arbitrum/Base Solidity & Solana Anchor Program)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TIER 1: PRESENTATION LAYER                         │
│  - Next.js 14 App Router + Tailwind CSS                                    │
│  - UI Primitives: shadcn/ui + MagicUI (Bento, Particles) + SmoothUI         │
│  - 3D Visual Engine: Three.js / React Three Fiber (@react-three/fiber)     │
│  - Web3 Connectors: RainbowKit (EVM) + Solana Wallet Adapter (SOL)         │
│  - Client Privacy: WebRTC disabled, Tor Onion Service v3 Compatible        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ WebSocket (WSS) / HTTPS
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                       TIER 2: APPLICATION & LOGIC LAYER                     │
│  - High-Speed State Engine: Sub-50ms WebSocket Broadcasts                   │
│  - Cryptographic Provably Fair: CSPRNG (crypto.randomBytes), HMAC-SHA256    │
│  - Authentication: SIWE (EIP-4361) & SIWS (Sign-In with Solana)             │
│  - Concurrency Gatekeeper: Redis Lua Scripts (Atomic Balance Deductions)    │
│  - Treasury Guard: Kelly Criterion Max Profit Dynamic Limiter (<= 1% Vault) │
│  - Hot Wallet Dispatcher: Automated EIP-712 / Ed25519 Withdrawal Signer     │
└──────────────────────┬───────────────────────────────┬──────────────────────┘
                       │                               │
                       ▼                               ▼
┌──────────────────────────────────────┐ ┌────────────────────────────────────┐
│      TIER 3A: PERSISTENCE & AUDIT    │ │   TIER 3B: ON-CHAIN CONSENSUS      │
│  - Redis 7+ (In-Memory Hot State)    │ │  - EVM Escrow Vault (Arbitrum/Base)│
│  - PostgreSQL 16 (Ledger & Audit)    │ │  - Solana Anchor Escrow Program    │
│  - Row-Level Locking (FOR UPDATE)    │ │  - Non-Custodial Player Deposits   │
│  - Continuous WAL Archiving to S3    │ │  - Operator Signature Withdrawals  │
└──────────────────────────────────────┘ └────────────────────────────────────┘
```

---

## 2. Tech Stack Matrix
| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 14+ (App Router) | High SEO performance, server components for static landing, React 18+ concurrency |
| **Styling & Design** | Tailwind CSS + CSS Variables | Zero runtime, customizable tokens (`globals.css`), instant theme switching |
| **UI Primitives** | `shadcn/ui` + `radix-ui` | Headless, fully accessible (WCAG AAA), keyboard-interactive components |
| **Motion & Micro-interactions** | `smoothui` + `magicui` | Spring-physics counters, dynamic multiplier tickers, particle hero effects |
| **3D Asset Rendering** | `@react-three/fiber` + `@react-three/drei` | Lightweight WebGL canvas rendering Draco-compressed `.glb` models from Blender |
| **In-Memory Cache & State** | Redis 7+ | Atomic balance decrements via Lua, sub-millisecond Pub/Sub for game ticks |
| **ACID Relational Ledger** | PostgreSQL 16 | Durable financial record, row-level locks preventing race-condition double spends |
| **Blockchain Smart Contracts** | Solidity (EVM) & Rust Anchor (Solana) | Low transaction costs, high throughput, non-custodial user escrow |

---

## 3. Tooling & MCP Architecture
```text
CypherRoll Agent Pipeline
   ├── MCP Servers:
   │    ├── blender: Generates, optimizes, and exports Draco-compressed .glb models
   │    ├── shadcn: Accessible Radix UI components (dialogs, tabs, sliders)
   │    └── 21st: Curated Web3 community blocks & layouts
   └── Active Skills:
        ├── ui-ux-pro-max: Dark OLED Cyberpunk palette (#0F172A, #F59E0B, #8B5CF6)
        ├── magicui: Bento grid showcases, border beam animations
        └── smoothui: Spring physics for real-time odds & cash-out buttons
```

---

## 4. Production Components: Deep Integration

### A. Database & Scalability
- **Hot/Cold Split:**
  - Active game sessions, current round bets, and temporary balances reside in **Redis**.
  - All balance updates use **Redis Lua scripts** ensuring 100% atomic execution without thread race conditions.
  - Periodic and milestone flushes sync state into **PostgreSQL 16** with indexed ledger tables (`accounts`, `ledger_entries`, `bets`, `seed_history`).
- **Horizontal Worker Scaling:** Stateless game WebSocket servers run behind Nginx/HAProxy with sticky sessions per game room.

### B. Security & Defense Invariants
- **Zero-KYC Cryptographic Auth:** SIWE / SIWS sessions with 24-hour expiration, cryptographic challenge-response nonces to prevent replay attacks.
- **Strict Concurrency Protection:** Financial deposits and withdrawals execute inside PostgreSQL transactions with `SELECT ... FOR UPDATE`.
- **System Invariant Monitor:** A real-time watchdog thread runs every 60 seconds asserting:
  $$\text{Total User Balances} \le \text{Escrow Vault Holdings} + \text{Hot Wallet Reserves}$$
  If the invariant fails, the withdrawal engine enters automatic lockdown.
- **3-Tier Treasury:**
  - Hot Wallet: $\le 5\%$ of liquidity (automated instant payouts).
  - Warm Multi-sig: $15\%$ (daily rebalancing, requires 2-of-3 signatures).
  - Cold Vault: $80\%$ (air-gapped multisig, 3-of-5 signatures).

### C. Performance & Low Latency
- **Sub-50ms WebSocket Game Loop:** Game ticks broadcast binary or compact JSON frames over raw WebSockets (RFC 6455).
- **Blender 3D Asset Compression:**
  - Geometry: Draco mesh compression reducing file size by 80%.
  - Textures: Baked PBR maps (roughness, metallic, emissive) under 1024x1024.
  - Overall asset footprint: $<1.2\text{MB}$ total, enabling fast loading even over Tor circuits.
  - Fallback: Graceful 2D HTML5 canvas mode when WebGL is unavailable.

### D. Monetization & Casino Economics
- **Mathematical House Edge:** 1.0% (Dice) and 2.0% (Crash).
- **Provably Fair Payout Formula:**
  $$\text{Multiplier} = \frac{100 - \text{HouseEdge}}{\text{WinProbability}} \times (1 - \text{HouseRake})$$
- **Dynamic Withdrawal Margin:** Gas fee + 0.1% platform fee.
- **Community Bankroll Staking (LP Vault):** Users stake USDC/SOL into the liquidity vault to earn a share of daily platform gross gaming revenue (GGR).
- **VIP Rakeback:** Returning 10%–20% of the theoretical house edge back to active bettors to incentivize volume.

### E. Backup & Disaster Recovery
- **Continuous WAL Archiving:** PostgreSQL Write-Ahead Logs streamed continuously to off-site S3 storage.
- **On-Chain Event Replay:** A disaster recovery tool can rebuild 100% of user balances and deposit histories by querying blockchain smart contract `Deposit` and `Withdrawal` event logs directly from RPC archive nodes.

---

## 5. Component & Directory Architecture
```text
cypherroll-web3/
├── app/                        # Next.js App Router (Pages, Layouts)
│   ├── layout.tsx              # Root layout with Web3 providers & fonts
│   ├── page.tsx                # Main Casino Lobby
│   ├── games/
│   │   ├── dice/page.tsx       # CypherDice interface with 3D canvas
│   │   └── crash/page.tsx      # CypherCrash interface with live rocket
│   └── api/
│       ├── auth/               # SIWE/SIWS verification endpoints
│       └── provably-fair/      # Public verification endpoints
├── components/
│   ├── ui/                     # shadcn/ui primitives (Button, Slider, Dialog)
│   ├── 3d/                     # Three.js / React Three Fiber interactive components
│   │   ├── DiceCanvas.tsx      # Interactive 3D Dice with physics roll
│   │   └── CrashRocket.tsx     # 3D Cyberpunk Rocket launching into space
│   ├── games/                  # Game controls, betting sliders, multiplier display
│   └── web3/                   # RainbowKit & Solana Wallet buttons & modal
├── lib/
│   ├── provably-fair.ts        # HMAC-SHA256 engine & verification algorithms
│   ├── db/                     # Redis & PostgreSQL connection pools
│   └── web3/                   # Smart contract ABIs, RPC clients, signature utils
├── contracts/                  # Smart contract source code
│   ├── evm/                    # Solidity Escrow Vault (Arbitrum/Base)
│   └── solana/                 # Anchor Escrow Program (Rust)
├── scripts/
│   └── blender_export_assets.py# Automated headless Blender script for 3D assets
└── public/
    └── assets/3d/              # Draco-compressed .glb assets exported from Blender
```
