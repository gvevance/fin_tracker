#!/usr/bin/env bash
# Refresh js/firebase-config.js from Firebase CLI (run from repo root in WSL).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_ID="${FIREBASE_PROJECT:-fin-tracker-98950}"
APP_ID="${FIREBASE_WEB_APP_ID:-1:312172730990:web:d3ffd473bd5a2606ab247f}"
OUT_FILE="js/firebase-config.js"

RAW=$(npx firebase-tools apps:sdkconfig WEB "$APP_ID" --project "$PROJECT_ID" --json 2>/dev/null)
CFG=$(node -e "const j=JSON.parse(process.argv[1]); console.log(JSON.stringify(j.result.sdkConfig));" "$RAW")

node -e "
const cfg = JSON.parse(process.argv[1]);
const fs = require('fs');
const out = \`export function isFirebaseConfigured(config) {
  return Boolean(config.apiKey && !String(config.apiKey).startsWith('YOUR_'));
}

export const firebaseConfig = {
  apiKey: \"\${cfg.apiKey}\",
  authDomain: \"\${cfg.authDomain}\",
  projectId: \"\${cfg.projectId}\",
  storageBucket: \"\${cfg.storageBucket}\",
  messagingSenderId: \"\${cfg.messagingSenderId}\",
  appId: \"\${cfg.appId}\",
};
\`;
fs.writeFileSync(process.argv[2], out);
console.log('Updated', process.argv[2]);
" "$CFG" "$OUT_FILE"
