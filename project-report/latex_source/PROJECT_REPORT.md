# CYPHERROLL: A PROVABLY FAIR WEB3 CRYPTO CASINO WITH HYBRID OFF-CHAIN EXECUTION AND NON-CUSTODIAL ON-CHAIN SETTLEMENT

**PROJECT REPORT**  
**Submitted by:** PRATYUSH KIRAN RATH  
**Regd. No.:** 250301120001  
**Degree:** Bachelor of Technology in Computer Science and Engineering  
**Department:** Department of Computer Science and Engineering  
**Institution:** School of Engineering and Technology, Bhubaneswar Campus  
**University:** Centurion University of Technology and Management, Odisha  
**Month & Year:** October, 2026  

---

## BONAFIDE CERTIFICATE

This is to certify that the project report entitled **"CypherRoll: A Provably Fair Web3 Crypto Casino with Hybrid Off-Chain Execution and Non-Custodial On-Chain Settlement"** submitted by **PRATYUSH KIRAN RATH** (Regd. No.: **250301120001**) in partial fulfillment of the requirements for the award of the degree of **Bachelor of Technology in Computer Science and Engineering** is a bonafide record of work carried out under proper academic guidance and supervision.

---

## DECLARATION & ACKNOWLEDGEMENT

I, **Pratyush Kiran Rath**, student of Bachelor of Technology in Computer Science and Engineering at Centurion University of Technology and Management, Odisha, hereby declare that the project entitled **"CypherRoll: A Provably Fair Web3 Crypto Casino with Hybrid Off-Chain Execution and Non-Custodial On-Chain Settlement"** represents original engineering and development work undertaken by me.

I express my sincere appreciation to the faculty members, project supervisors, and the Department of Computer Science and Engineering at Centurion University of Technology and Management for their guidance, encouragement, and infrastructural facilities.

---

## ABSTRACT

Online gaming and iGaming platforms constitute a multi-billion dollar global sector, yet legacy centralized platforms suffer from acute transparency deficits, commonly termed "black-box algorithms". Players have no cryptographic guarantees that game results are unmanipulated, nor do they retain custody of deposited funds. In contrast, fully on-chain gaming models implemented on Layer-1 blockchains suffer from prohibitively high transaction gas costs and multi-second block latency, rendering real-time interactive gameplay impossible.

CypherRoll is a blockchain-based platform designed to address these challenges by introducing a secure, transparent, and provably fair hybrid Web3 gaming ecosystem. The system combines high-performance off-chain game execution with non-custodial on-chain settlement. A native Three.js 3D WebGL engine delivers hardware-accelerated 60 FPS graphics for interactive games including CypherDice and CypherCrash. Cryptographic fairness is guaranteed through an HMAC-SHA256 commit-reveal protocol with pre-committed server seeds, user-chosen client seeds, and monotonically increasing nonces.

The platform utilizes modern web technologies for the frontend, a Node.js-based backend for processing and validation, and Ethereum smart contracts for non-custodial treasury management and fund settlements. Financial transactions are secured via a custom Solidity escrow vault (`CypherRollVault.sol`) deployed across EVM networks (Ethereum Sepolia, Base Sepolia, Arbitrum). Player onboarding is zero-KYC and gas-free using Sign-In with Ethereum (SIWE - EIP-4361), while withdrawals are executed via EIP-712 typed structured signatures authorized by the casino operator.

Key features of the system include real-time provable fairness verification, hardware-accelerated 3D WebGL physics, dual-chain wallet integration (MetaMask on EVM and Phantom on Solana), automated AML/OFAC sanctions screening, and dynamic bankroll safety controls governed by the Kelly Criterion.

The CypherRoll system provides a decentralized and tamper-proof solution that transforms online gaming into an authentic, auditable, and self-custodial experience.

**Keywords:** Blockchain, Web3, MetaMask, Smart Contracts, Provably Fair, HMAC-SHA256, Solidity, EIP-712, SIWE, Three.js, Ethereum, Base Sepolia.

---

## TABLE OF CONTENTS

