#!/usr/bin/env python3
import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(36, 11 * inch - 28, "CypherRoll Web3 Casino — Architecture, Loopholes & User Manual")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(36, 11 * inch - 32, 8.5 * inch - 36, 11 * inch - 32)
        
        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 36, 22, footer_text)
        self.drawString(36, 22, "CONFIDENTIAL & PROPRIETARY — CYPHERROLL PLATFORM SPECIFICATION")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(36, 32, 8.5 * inch - 36, 32)
        
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=44,
        bottomMargin=44
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#475569'),
        spaceAfter=14
    )
    
    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor('#0284C7'),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=6
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#0F172A')
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1E293B')
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    callout_style = ParagraphStyle(
        'Callout',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#0F172A')
    )

    story = []
    
    # Title Banner
    story.append(Paragraph("CypherRoll: Platform Blueprint & Technical Manual", title_style))
    story.append(Paragraph(
        "A complete technical specification of the 3-tier hybrid Web3 casino architecture, "
        "cryptographic provably fair RNG, all 6 resolved loopholes, step-by-step user operational guide, and scaling roadmap.",
        subtitle_style
    ))
    
    # Metadata bar table
    meta_data = [
        [
            Paragraph("<b>Repository:</b> github.com/Pratyush-kya/cypherroll-web3", table_cell),
            Paragraph("<b>Commit:</b> 899fb1c (Production)", table_cell),
            Paragraph("<b>Solvency Cap:</b> $25,000 / payout", table_cell)
        ],
        [
            Paragraph("<b>Supabase DB:</b> pvrnvcgmxuhfbdvudcfs", table_cell),
            Paragraph("<b>Local Web:</b> http://127.0.0.1:3000", table_cell),
            Paragraph("<b>Tor Onion:</b> vv4ckspjgedi...ckqd.onion", table_cell)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[200, 180, 160])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # SECTION 1
    story.append(Paragraph("1. The 3-Tier Hybrid Architecture", h1_style))
    story.append(Paragraph(
        "Building a high-frequency Web3 casino directly on public blockchains is hindered by latency (400ms to 12s), "
        "gas fees on micro-bets, and MEV front-running. CypherRoll implements a <b>3-tier hybrid model</b> separating instant off-chain execution from non-custodial on-chain settlement:",
        body_style
    ))
    
    arch_data = [
        [Paragraph("<b>Tier</b>", table_header), Paragraph("<b>Layer & Technologies</b>", table_header), Paragraph("<b>Responsibilities & Invariants</b>", table_header)],
        [
            Paragraph("<b>Tier 1<br/>Presentation</b>", table_cell),
            Paragraph("Next.js 14 App Router, Three.js, React Three Fiber, Tailwind CSS, RainbowKit, Solana Wallet Adapter", table_cell),
            Paragraph("Renders interactive 3D Blender models (dice, rocket, chip). Manages sub-50ms SSE streams and Supabase WebSockets with zero client polling.", table_cell)
        ],
        [
            Paragraph("<b>Tier 2<br/>Engine State</b>", table_cell),
            Paragraph("Next.js Server API, Node.js CSPRNG, EIP-712 Signer, SSE State Machine", table_cell),
            Paragraph("Deterministic HMAC-SHA256 commit-reveal RNG. Atomic escrow wager locks. EIP-712 typed signature generation under $25k Kelly ceiling.", table_cell)
        ],
        [
            Paragraph("<b>Tier 3<br/>Ledger & Vaults</b>", table_cell),
            Paragraph("Supabase PostgreSQL (ACID), Base/Arbitrum Smart Contracts, Tor v3 daemon", table_cell),
            Paragraph("Durable audit ledger. Non-custodial EVM escrow vaults. Continuous solvency assertion: &Sigma;Player Balances &le; Total Vault Reserves.", table_cell)
        ]
    ]
    arch_table = Table(arch_data, colWidths=[70, 200, 270])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    story.append(arch_table)
    story.append(Spacer(1, 10))

    # SECTION 2: THE 6 LOOPHOLES
    story.append(Paragraph("2. The 6 Critical Problems Solved & Code Changes", h1_style))
    story.append(Paragraph(
        "Each milestone directly eliminated a critical financial, cryptographic, or network vulnerability:",
        body_style
    ))

    loophole_data = [
        [Paragraph("<b>Milestone</b>", table_header), Paragraph("<b>Vulnerability & Risk</b>", table_header), Paragraph("<b>Engineered Solution & Code</b>", table_header)],
        [
            Paragraph("<b>Step 1: Multi-Chain Auth</b>", table_cell),
            Paragraph("<b>Unverified Wallets:</b> Frontend address spoofing allowed claiming arbitrary balances.", table_cell),
            Paragraph("<b>SIWE / SIWS Nonces:</b> Server verifies EIP-4361 secp256k1 (EVM) and Ed25519 (Solana) cryptographic signatures. Issues signed HTTP-only HMAC session cookie.<br/><i>Files: lib/web3/useAuth.ts, app/api/auth/verify/route.ts</i>", table_cell)
        ],
        [
            Paragraph("<b>Step 2: Crash Engine</b>", table_cell),
            Paragraph("<b>Double-Spend Race:</b> Parallel bet requests spent same balance simultaneously before deduction.", table_cell),
            Paragraph("<b>Atomic Escrow Lock:</b> Single continuous state loop (50ms SSE). Atomic balance deduction (.gte('balance_usdc', wager)) during 5s countdown window.<br/><i>Files: lib/crash-engine.ts, app/api/games/crash/stream/route.ts</i>", table_cell)
        ],
        [
            Paragraph("<b>Step 3: Supabase Realtime</b>", table_cell),
            Paragraph("<b>HTTP Polling Collapse:</b> 3-second fetch loops saturated backend connections.", table_cell),
            Paragraph("<b>WebSocket Subscriptions:</b> Event-driven global_trollbox channel. Added presence.track() for live online degen count and live bets ticker.<br/><i>Files: components/rollbit/Trollbox.tsx, LiveBetsTicker.tsx</i>", table_cell)
        ],
        [
            Paragraph("<b>Step 4: EIP-712 Signer</b>", table_cell),
            Paragraph("<b>Whale Depletion & Replays:</b> Uncapped payouts or replayed signatures draining treasury.", table_cell),
            Paragraph("<b>Structured Vouchers & Kelly Cap:</b> EIP-712 typed data hashing with monotonic nonces. Enforces hard safety cap of $25,000 per automated withdrawal.<br/><i>Files: contracts/evm/CypherRollVault.sol, lib/web3/withdrawal-signer.ts</i>", table_cell)
        ],
        [
            Paragraph("<b>Step 5: Deposit & Solvency</b>", table_cell),
            Paragraph("<b>Fake Deposits & Insolvency:</b> Replay of deposit tx hash; liabilities exceeding assets.", table_cell),
            Paragraph("<b>RPC Listener & Solvency Invariant:</b> Confirmed receipt checks, idempotent tx recording, and live solvency assertion: &Sigma;Balances &le; Vault Reserves.<br/><i>Files: lib/web3/deposit-listener.ts, BankrollVault.tsx</i>", table_cell)
        ],
        [
            Paragraph("<b>Step 6: Tor & ChunkLoad Fix</b>", table_cell),
            Paragraph("<b>ChunkLoadError & Tor DNS:</b> Next.js standalone cache collisions; Tor blocking localhost lookups.", table_cell),
            Paragraph("<b>Bundler Gating & Native Onion:</b> Gated standalone builds, scoped QueryClient, disabled autoConnect, and launched native Tor v3 hidden service.<br/><i>Files: next.config.mjs, Web3Providers.tsx, docker/nginx/</i>", table_cell)
        ]
    ]

    loophole_table = Table(loophole_data, colWidths=[75, 175, 290])
    loophole_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    story.append(loophole_table)
    story.append(Spacer(1, 10))

    # SECTION 3: HOW TO USE
    story.append(Paragraph("3. How to Use & Test the Application", h1_style))
    story.append(Paragraph(
        "<b>A. Accessing the Platform:</b><br/>"
        "• <b>Normal Browser (Chrome/Firefox):</b> Navigate to <code>http://localhost:3000</code> or <code>http://127.0.0.1:3000</code>.<br/>"
        "• <b>Tor Browser:</b> Enter <code>http://127.0.0.1:3000/</code> (using 127.0.0.1 bypasses remote DNS) or open native hidden service: <code>http://vv4ckspjgediwc35ymcdusikc32msma5rc3t4m7n7aml7ddkaex5ckqd.onion</code>.",
        body_style
    ))

    user_steps = [
        [
            Paragraph("<b>1. Authentication</b>", table_header),
            Paragraph("Click 'Connect Wallet' &rarr; Select RainbowKit (Base/Arbitrum) or Solana (Phantom). Sign challenge nonce to receive 1,000.00 USDC testnet balance.", table_cell)
        ],
        [
            Paragraph("<b>2. 3D Dice</b>", table_header),
            Paragraph("Adjust Roll Target slider (e.g. Under 50.00). Click 'Roll Dice' &rarr; outcome resolves instantly via HMAC-SHA256; 3D beveled dice rolls in Three.js canvas.", table_cell)
        ],
        [
            Paragraph("<b>3. Multiplayer Crash</b>", table_header),
            Paragraph("Place bet during 5.0s countdown. Funds lock in escrow. As 3D rocket ascends, multiplier climbs via 50ms SSE stream. Click 'Cash Out' before crash point.", table_cell)
        ],
        [
            Paragraph("<b>4. Trollbox & Chat</b>", table_header),
            Paragraph("Live presence tracker displays actively connected players. Messages stream instantly via Supabase WebSockets with zero page refresh.", table_cell)
        ],
        [
            Paragraph("<b>5. Cashier & Solvency</b>", table_header),
            Paragraph("Deposit via testnet RPC confirmation. Withdrawals generate an on-chain EIP-712 voucher. Stake in Bankroll Vault to earn 19.4% APY as community LP.", table_cell)
        ]
    ]
    user_table = Table(user_steps, colWidths=[120, 420])
    user_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor('#0F172A')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('ROWBACKGROUNDS', (1,0), (1,-1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    story.append(user_table)
    story.append(Spacer(1, 10))

    # SECTION 4: PROVABLY FAIR
    story.append(Paragraph("4. Provably Fair Cryptographic Verification", h1_style))
    story.append(Paragraph(
        "<b>Mathematical Commitment:</b> The operator commits to <code>ServerSeedHash = SHA256(ServerSeed)</code> before betting. "
        "Outcome is derived deterministically without operator intervention:<br/>"
        "<code>HMAC = HMAC_SHA256(ServerSeed, ClientSeed + ':' + Nonce)</code><br/>"
        "<code>Roll = (parseInt(HMAC[0..8], 16) / 2^32) * 100</code><br/>"
        "• Dice House Edge: 1.0% &rarr; Multiplier = 99.00 / WinChance<br/>"
        "• Crash House Edge: 2.0% &rarr; 10,000 game simulation verified mean dice 49.88 and 2.75% instant crash.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # SECTION 5: FUTURE HARDENING
    story.append(Paragraph("5. Future Scaling & Hardening Roadmap", h1_style))
    roadmap_data = [
        [Paragraph("<b>Frontier</b>", table_header), Paragraph("<b>Implementation Description</b>", table_header)],
        [
            Paragraph("<b>Redis Cluster Pub/Sub</b>", table_cell),
            Paragraph("Decouple Crash engine from single Node.js process into Redis 7 Pub/Sub cluster with Lua scripts for horizontal multi-region scaling.", table_cell)
        ],
        [
            Paragraph("<b>Decentralized VRF</b>", table_cell),
            Paragraph("Integrate Chainlink VRF (EVM) or Pyth Entropy (Solana) for zero-trust seed generation on high-roller tables ($100k+).", table_cell)
        ],
        [
            Paragraph("<b>Automated AML Screening</b>", table_cell),
            Paragraph("Attach Chainalysis / Elliptic webhooks to deposit listener to automatically flag and quarantine sanctioned addresses.", table_cell)
        ],
        [
            Paragraph("<b>WASM Proof-of-Work</b>", table_cell),
            Paragraph("Require client-side minimal PoW (SHA-256 challenge in WASM) before Trollbox or bet submissions to defeat Tor bot floods without CAPTCHAs.", table_cell)
        ]
    ]
    roadmap_table = Table(roadmap_data, colWidths=[130, 410])
    roadmap_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    story.append(roadmap_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {filename}")

if __name__ == '__main__':
    output_path = "/home/pratyush/Project/Website/cypherroll-web3/docs/cypherroll_architecture_and_guide.pdf"
    if len(sys.argv) > 1:
        output_path = sys.argv[1]
    build_pdf(output_path)
