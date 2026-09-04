import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CypherRoll | Autonomous Provably Fair Web3 Casino',
  description: 'High-performance, provably fair Web3 casino with sub-50ms bet latency, 3D interactive canvases, and non-custodial multi-chain escrow vaults.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased selection:bg-primary selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