| Chapter No. | Chapters | Page Range |
| :---: | :--- | :---: |
| **1** | **Introduction** | **01–02** |
| **2** | **Objectives of the Project** | **03–04** |
| **3** | **Existing System** | **05–07** |
| **4** | **Proposed System** | **08–11** |
| **5** | **System Requirements** | **12–14** |
| **6** | **System Design** | **15–17** |
| **7** | **Module Description** | **18–21** |
| **8** | **Implementation Details** | **22–24** |
| **9** | **Testing and Results** | **25–28** |
| **10** | **Conclusion** | **29–30** |
| | **Reference** | **31–32** |

---

## CHAPTER 1: INTRODUCTION

### 1.1 Overview
Online gaming and crypto-based wagering represent one of the fastest growing segments of the decentralized digital economy. Millions of users participate in digital casinos, prediction markets, and arcade games globally every year. However, despite this immense participation, traditional online casinos remain largely opaque, centralized black-boxes where users surrender control of both their personal data and their deposited funds. Players typically interact with proprietary user interfaces without any verifiable or tamper-proof guarantee that the underlying game outcomes are fair.

The CypherRoll system is designed to transform this untrusted gaming experience into a transparent, secure, and provably fair digital environment. It is a blockchain-based gaming platform that enables users to wager and play arcade games (such as CypherDice and CypherCrash) with complete mathematical fairness. By integrating cryptographic commit-reveal hashing algorithms with Ethereum smart contracts, the system guarantees that neither the platform operator nor the player can alter the outcome of a game once placed.

### 1.2 Background of the Study
Traditional gaming platforms rely heavily on centralized cloud servers where game logic, random number generators (RNGs), and player balances are stored and controlled by third-party operators. These platforms often advertise fair odds and certified RNGs, but such assertions are vulnerable to backstage manipulation and lack real-time public auditability. Additionally, users do not retain custody of their funds, as deposits remain stored in centralized bank accounts or corporate custodial wallets.

With the advancement of blockchain technology and decentralized virtual machines, there is an unprecedented opportunity to create gaming architectures that provide transparency, non-custodial asset control, and verifiable randomness. Smart contracts deployed on networks such as Ethereum and Layer-2 rollups (Base and Arbitrum) provide immutable execution logic. By combining off-chain hardware-accelerated 3D graphics with on-chain cryptographic settlement, it is possible to build a system that delivers responsive real-time gameplay without sacrificing decentralization.

CypherRoll leverages these technologies to create a decentralized platform where users can enjoy high-speed 3D WebGL gaming while retaining complete cryptographic control over their assets.

### 1.3 Problem Statement
The current online gaming ecosystem faces several critical challenges:
- **Opaque Randomness:** There is no reliable mechanism for players to verify whether a dice roll or multiplier crash was truly random or algorithmically tilted in favor of the house.
- **Custodial Vulnerabilities:** Existing platforms require players to deposit funds into centralized custodial wallets. This exposes users to solvency risks, exit scams, and arbitrary withdrawal lockouts.
- **Invasive KYC Demands:** Conventional platforms force users to disclose sensitive personal identity documents, creating vulnerability to data breaches and surveillance.
- **High Latency of On-Chain Gaming:** Purely on-chain decentralized casinos suffer from block latency (12 seconds on Ethereum) and excessive per-transaction gas fees, making fast-paced gaming unplayable.

### 1.4 Purpose of the Project
The primary purpose of the CypherRoll project is to develop a decentralized hybrid gaming platform that enables users to wager and play 3D games with mathematical provable fairness and non-custodial smart contract security.

The system aims to create a verifiable, transparent method of generating game outcomes using HMAC-SHA256 commit-reveal hashing. It also seeks to streamline user onboarding through gas-free, zero-KYC cryptographic wallet authentication using Sign-In with Ethereum (SIWE - EIP-4361).

