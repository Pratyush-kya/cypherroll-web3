# CypherRoll Web3 Casino — Master Architecture & Technical Blueprint

## 1. Executive Summary
CypherRoll is an enterprise-grade, provably fair Web3 casino featuring 4 signature casino titles (CypherDice, CypherCrash, CypherMines, and CypherPlinko). It bridges Web3 non-custodial wallet infrastructure (Solana / EVM) with high-frequency serverless gameplay, backed by cryptographic randomness, atomic PostgreSQL ledger settlements, and WebGL 3D visualizations.

## 2. Core Cryptographic Primitive (Provably Fair)
All game outcomes are derived from an unalterable HMAC-SHA256 commitment scheme:
- **Server Seed ($S$):** 256-bit cryptographically secure random string generated server-side.
- **Server Seed Hash ($H$):** Public pre-commitment $H = \text{SHA-256}(S)$ displayed to the player before wagering.
- **Client Seed ($C$):** Player-controlled entropy (customizable).
- **Nonce ($N$):** Monotonically increasing sequential bet counter ($1, 2, 3, \dots$).
- **HMAC Signature:** $\text{HMAC-SHA256}(S, C:N)$

## 3. Game Mathematics & Algorithms

### A. CypherDice
- **Formula:**
  $$\text{Float} = \frac{\sum_{i=0}^3 \text{byte}_i \cdot 256^{3-i}}{2^{32}}$$
  $$\text{Roll} = \lfloor \text{Float} \times 10000 \rfloor / 100 \in [0.00, 99.99]$$
- **RTP:** $98.0\%$ ($2.0\%$ House Edge).
- **Multiplier:** $\text{Multiplier} = \frac{100 \times 0.98}{\text{Target}}$.

### B. CypherCrash
- **Trajectory:** $M(t) = 1.00 \cdot e^{0.06 \cdot t}$ (Smooth exponential climb).
- **Crash Point:**
  $$E = 2^{52}, \quad h = \text{HMAC-SHA256}(S, C:N)[0..13]$$
  If $h \pmod{33} == 0 \implies \text{Crash at } 1.00\times$ ($3\%$ Instant House Edge).
  Otherwise: $\text{CrashPoint} = \lfloor \frac{100 \times E - h}{E - h} \rfloor / 100$.
- **RTP:** $97.0\%$ ($3.0\%$ House Edge).

### C. CypherMines
- **Grid:** 25 tiles (5×5), $m \in [1, 24]$ mines.
- **Mine Placement:** Fisher-Yates shuffle driven by $\text{HMAC}(S, C:N:\text{mine}:i)$.
- **Multiplier:**
  $$M(k) = \left\lfloor \left( \prod_{i=0}^{k-1} \frac{25 - i}{25 - m - i} \right) \times 0.97 \times 100 \right\rfloor / 100$$
- **RTP:** $97.0\%$ ($3.0\%$ House Edge).
- **State Token:** AES-256-GCM encrypted stateless token for zero-failure serverless persistence.

### D. CypherPlinko
- **Physics Model:** Galton Board with $N \in \{8, 12, 16\}$ rows.
- **Path Derivation:** $i$-th bit of HMAC determines deflection (0 = Left, 1 = Right).
- **Slot Distribution:** Binomial $P(S = k) = \frac{\binom{N}{k}}{2^N}$. Over $71\%$ of drops land in center slots.
- **Dual Multiplier Tables:**
  - **Manual Mode:** Standard payouts, $97.5\%$ RTP ($2.5\%$ House Edge).
  - **Auto-Drop Mode:** Reduced central payouts ($0.2\times - 0.5\times$), $94.5\%$ RTP ($5.5\%$ House Edge).
- **Auto-Drop Restrictor:** Hard-capped at 30 drops max, 700ms cadence, zero infinite drop loops.

## 4. Security & Compliance
- **Proof-of-Work Anti-DDoS:** Dynamic cryptographic challenge for bot deterrence.
- **Session-Isolated Rate Limiting:** IP + session keying, capped 2–3s throttle.
- **Database Concurrency:** Row-level locks (`FOR UPDATE`) inside PostgreSQL atomic stored procedures (`execute_atomic_bet`).
- **Zero-Dependency Audio:** Client-side Web Audio API procedural synthesis.
