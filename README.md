# CypherRoll Web3 Casino 🎲🚀

CypherRoll is a next-generation, provably fair Web3 Crypto Casino built for the future. It features high-end native 3D WebGL game environments, real-time cryptographic fairness, seamless crypto banking, and a comprehensive Admin management system.

## 🌟 Key Features

* **Cinematic 3D WebGL Games:** Fully customized native Three.js environments for **CypherDice** and **CypherCrash**. Features highly optimized `.glb` assets (smooth curved dice, glowing rocket thrusters) synchronized with mathematical real-time physics.
* **Provably Fair Engine:** 100% transparent cryptographic rolling system ensuring true randomness and player trust.
* **Discord Support Desk:** Integrated live user ticketing system that routes help requests directly to a private Discord webhook for instant admin alerts.
* **Live Global Bet Ticker:** Infinite marquee tracking real-time wagers and payouts across the platform.
* **Advanced Admin Dashboard:** A secure control panel monitoring Total Value Locked (TVL), real-time WebSocket player presence, banking reserves, and live support tickets.
* **Zero Dummy Data:** The platform is wired for production—all metrics, online counts, and vault statistics reflect true mathematical data (no hardcoded fake metrics).

## 🛠 Tech Stack

* **Frontend:** Next.js 14, React, Tailwind CSS, Framer Motion
* **3D Engine:** Three.js / WebGL (Native Custom Materials & Physics Lerping)
* **Backend / Database:** Supabase (PostgreSQL, Auth, Realtime)
* **Infrastructure:** Vercel (Hosting), Discord Webhooks (Alerts)

## 📁 Documentation & Assets

For a deeper technical breakdown, investor pitches, or architectural diagrams, please see the `docs/` folder included in this repository:
* `docs/CypherRoll_Technical_Deep_Dive.pptx` - Comprehensive presentation of the platform's architecture.
* `docs/CypherRoll_3D_Master_Prompt.md` - Technical specifications for the 3D generation pipeline.

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure your `.env.local` (Supabase URLs, Discord Webhook)
4. Run the development server: `npm run dev`

---
*Built for production. Fully optimized for the Web3 gaming ecosystem.*