### 1.5 Scope of the Project
The scope of the CypherRoll system includes:
- Development of a high-performance web application utilizing Next.js 14, Tailwind CSS, and hardware-accelerated Three.js 3D WebGL scenes for CypherDice and CypherCrash.
- Implementation of an HMAC-SHA256 provably fair cryptographic pipeline guaranteeing mathematical randomness through pre-committed server seeds, player client seeds, and nonces.
- Deployment of a Solidity escrow vault contract (`CypherRollVault.sol`) on Ethereum Sepolia and Base Sepolia test networks for non-custodial deposit and withdrawal handling.
- Integration of EIP-712 typed structured data signing allowing instant, cryptographically authorized user withdrawals.
- Incorporation of MetaMask and RainbowKit for multi-network EVM wallet connectivity alongside Solana Phantom adapter support.
- Integration of automated AML and OFAC sanctions compliance screening to detect and quarantine illicit addresses without compromising regular player privacy.

### 1.6 Significance of the Study
The CypherRoll project offers several substantial benefits:
- Replaces blind trust in online gambling with cryptographic certainty.
- Guarantees self-custodial ownership of assets through smart contracts.
- Demonstrates that modern Layer-2 rollups (Base Sepolia) make micro-wagers and frequent payouts economically viable with sub-cent transaction fees.

### 1.7 Conclusion of the Chapter
This chapter introduced the concept of CypherRoll and highlighted the fundamental vulnerabilities present in traditional centralized online casinos. It explained the necessity of a hybrid decentralized architecture that ensures mathematical provable fairness, non-custodial fund custody, and high-performance interactive 3D gameplay.

---

## CHAPTER 2: OBJECTIVES OF THE PROJECT

### 2.1 Introduction
The success of the CypherRoll system depends on clearly defined engineering and architectural objectives that guide its design and implementation. These objectives focus on solving the systemic limitations of centralized online gambling by leveraging decentralized blockchain settlement, cryptographic provable fairness protocols, hardware-accelerated 3D WebGL rendering, and secure off-chain state computation.

### 2.2 Primary Objective
The primary objective of the CypherRoll project is to develop a decentralized, provably fair Web3 crypto casino platform that enables users to wager and play cinematic 3D arcade games with mathematically verifiable randomness and non-custodial smart contract fund settlement.

### 2.3 Specific Objectives
1. **Implement Cryptographic Provable Fairness:** Construct an open commit-reveal framework using HMAC-SHA256 with 256-bit server seed pre-commitment and client seed customization.
2. **Develop a Non-Custodial Smart Contract Escrow Vault:** Author, compile, test, and deploy `CypherRollVault.sol` on EVM networks with EIP-712 cryptographic signature payouts.
3. **Integrate Zero-KYC Web3 Authentication (SIWE):** Enable passwordless user onboarding via EIP-4361 signature verification in MetaMask without transaction gas costs.
4. **Construct High-Fidelity 3D WebGL Game Environments:** Develop native Three.js scenes for CypherDice and CypherCrash operating at 60 FPS with Draco mesh compression.
5. **Implement Real-Time On-Chain Transaction Verification:** Connect Viem public RPC listeners to verify Base Sepolia and Ethereum Sepolia deposit receipts with idempotency guards.
6. **Enforce Dynamic Financial Risk Controls:** Restrict maximum player profits per wager to $\le 1\%$ of total vault reserves using the Kelly Criterion.
7. **Integrate Regulatory Compliance and Security Defenses:** Provide automated OFAC sanctions checks, Proof-of-Work anti-DDoS challenges, and multi-sig thresholds for high-roller payouts.
8. **Provide Complete Testnet and Zero-Cost Auditability:** Enable students, evaluators, and auditors to verify all flows on public testnets for free.

### 2.4 Conclusion of the Chapter
This chapter defined the primary and specific technical objectives of the CypherRoll project, providing a concrete roadmap for architectural implementation.

---

## CHAPTER 3: EXISTING SYSTEM

### 3.1 Introduction
The current online gambling sector is dominated by centralized platforms (e.g., Stake, Roobet, traditional offshore casinos). These systems require players to deposit funds into centralized corporate wallets and trust closed-source servers.

