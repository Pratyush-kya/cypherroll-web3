import { privateKeyToAccount } from 'viem/accounts';
import { parseUnits, verifyTypedData } from 'viem';

// Fallback operator key for local sandbox if env key not set
const DEFAULT_DEV_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const OPERATOR_PRIVATE_KEY = (process.env.OPERATOR_SIGNER_PRIVATE_KEY || DEFAULT_DEV_KEY) as `0x${string}`;

export const operatorAccount = privateKeyToAccount(OPERATOR_PRIVATE_KEY);

export const NETWORK_CONFIG = {
  BASE: {
    chainId: 8453,
    name: 'Base',
    vaultAddress: (process.env.NEXT_PUBLIC_BASE_VAULT_ADDRESS || '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7') as `0x${string}`,
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  },
  ARB: {
    chainId: 42161,
    name: 'Arbitrum One',
    vaultAddress: (process.env.NEXT_PUBLIC_ARB_VAULT_ADDRESS || '0x415b3060d4bA0A7f1740924970425a1B60a0f027') as `0x${string}`,
    usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as `0x${string}`,
  },
  SOL: {
    name: 'Solana',
    vaultAddress: 'CyphErRoLL111111111111111111111111111111111',
  },
};

export const WITHDRAWAL_LIMITS = {
  MIN_AMOUNT_USDC: 10.0,
  AUTO_INSTANT_LIMIT_USDC: 2500.0,
  MAX_SINGLE_WITHDRAWAL_USDC: 25000.0, // Kelly Criterion hot-vault safety ceiling
};

/**
 * Generates an EIP-712 Cryptographic Signature matching CypherRollVault.sol
 */
export async function signEIP712Withdrawal(params: {
  player: `0x${string}`;
  token: `0x${string}`;
  amountUsdc: number;
  nonce: number;
  network: 'BASE' | 'ARB';
}): Promise<{
  signature: `0x${string}`;
  deadline: bigint;
  amountWei: bigint;
  nonce: bigint;
  domain: any;
  types: any;
  message: any;
  operatorSigner: string;
}> {
  const config = NETWORK_CONFIG[params.network];
  if (!config) throw new Error(`Unsupported EVM network: ${params.network}`);

  // USDC has 6 decimals on Base & Arbitrum
  const amountWei = parseUnits(params.amountUsdc.toFixed(6), 6);
  const nonce = BigInt(params.nonce);
  // Valid for 60 minutes from authorization
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

  const domain = {
    name: 'CypherRollVault',
    version: '1',
    chainId: BigInt(config.chainId),
    verifyingContract: config.vaultAddress,
  };

  const types = {
    Withdrawal: [
      { name: 'player', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  } as const;

  const message = {
    player: params.player,
    token: params.token,
    amount: amountWei,
    nonce,
    deadline,
  };

  const signature = await operatorAccount.signTypedData({
    domain,
    types,
    primaryType: 'Withdrawal',
    message,
  });

  return {
    signature,
    deadline,
    amountWei,
    nonce,
    domain,
    types,
    message,
    operatorSigner: operatorAccount.address,
  };
}
