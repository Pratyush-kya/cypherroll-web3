#!/usr/bin/env bash
set -e

echo "========================================================="
echo "   CYPHERROLL: PRODUCTION WEB3 & TOR ONION DEPLOYER     "
echo "========================================================="

# 1. Environment Check
if [ ! -f .env.local ]; then
  echo "Error: .env.local configuration file missing!"
  exit 1
fi

echo "[1/4] Validating cryptographic invariants and build..."
npm run test:pf

echo "[2/4] Building production containers with Docker Compose..."
docker compose build

echo "[3/4] Launching Next.js, Nginx Zero-Log Proxy, and Tor v3 Daemon..."
docker compose up -d

echo "[4/4] Retrieving Tor Onion Service v3 hostname..."
sleep 5

ONION_HOST=$(docker compose exec -T tor cat /var/lib/tor/cypherroll_onion/hostname 2>/dev/null || echo "Pending initialization... (Run: docker compose exec tor cat /var/lib/tor/cypherroll_onion/hostname)")

echo "========================================================="
echo "✓ CYPHERROLL CLUSTER DEPLOYED SUCCESSFULLY!"
echo "---------------------------------------------------------"
echo "Tor Onion Address: http://${ONION_HOST}"
echo "Local HTTP Proxy:  http://localhost:8080"
echo "---------------------------------------------------------"
echo "Security Audit Guardrails Active:"
echo " • Zero IP Logging: Nginx access_log disabled (/dev/null)"
echo " • WebRTC Leak Protection: PeerConnection CSP restrictions enforced"
echo " • EIP-712 Signer: Operator non-custodial authorization enabled"
echo " • Provably Fair Engine: HMAC-SHA256 commit-reveal operational"
echo "========================================================="
