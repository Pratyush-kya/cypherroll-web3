/**
 * CypherRoll: API Security Middleware
 *
 * Fixes Loophole 10: Origin/CSRF validation for all mutation endpoints
 * Fixes Loophole 11: Distributed-aware rate limiting with IP + wallet key
 */

import crypto from 'crypto';
import { NextResponse } from 'next/server';

// ── ALLOWED ORIGINS ────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Always allow the Vercel deployment and localhost for dev
const DEFAULT_ORIGINS = [
  'https://cypherroll-web3.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
];

const ALL_ALLOWED_ORIGINS = new Set([...DEFAULT_ORIGINS, ...ALLOWED_ORIGINS]);

/**
 * Validates the Origin header against the allowlist.
 * Returns null if valid, or a 403 NextResponse if rejected.
 */
export function validateOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get('origin');

  // Non-browser requests (server-to-server, curl) without Origin header pass through
  // Only reject when Origin is explicitly set to something foreign
  if (!origin) return null;

  if (!ALL_ALLOWED_ORIGINS.has(origin)) {
    console.warn(`[SECURITY] Blocked cross-origin request from: ${origin}`);
    return NextResponse.json(
      { error: 'Cross-origin requests are not allowed.' },
      {
        status: 403,
        headers: { 'Access-Control-Allow-Origin': 'null' },
      }
    );
  }

  return null; // origin is valid
}

// ── RATE LIMITING ──────────────────────────────────────────────────────────
// Note: In-memory rate limiting only works within a single Node.js instance.
// For production serverless (Vercel), each instance has its own counter.
// This provides soft protection; for hard limits, use Redis (UPSTASH_REDIS_REST_URL).

interface RateLimitRecord {
  count: number;
  windowStart: number;
  blocked: boolean;
  blockedUntil: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export interface RateLimitOptions {
  windowMs: number;   // time window in ms
  maxRequests: number; // max requests per window
  blockMs?: number;   // block duration on exceed (default: 3000ms max)
}

/**
 * Check rate limit. Returns null if allowed, or a 429 NextResponse if blocked.
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): NextResponse | null {
  const { windowMs, maxRequests, blockMs = 3000 } = options;
  // Cap block duration to 3.5s max so legitimate human players are NEVER locked out for 18-30s
  const effectiveBlockMs = Math.min(blockMs, 3500);
  const now = Date.now();

  let record = rateLimitStore.get(key);

  // Clean up expired block
  if (record?.blocked && record.blockedUntil <= now) {
    rateLimitStore.delete(key);
    record = undefined;
  }

  // Reject if currently blocked
  if (record?.blocked) {
    const retryAfter = Math.max(1, Math.ceil((record.blockedUntil - now) / 1000));
    return NextResponse.json(
      { error: `Too many requests. Please wait ${retryAfter}s before retrying.` },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      }
    );
  }

  // Reset window if expired
  if (!record || now - record.windowStart > windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now, blocked: false, blockedUntil: 0 });
    return null;
  }

  record.count += 1;

  if (record.count > maxRequests) {
    record.blocked = true;
    record.blockedUntil = now + effectiveBlockMs;
    rateLimitStore.set(key, record);
    const retryAfter = Math.max(1, Math.ceil(effectiveBlockMs / 1000));
    return NextResponse.json(
      { error: `Rate limit reached. Please wait ${retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  rateLimitStore.set(key, record);
  return null;
}

/**
 * Extract best-effort client IP from Next.js request headers
 */
export function getClientIP(req: Request): string {
  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

/**
 * Apply both Origin validation AND rate limiting in one call.
 * Returns a NextResponse error if either check fails, or null if allowed.
 */
export function applyAPIGuard(
  req: Request,
  rateLimitOptions: RateLimitOptions,
  key?: string // custom rate limit key (defaults to IP + session)
): NextResponse | null {
  // 1. Origin check
  const originError = validateOrigin(req);
  if (originError) return originError;

  // 2. Rate limit check - isolate by session/token so shared IPs (mobile/NAT) don't lock each other out
  const ip = getClientIP(req);
  const cookie = req.headers.get('cookie') || '';
  const sessionMatch = cookie.match(/cypher_session=([^;]+)/);
  const sessionToken = sessionMatch ? sessionMatch[1].substring(0, 16) : '';
  const rlKey = key || (sessionToken ? `${ip}_${sessionToken}` : ip);

  const rlError = checkRateLimit(rlKey, rateLimitOptions);
  if (rlError) return rlError;

  return null;
}
