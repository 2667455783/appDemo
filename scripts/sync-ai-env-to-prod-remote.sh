#!/bin/bash
set -eu
sed -i 's/\r$//' /tmp/appdemo-ai.env
ENVF=/opt/appdemo-backend/.env.prod
mkdir -p /opt/appdemo-backend
if [ ! -f "$ENVF" ]; then
  touch "$ENVF"
fi
cp -a "$ENVF" "$ENVF.bak"
grep -v '^AI_API_KEY=' "$ENVF" | grep -v '^AI_BASE_URL=' | grep -v '^AI_MODEL=' | grep -v '^AI_TIMEOUT_SECONDS=' > /tmp/env.prod.keep || true
cat /tmp/env.prod.keep /tmp/appdemo-ai.env > "$ENVF"
rm -f /tmp/appdemo-ai.env /tmp/env.prod.keep
chmod 600 "$ENVF"
systemctl restart appdemo-backend
sleep 8
systemctl is-active appdemo-backend
curl -sS --max-time 8 http://127.0.0.1:8080/api/v1/health || true
echo
for k in AI_API_KEY AI_BASE_URL AI_MODEL; do
  if grep -q "^${k}=." "$ENVF"; then
    echo "$k=set"
  else
    echo "$k=MISSING"
  fi
done