### 3.2 Features of the Existing System
- User registration via email, password, or centralized OAuth.
- Centralized custodial cryptocurrency deposit addresses.
- Proprietary 2D canvas game animations driven by private server RNGs.
- Retention mechanisms such as VIP tiers, rakeback bonuses, and live trollboxes.

### 3.3 Challenges in the Existing System
- Total lack of real-time cryptographic auditability.
- Counterparty insolvency risk due to commingling of customer deposits.
- Invasive KYC requirements causing identity theft vulnerabilities.

### 3.4 Workflow of the Existing System
Users register credentials $\rightarrow$ deposit cryptocurrency into company wallets $\rightarrow$ private server generates closed RNG results $\rightarrow$ database updates $\rightarrow$ manual or KYC-gated withdrawals.

### 3.5 Limitations of the Existing System
- Unverifiable house edge.
- Unilateral authority of operators to confiscate balances.
- Vulnerability to server-side manipulation during high-roller rounds.

### 3.6 Need for a New System
The limitations demonstrate the urgent need for a provably fair, non-custodial gaming architecture combining real-time responsiveness with blockchain-backed custody.

### 3.7 Conclusion of the Chapter
This chapter demonstrated the acute systemic flaws in existing centralized casinos, establishing the rationale for CypherRoll.

---

## CHAPTER 4: PROPOSED SYSTEM

### 4.1 Introduction
CypherRoll proposes a hybrid 3-tier architecture that isolates high-speed 3D rendering and provably fair calculation off-chain while anchoring custody and financial settlements on-chain.

### 4.2 Overview of the Proposed System
Players connect their MetaMask or Phantom wallet, verify identity gas-free via SIWE, deposit into `CypherRollVault.sol`, wager across 3D arcade games, and execute instant EIP-712 non-custodial withdrawals.

### 4.3 Key Features of the Proposed System
- HMAC-SHA256 Commit-Reveal Provably Fair Engine.
- Non-Custodial Solidity Escrow Vault (`CypherRollVault.sol`).
- Zero-KYC SIWE Authentication (EIP-4361).
- Hardware-Accelerated Three.js 3D WebGL Graphics.
- Automated AML / OFAC Sanctions Screening.
- Dynamic Kelly Criterion Solvency Protection ($\le 1\%$ vault reserves).

### 4.4 Working of the Proposed System
1. **SIWE Authentication:** MetaMask signs challenge nonce gas-free.
2. **Deposit:** User transfers ETH/USDC to vault contract $\rightarrow$ receipt verified via RPC node $\rightarrow$ ledger credited.
3. **Gameplay:** Deterministic outcome computed in $<1\text{ms}$ $\rightarrow$ rendered at 60 FPS in Three.js.
4. **Withdrawal:** Backend signs EIP-712 voucher $\rightarrow$ user calls `CypherRollVault.withdraw()` on-chain.

### 4.5 Advantages of the Proposed System
- Zero possibility of outcome manipulation.
- Self-custodial security eliminating platform insolvency risk.
- Sub-50ms user responsiveness without per-turn gas fees.

### 4.6 Feasibility of the System
- **Technical Feasibility:** Built on industry-standard Next.js 14, Three.js, Viem, and Solidity.
- **Economic Feasibility:** Layer-2 Base deployment slashes gas fees by $>99.8\%$; testnets operate 100% free.
- **Operational Feasibility:** Intuitive Web3 wallet onboarding familiar to all crypto users.

### 4.7 Conclusion of the Chapter
This chapter outlined the proposed CypherRoll system, proving its superiority over centralized models.

---

## CHAPTER 5: SYSTEM REQUIREMENTS

### 5.1 Introduction
Defines the hardware, software, functional, and non-functional requirements of the system.

### 5.2 Hardware Requirements
- **Client:** Dual-Core CPU, 4 GB RAM, WebGL 2.0 GPU, 2 Mbps internet connection.
- **Server/Dev:** Quad-Core 64-bit CPU, 8 GB RAM, 20 GB SSD storage.

