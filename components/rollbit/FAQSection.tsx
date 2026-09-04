'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle, ShieldCheck, Lock, Landmark, Sparkles, AlertCircle } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQS: FAQItem[] = [
  {
    category: "Provably Fair",
    question: "How does Provably Fair guarantee that CypherRoll cannot rig outcomes?",
    answer: "Before every round, the server generates a cryptographically random 256-bit Server Seed and commits to it by showing you its SHA-256 hash upfront. You provide your own Client Seed (or let your browser generate one). When the bet resolves, HMAC-SHA256 combines both seeds with an incremental Nonce. Because the hash was committed beforehand, the casino cannot alter the outcome without changing the hash. You can independently verify any past bet using our on-site Audit tool."
  },
  {
    category: "Game Math",
    question: "What are the House Edges and RTPs across CypherRoll games?",
    answer: "CypherDice offers a 1.00% House Edge (99.00% RTP), one of the most generous in the industry. CypherCrash offers a 2.00% House Edge (98.00% RTP). Outcomes are derived directly from the underlying cryptographic HMAC bits without arbitrary house adjustments."
  },
  {
    category: "Privacy & Tor",
    question: "How does CypherRoll protect my privacy and anonymity?",
    answer: "CypherRoll is engineered for the Tor network (.onion v3). We employ zero server-side IP logging, disable WebRTC leaks in our client bundles, and use cryptographic Sign-In with Ethereum/Solana (SIWE/SIWS). You never have to share an email, password, or upload identity documents."
  },
  {
    category: "Deposits & Payouts",
    question: "How do deposits and withdrawals work?",
    answer: "Funds are deposited directly into our on-chain smart contract escrow vaults on Solana or EVM Layer-2s (Base / Arbitrum). Withdrawals are non-custodially authorized via cryptographic operator signatures and dispatched automatically to your wallet in seconds."
  },
  {
    category: "VIP Rakeback",
    question: "How does the VIP Rakeback system work?",
    answer: "Just like Rollbit, every single bet you place—win or lose—accumulates rakeback. We return 10% to 25% of the calculated mathematical house edge directly back into your claimable rakeback vault. As your wager volume increases, you climb from Bronze to Silver, Gold, Platinum, and Diamond."
  },
  {
    category: "Community Bankroll",
    question: "What is the Community Bankroll Staking Vault?",
    answer: "Players can act as the 'House' by staking USDC or SOL into our decentralized liquidity vault. Stakers underwrite casino bets, enforce the Kelly Criterion 1% max-profit cap, and earn passive yield distributed from daily gross gaming revenue (GGR)."
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="w-full max-w-5xl mx-auto my-12 px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-primary mb-2">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Transparency & Protocol Guide</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-heading font-black text-foreground uppercase tracking-wide">
          Frequently Asked Questions
        </h2>
        <p className="text-xs font-mono text-slate-400 mt-1">
          Everything you need to know about Provably Fair math, Tor security, and multi-chain vaults.
        </p>
      </div>

      <div className="space-y-3">
        {FAQS.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-primary uppercase">
                    {faq.category}
                  </span>
                  <span className="font-heading text-sm font-semibold text-slate-200">
                    {faq.question}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                    isOpen ? 'rotate-180 text-primary' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs font-body text-slate-300 leading-relaxed border-t border-slate-800/60 bg-slate-950/40">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
