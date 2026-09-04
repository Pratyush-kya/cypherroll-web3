'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAccount, useSignMessage } from 'wagmi';
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

  // Sign Out
  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    if (solanaWallet.connected) solanaWallet.disconnect();
    setUser(null);
    setIsAuthenticated(false);
  };

  return {
    user,
    setUser,
    isAuthenticated,
    isAuthenticating,
    authError,
    signInSolana,
    signInEVM,
    signOut,
    checkSession,
    solanaConnected: solanaWallet.connected,
    solanaPublicKey: solanaWallet.publicKey?.toBase58(),
    evmConnected: evmAccount.isConnected,
    evmAddress: evmAccount.address,
  };
}
