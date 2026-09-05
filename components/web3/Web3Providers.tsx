'use client';

import React, { useMemo, useState, useEffect } from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import '@solana/wallet-adapter-react-ui/styles.css';

import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider, createConfig, http, createStorage, noopStorage } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { base, arbitrum, mainnet } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Tor Browser Sandbox Guard: Polyfill localStorage if blocked by private browsing mode
if (typeof window !== 'undefined') {
  try {
    const test = '__cypher_storage_test__';
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
  } catch {
    const memory = new Map<string, string>();
    const safeMemStorage = {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => memory.set(k, String(v)),
      removeItem: (k: string) => memory.delete(k),
      clear: () => memory.clear(),
      key: (i: number) => Array.from(memory.keys())[i] ?? null,
      get length() { return memory.size; },
    };
    try {
      Object.defineProperty(window, 'localStorage', {
        value: safeMemStorage,
        configurable: true,
        writable: true,
      });
    } catch {}
  }
}

// Resilient Wagmi storage safe against Tor DOM exceptions
const safeStorage = typeof window !== 'undefined'
  ? createStorage({
      storage: {
        getItem: (k) => {
          try { return window.localStorage.getItem(k); } catch { return null; }
        },
        setItem: (k, v) => {
          try { window.localStorage.setItem(k, v); } catch {}
        },
        removeItem: (k) => {
          try { window.localStorage.removeItem(k); } catch {}
        },
      },
    })
  : createStorage({ storage: noopStorage });

const wagmiConfig = createConfig({
  chains: [base, arbitrum, mainnet],
  connectors: [injected()],
  storage: safeStorage,
  transports: {
    [base.id]: http(),
    [arbitrum.id]: http(),
    [mainnet.id]: http(),
  },
  ssr: true,
});

class SafeWeb3Boundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: any) {
    console.warn('Web3 Provider initialised in fallback sandbox mode:', err);
  }
  render() {
    return this.props.children;
  }
}

export default function Web3Providers({ children }: { children: React.ReactNode }) {
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

  // Solana configuration
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  const solanaWallets = useMemo(() => {
    if (typeof window === 'undefined') return [];
    try {
      const list = [];
      if ((window as any).phantom?.solana) {
        list.push(new PhantomWalletAdapter());
      }
      if ((window as any).solflare) {
        list.push(new SolflareWalletAdapter());
      }
      return list;
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
    <SafeWeb3Boundary>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider theme={customTheme}>
            <SafeConnectionProvider endpoint={endpoint}>
              <SafeWalletProvider wallets={solanaWallets} autoConnect={true} localStorageKey="cypherroll_solana_wallet">
                <SafeWalletModalProvider>
                  {children}
                </SafeWalletModalProvider>
              </SafeWalletProvider>
            </SafeConnectionProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </SafeWeb3Boundary>
  );
}
