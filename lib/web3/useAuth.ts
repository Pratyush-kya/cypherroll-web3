'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import bs58Import from 'bs58';

const bs58 = (bs58Import as any).default || bs58Import;

export interface UserProfile {
  wallet: string;
  chain?: string;
  balance: number;
  vipTier: string;
  accumulatedRakeback: number;
  totalWagered: number;
}

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Solana hooks
  const solanaWallet = useWallet();

  // EVM hooks
  const evmAccount = useAccount();
  const { signMessageAsync: signEvmMessage } = useSignMessage();
  const { disconnect: disconnectEvm } = useDisconnect();

  // Restore existing session on mount
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.profile) {
        setUser(data.profile);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Sign-In with Solana (SIWS)
  const signInSolana = async () => {
    if (!solanaWallet.publicKey || !solanaWallet.signMessage) {
      setAuthError("Solana wallet not connected or does not support message signing");
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      // 1. Get challenge nonce from backend
      const nonceRes = await fetch('/api/auth/nonce');
      const { message } = await nonceRes.json();

      // 2. Request user signature via wallet
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = await solanaWallet.signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signatureBytes);

      // 3. Verify on server and set session cookie
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: solanaWallet.publicKey.toBase58(),
          chainType: 'SOL',
          message,
          signature: signatureBase58,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");

      setUser(verifyData.profile);
      setIsAuthenticated(true);
    } catch (err: any) {
      setAuthError(err.message || "Failed to sign in with Solana");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Sign-In with Ethereum / EVM (SIWE)
  const signInEVM = async () => {
    if (!evmAccount.address || !evmAccount.isConnected) {
      setAuthError("EVM wallet not connected");
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      // 1. Get challenge nonce from backend
      const nonceRes = await fetch('/api/auth/nonce');
      const { message } = await nonceRes.json();

      // 2. Request user signature via Wagmi
      const signature = await signEvmMessage({ message });

      // 3. Verify on server and set session cookie
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: evmAccount.address,
          chainType: 'EVM',
          message,
          signature,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");

      setUser(verifyData.profile);
      setIsAuthenticated(true);
    } catch (err: any) {
      setAuthError(err.message || "Failed to sign in with EVM");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Disconnect connected wallet (without necessarily being authenticated)
  const disconnectWallet = useCallback(async () => {
    try {
      if (solanaWallet.connected) {
        await solanaWallet.disconnect();
      }
    } catch (e) {
      console.warn('Solana disconnect error:', e);
    }
    try {
      if (evmAccount.isConnected) {
        disconnectEvm();
      }
    } catch (e) {
      console.warn('EVM disconnect error:', e);
    }
  }, [solanaWallet, evmAccount.isConnected, disconnectEvm]);

  // Sign Out (clears session cookie, disconnects wallets, resets state)
  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout API error:', e);
    }
    await disconnectWallet();
    setUser(null);
    setIsAuthenticated(false);
  };

  // Active Wallet Desync Protection: Detect if connected extension wallet differs from session profile
  const activeEvmAddress = evmAccount.address;
  const activeSolanaPubkey = solanaWallet.publicKey?.toBase58();

  const walletMismatch = useMemo(() => {
    if (!isAuthenticated || !user) return false;
    if (user.chain === 'EVM' && activeEvmAddress) {
      return activeEvmAddress.toLowerCase() !== user.wallet.toLowerCase();
    }
    if (user.chain === 'SOL' && activeSolanaPubkey) {
      return activeSolanaPubkey !== user.wallet;
    }
    return false;
  }, [isAuthenticated, user, activeEvmAddress, activeSolanaPubkey]);

  const switchWalletSession = async () => {
    await signOut();
    if (activeSolanaPubkey) {
      await signInSolana();
    } else if (activeEvmAddress) {
      await signInEVM();
    }
  };

  return {
    user,
    setUser,
    isAuthenticated,
    isAuthenticating,
    authError,
    walletMismatch,
    switchWalletSession,
    signInSolana,
    signInEVM,
    signOut,
    disconnectWallet,
    checkSession,
    solanaConnected: solanaWallet.connected,
    solanaPublicKey: solanaWallet.publicKey?.toBase58(),
    evmConnected: evmAccount.isConnected,
    evmAddress: evmAccount.address,
  };
}