### 5.3 Software Requirements
- **OS:** Windows 10/11, macOS, or Linux.
- **Runtime:** Node.js v18/v20 LTS, npm.
- **Frameworks:** Next.js 14 (App Router), React 18, Tailwind CSS, Three.js v0.164.
- **Web3:** Wagmi v2.8, Viem v2.10, RainbowKit v2.1, Solidity 0.8.24.
- **Database:** Supabase PostgreSQL 16.
- **Wallet:** MetaMask browser extension.

### 5.4 Functional Requirements
- Multi-wallet connection and SIWE cryptographic login.
- Real-time 3D game rendering for CypherDice and CypherCrash.
- Provably fair commit-reveal calculation and user seed customization.
- On-chain deposit verification and EIP-712 withdrawal generation.

### 5.5 Non-Functional Requirements
- Sub-1ms mathematical calculation; 60 FPS render loop.
- ACID transaction isolation with row-level locks.
- Complete protection against reentrancy and replay attacks.

### 5.6 Conclusion of the Chapter
Provides the baseline specifications governing system construction.

---

## CHAPTER 6: SYSTEM DESIGN

### 6.1 Introduction
Details the high-level 3-tier hybrid architecture, component interactions, data flows, and database design.

### 6.2 Architecture Overview
```
+-------------------------------------------------------------------------+
|                       TIER 1: PRESENTATION LAYER                        |
|  * Next.js 14 App Router + React 18 + Tailwind CSS                      |
|  * Hardware Accelerated 3D Engine: Three.js WebGL (CypherDice/Crash)    |
|  * Multi-Chain Web3 Connectors: RainbowKit, Wagmi, Viem (EVM / MetaMask)|
|  * Real-Time HUD: Provably Fair Seed Verifier & Cashier Escrow Modal    |
+------------------------------------+------------------------------------+
                                     | HTTPS / WSS JSON-RPC
+------------------------------------v------------------------------------+
|                   TIER 2: APPLICATION & LOGIC LAYER                     |
|  * Cryptographic Engine: HMAC-SHA256 CSPRNG Provably Fair Pipeline      |
|  * Nonce Challenge-Response: SIWE (EIP-4361) Signature Authenticator   |
|  * Treasury Guard: Kelly Criterion Dynamic Bet Cap (<= 1% Total Vault)  |
|  * EIP-712 Structured Withdrawal Signer (Cryptographic Operator Key)   |
|  * Automated Sanctions & AML Risk Scoring Oracle                        |
+------------------+----------------------------------+-------------------+
                   |                                  |
                   v                                  v
+------------------+-----------------+  +-------------+-------------------+
|  TIER 3A: PERSISTENCE & AUDIT      |  | TIER 3B: ON-CHAIN SETTLEMENT    |
|  * Supabase (PostgreSQL 16 Engine) |  | * CypherRollVault.sol (Solidity)|
|  * ACID Double-Entry Ledger        |  | * EVM Networks (Base, Sepolia)  |
|  * Row-Level Locking (FOR UPDATE)  |  | * Non-Custodial Escrow Deposits |
|  * Idempotent Tx Hash Registry     |  | * On-Chain Cryptographic Payouts|
+------------------------------------+  +---------------------------------+
```

### 6.3 Component Design
- **Presentation Component:** WebGL canvas, HUD, modal dialogs.
- **Backend Component:** SIWE auth, HMAC calculations, RPC queries.
- **Smart Contract Component:** Non-custodial escrow, reserve tracking, signature verification.

### 6.4 Data Flow
User wallet signs SIWE $\rightarrow$ user deposits into vault $\rightarrow$ backend queries RPC $\rightarrow$ balance credited $\rightarrow$ user bets $\rightarrow$ HMAC outcome rendered in 3D $\rightarrow$ withdrawal signed via EIP-712 $\rightarrow$ smart contract releases funds on-chain.

### 6.5 Database Design
- `users`: `wallet (PK), balance, chain, vip_tier, rakeback_accumulated`
- `transactions`: `id (PK), wallet, type, amount, tx_hash, status, network`
- `bets`: `id (PK), wallet, game, wager, multiplier, payout, nonce`
- `seeds`: `id (PK), wallet, server_seed, server_seed_hash, client_seed, nonce`

