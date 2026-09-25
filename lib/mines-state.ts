import crypto from 'crypto';

export interface ActiveMinesGame {
  gameId: string;
  wallet: string;
  mineCount: number;
  wager: number;
  minePositions: number[];
  revealedTiles: number[];
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  isDemo: boolean;
  createdAt?: number;
}

const globalAny = global as any;
if (!globalAny.activeMinesGames) {
  globalAny.activeMinesGames = new Map<string, ActiveMinesGame>();
}

export const activeMinesGames: Map<string, ActiveMinesGame> = globalAny.activeMinesGames;

// Derived 256-bit key for AES-GCM stateless game tokens
const MINES_TOKEN_SECRET = process.env.SESSION_SECRET || 'cypherroll_mines_secure_token_secret_998877';
const MINES_KEY = crypto.createHash('sha256').update(MINES_TOKEN_SECRET).digest();

/**
 * Encrypts the active Mines game state into a tamper-proof URL-safe token.
 * This guarantees serverless lambdas on Vercel can seamlessly retrieve game state
 * even across cold starts, lambda restarts, and multi-instance scaling.
 */
export function encodeMinesToken(game: ActiveMinesGame): string {
  try {
    const payload = JSON.stringify({
      ...game,
      createdAt: game.createdAt || Date.now(),
    });

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', MINES_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(payload, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // 12-byte IV + 16-byte AuthTag + Encrypted data
    const tokenBuffer = Buffer.concat([iv, authTag, encrypted]);
    return tokenBuffer.toString('base64url');
  } catch (err) {
    console.error('Failed to encode mines token:', err);
    return '';
  }
}

/**
 * Decrypts and verifies the Mines game token.
 * Returns null if the token has been tampered with, corrupted, or expired (> 2 hours).
 */
export function decodeMinesToken(token: string): ActiveMinesGame | null {
  try {
    if (!token) return null;
    const tokenBuffer = Buffer.from(token, 'base64url');
    if (tokenBuffer.length < 28) return null; // 12 (iv) + 16 (tag) = 28 minimum

    const iv = tokenBuffer.subarray(0, 12);
    const authTag = tokenBuffer.subarray(12, 28);
    const encrypted = tokenBuffer.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', MINES_KEY, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');

    const game = JSON.parse(decrypted) as ActiveMinesGame;

    // Guard against games older than 2 hours (120 minutes)
    if (game.createdAt && Date.now() - game.createdAt > 120 * 60 * 1000) {
      return null;
    }

    return game;
  } catch (err) {
    return null;
  }
}

/**
 * Resolves an active Mines game using token first, then gameId cache, then wallet cache.
 */
export function resolveMinesGame(params: {
  gameToken?: string | null;
  gameId?: string | null;
  walletAddress?: string | null;
}): ActiveMinesGame | null {
  const { gameToken, gameId, walletAddress } = params;

  // 1. Primary: Cryptographic Stateless Token
  if (gameToken) {
    const tokenGame = decodeMinesToken(gameToken);
    if (tokenGame) {
      if (!gameId || tokenGame.gameId === gameId) {
        return tokenGame;
      }
    }
  }

  // 2. Secondary: in-memory cache by unique gameId
  if (gameId && activeMinesGames.has(gameId)) {
    return activeMinesGames.get(gameId)!;
  }

  // 3. Fallback: in-memory cache by wallet
  const walletKey = walletAddress || 'Demo_Player';
  if (activeMinesGames.has(walletKey)) {
    const cachedGame = activeMinesGames.get(walletKey)!;
    if (!gameId || cachedGame.gameId === gameId) {
      return cachedGame;
    }
  }

  return null;
}
