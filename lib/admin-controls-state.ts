/**
 * CypherRoll: Live Operator Controls State & Audit Ledger
 */

export interface AdminAuditLog {
  id: string;
  action: string;
  operator: string;
  target?: string;
  details: string;
  timestamp: string;
}

// Global in-memory controls state
class AdminControlsState {
  private maintenanceMode: boolean = false;
  private crashEnginePaused: boolean = false;
  private diceEnginePaused: boolean = false;
  private minesEnginePaused: boolean = false;
  private plinkoEnginePaused: boolean = false;
  private auditLogs: AdminAuditLog[] = [
    {
      id: 'init_1',
      action: 'SYSTEM_BOOT',
      operator: 'SYSTEM',
      details: 'Operator Command Center initialized with zero-trust gate',
      timestamp: new Date().toISOString(),
    },
  ];

  public getMaintenanceMode(): boolean {
    return this.maintenanceMode;
  }

  public setMaintenanceMode(enabled: boolean, operator: string): void {
    this.maintenanceMode = enabled;
    this.logAction({
      action: enabled ? 'ENABLE_MAINTENANCE' : 'DISABLE_MAINTENANCE',
      operator,
      details: `Casino betting ${enabled ? 'FROZEN (Maintenance Active)' : 'RESUMED (Live)'}`,
    });
  }

  public getEnginePaused(game: 'CRASH' | 'DICE' | 'MINES' | 'PLINKO'): boolean {
    if (game === 'CRASH') return this.crashEnginePaused;
    if (game === 'DICE') return this.diceEnginePaused;
    if (game === 'MINES') return this.minesEnginePaused;
    return this.plinkoEnginePaused;
  }

  public setEnginePaused(game: 'CRASH' | 'DICE' | 'MINES' | 'PLINKO', paused: boolean, operator: string): void {
    if (game === 'CRASH') this.crashEnginePaused = paused;
    else if (game === 'DICE') this.diceEnginePaused = paused;
    else if (game === 'MINES') this.minesEnginePaused = paused;
    else this.plinkoEnginePaused = paused;

    this.logAction({
      action: `${game}_ENGINE_${paused ? 'PAUSED' : 'RESUMED'}`,
      operator,
      details: `${game} engine was ${paused ? 'PAUSED' : 'RESUMED'} by operator`,
    });
  }

  public logAction(entry: { action: string; operator: string; target?: string; details: string }): void {
    const newLog: AdminAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      action: entry.action,
      operator: entry.operator,
      target: entry.target,
      details: entry.details,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(newLog);
    if (this.auditLogs.length > 200) {
      this.auditLogs = this.auditLogs.slice(0, 200);
    }
  }

  public getAuditLogs(): AdminAuditLog[] {
    return this.auditLogs;
  }
}

export const adminControlsState = new AdminControlsState();