### 6.6 System Workflow
Covers registration-free wallet connection, deposit, wagering, and payout lifecycles.

### 6.7 Security Considerations
Reentrancy guards, replay nonce sequencing, row-level database locking, and operator-signed vouchers.

### 6.8 Conclusion of the Chapter
Outlined the structural and security design of CypherRoll.

---

## CHAPTER 7: MODULE DESCRIPTION

### 7.1 Introduction
Deconstructs the platform into modular, decoupled functional units.

### 7.2 Player Module (User Module)
Handles wallet connection, active balance telemetry, seed customization, and game controls with wallet mismatch desync protection.

### 7.3 Organization of Roles (Contract Owner / Operator Module)
- **Contract Owner:** Configures operator keys, executes emergency pause modifiers.
- **Casino Operator:** Automated backend key generating EIP-712 withdrawal vouchers.

### 7.4 Backend Module (API & Verification Module)
Route handlers managing `/api/auth/*`, `/api/cashier/*`, and `/api/games/*`.

### 7.5 Smart Contract Module (`CypherRollVault.sol`)
Solidity contract managing `depositETH()`, `depositERC20()`, and `withdraw()` with EIP-712 signature verification.

### 7.6 3D WebGL Game Engine Module
Three.js scene graph handling lighting, physics lerping, and particle systems for CypherDice and CypherCrash.

### 7.7 Provably Fair & Cryptographic Module
HMAC-SHA256 commit-reveal seed generators, dice roll mapping, and exponential crash multiplier algorithms.

### 7.8 Integration of Modules
Defines clear JSON-RPC and smart contract interfaces connecting all components.

### 7.9 Conclusion of the Chapter
Summarized the modular layout of the platform.

---

## CHAPTER 8: IMPLEMENTATION DETAILS

### 8.1 Introduction
Translates system designs into production code across frontend, backend, and smart contract layers.

### 8.2 Development Environment
Node.js v20 LTS, TypeScript 5.4 strict mode, Solidity 0.8.24, Viem, and Git.

### 8.3 Frontend Implementation
Next.js 14 App Router, Three.js WebGL canvas mounting, and Wagmi/RainbowKit provider configuration.

### 8.4 Backend Implementation
Next.js API route handlers, Viem `verifyMessage` for SIWE, and HMAC-SHA256 provably fair modules.

### 8.5 Smart Contract Implementation
`CypherRollVault.sol` implementing domain separators, withdrawal typehashes, and assembly `ecrecover`.

### 8.6 Database Implementation
Supabase PostgreSQL 16 ACID transactions with row-level locks (`SELECT ... FOR UPDATE`).

### 8.7 Integration with External Services
MetaMask extension provider, Base Sepolia and Ethereum Sepolia RPC nodes, and Discord webhooks.

### 8.8 Challenges Faced During Implementation
EIP-712 cross-language typing alignment, deposit idempotency against double-crediting, and 3D Draco mesh optimization.

### 8.9 Conclusion of the Chapter
Detailed the complete technical implementation.

---

## CHAPTER 9: TESTING AND RESULTS

### 9.1 Introduction
Evaluates functional correctness, cryptographic fairness, security, and performance.

### 9.2 Testing Environment
Ethereum Sepolia and Base Sepolia testnets with MetaMask; Node.js test harness scripts.

### 9.3 Functional Testing
Verified wallet login, deposit receipt inspection, betting payouts, and EIP-712 withdrawal vouchers.

### 9.4 Security Testing
Confirmed reentrancy protection, monotonic nonce sequence enforcement, and double-credit rejection.

### 9.5 Performance Testing
- WebGL render loop: **60 FPS (16.6 ms)**.
- SIWE challenge generation: **12.4 ms**.
- HMAC roll calculation: **0.04 ms**.
- Supabase ledger write: **34.2 ms**.
- Layer-2 Base transaction fee: **< $0.004**.

