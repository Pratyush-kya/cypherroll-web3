'use client';

import React, { useMemo, useState, useEffect } from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import '@solana/wallet-adapter-react-ui/styles.css';

import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { base, arbitrum, mainnet } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

const projectId = 'c0b8f418702b80ea97669d255152a512'; // Public demo projectId

const wagmiConfig = createConfig({
  chains: [base, arbitrum, mainnet],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [base.id]: http(),
    [arbitrum.id]: http(),
    [mainnet.id]: http(),
  },
  ssr: true,
});

export default function Web3Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: false,
          },
        },
      })
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Solana configuration
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  const solanaWallets = useMemo(() => {
    if (typeof window === 'undefined') return [];
    try {
      return [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
    } catch {
      return [];
    }
  }, []);

  // Custom RainbowKit Cyberpunk Theme
  const customTheme = darkTheme({
    accentColor: '#F59E0B',
    accentColorForeground: '#020617',
    borderRadius: 'large',
    fontStack: 'system',
    overlayBlur: 'small',
  });

  const SafeConnectionProvider = ConnectionProvider as unknown as React.FC<any>;
  const SafeWalletProvider = WalletProvider as unknown as React.FC<any>;
  const SafeWalletModalProvider = WalletModalProvider as unknown as React.FC<any>;

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={customTheme}>
          <SafeConnectionProvider endpoint={endpoint}>
            <SafeWalletProvider wallets={solanaWallets} autoConnect={false}>
              <SafeWalletModalProvider>
                {children}
              </SafeWalletModalProvider>
            </SafeWalletProvider>
          </SafeConnectionProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
