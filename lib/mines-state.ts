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
}

const globalAny = global as any;
if (!globalAny.activeMinesGames) {
  globalAny.activeMinesGames = new Map<string, ActiveMinesGame>();
}

export const activeMinesGames: Map<string, ActiveMinesGame> = globalAny.activeMinesGames;