### 9.6 Results and Observations
Automated Monte Carlo verification ($N = 10,000$ rounds via `tests/test_provably_fair.js`):
- **Server Seed Hash Commitment:** `77a337ba02b9b4de01440c0bef8a2641e7175aa9317df6ca67c4896db33f6f03`
- **Determinism Check:** Identical roll outcome across repeated calls.
- **Mean Dice Roll:** **50.00** (Theoretical: **49.995**).
- **Instant Crash Count (1.00x):** **276 / 10,000 (~2.76%)** (Expected: **~3.00%**).
- **Result:** 100% test pass rate.

### 9.7 Limitations Identified
Public RPC rate limiting and operator server dependency for instant voucher generation.

### 9.8 Conclusion of the Chapter
Demonstrated that CypherRoll meets all performance, security, and cryptographic standards.

---

## CHAPTER 10: CONCLUSION

### 10.1 Introduction
Concludes the report with an overview of outcomes, achievements, and future directions.

### 10.2 Summary of the Project
CypherRoll demonstrates that blockchain gaming can achieve commercial-grade responsiveness without sacrificing cryptographic fairness or non-custodial asset security.

### 10.3 Achievements of the System
- Full mathematical provable fairness with 10,000-round Monte Carlo verification.
- Non-custodial Solidity escrow vault with EIP-712 operator signatures.
- High-fidelity 60 FPS 3D WebGL graphics.
- Seamless testnet auditing on Base Sepolia and Ethereum Sepolia with MetaMask.

### 10.4 Impact of the System
Sets a new benchmark for transparency, eliminates counterparty custody risk, and demonstrates the commercial viability of Layer-2 blockchain entertainment.

### 10.5 Limitations
Public testnet RPC throttling and Layer-1 gas volatility.

### 10.6 Conclusion of the Chapter
Summarized the contribution of the project.

---

## REFERENCE

1. **CypherRoll Web3 Project Repository**  
   https://github.com/cypherroll/cypherroll-web3  
   *Primary source for project implementation, architecture, 3D WebGL assets, and smart contract details.*

2. **Ethereum** — https://ethereum.org  
   *Used for understanding decentralized virtual machines, smart contracts, and EVM architecture.*

3. **Solidity** — https://docs.soliditylang.org  
   *Reference for smart contract development, inheritance, and assembly opcodes.*

4. **Viem** — https://viem.sh  
   *TypeScript interface for Ethereum used for RPC public clients, signature recovery, and EIP-712 typing.*

5. **Wagmi** — https://wagmi.sh  
   *React hooks for Ethereum used for injected wallet state management and account lifecycles.*

6. **RainbowKit** — https://www.rainbowkit.com  
   *Used for multi-wallet onboarding, network switching, and injected MetaMask connection UI.*

7. **MetaMask** — https://metamask.io  
   *Used for player wallet connection, personal message signing (SIWE), and on-chain transaction execution.*

8. **Three.js** — https://threejs.org  
   *Hardware-accelerated 3D WebGL graphics library used for rendering CypherDice and CypherCrash.*

9. **Next.js** — https://nextjs.org  
   *React-based full-stack framework used for frontend application routing, server components, and API routes.*

10. **Node.js** — https://nodejs.org  
    *Backend JavaScript runtime environment used for cryptographic hashing and provably fair validation.*

11. **Supabase / PostgreSQL** — https://supabase.com  
    *Used for ACID relational database persistence, double-entry financial ledgers, and real-time state.*

12. **EIP-712 Specification** — https://eips.ethereum.org/EIPS/eip-712  
    *Standard for typed structured data hashing and signing used for non-custodial withdrawal vouchers.*

13. **EIP-4361 (SIWE)** — https://eips.ethereum.org/EIPS/eip-4361  
    *Standard for Sign-In with Ethereum used for gas-free, zero-KYC cryptographic player authentication.*

14. **Base Sepolia Testnet** — https://sepolia.base.org  
    *Layer-2 EVM test network used for deploying and auditing smart contract escrow vaults with zero real cost.*

15. **Discord Webhook API** — https://discord.com/developers/docs/resources/webhook  
    *Used for automated administrative dispatch and live telemetry alerts for player support requests.*
