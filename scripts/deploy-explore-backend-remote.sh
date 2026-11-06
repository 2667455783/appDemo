#!/bin/bash
# Run on the production host. Builds this branch and restarts appdemo-backend.
set -eu
export DEBIAN_FRONTEND=noninteractive
BRANCH="${DEPLOY_BRANCH:-cursor/explore-chat-tab-4cb6}"
REPO_URL="${DEPLOY_REPO:-https://github.com/2667455783/appDemo.git}"
SRC="/opt/appdemo-src"
JAR_DIR="/opt/appdemo-backend"
JAR="$JAR_DIR/appdemo-backend.jar"

echo "==> install git + maven if needed"
if ! command -v git >/dev/null 2>&1 || ! command -v mvn >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y -qq git maven
fi
command -v java >/dev/null 2>&1 || apt-get install -y -qq openjdk-17-jdk-headless

echo "==> fetch $BRANCH"
if [ -d "$SRC/.git" ]; then
  git -C "$SRC" fetch --depth 1 origin "$BRANCH"
  git -C "$SRC" checkout -f FETCH_HEAD
else
  rm -rf "$SRC"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$SRC"
fi

echo "==> mvn package"
mkdir -p "$JAR_DIR"
if [ -f "$JAR" ]; then cp -a "$JAR" "$JAR.bak"; fi
( cd "$SRC/backend" && mvn -q -DskipTests package )
cp -f "$SRC/backend/target/appdemo-backend-0.1.0.jar" "$JAR"

echo "==> nginx stream buffering"
SNIPPET="/etc/nginx/snippets/appdemo-api.conf"
STREAM_SNIP="/etc/nginx/snippets/appdemo-api.stream.conf"
NEED_STREAM=0
if [ -f "$SNIPPET" ] && ! grep -q 'explore/chat/stream' "$SNIPPET"; then
  NEED_STREAM=1
fi
if [ "$NEED_STREAM" = 1 ]; then
  cat > "$STREAM_SNIP" <<'NGX'
location /api/v1/me/explore/chat/stream {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Device-Id $http_x_device_id;
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_request_buffering off;
    proxy_cache off;
    gzip off;
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;
    add_header X-Accel-Buffering no always;
    add_header Cache-Control "no-cache, no-transform" always;
}
NGX
  echo 'include /etc/nginx/snippets/appdemo-api.stream.conf;' >> "$SNIPPET"
  if nginx -t; then
    systemctl reload nginx
    echo "nginx reloaded"
  else
    echo "nginx -t failed; reverting stream include"
    sed -i '/appdemo-api.stream.conf/d' "$SNIPPET"
    nginx -t && systemctl reload nginx || true
  fi
else
  echo "nginx stream location already present or snippet missing"
fi

echo "==> restart backend"
systemctl restart appdemo-backend
sleep 3
systemctl is-active appdemo-backend
curl -sS --max-time 8 http://127.0.0.1:8080/api/v1/health || true
echo

ENVF="$JAR_DIR/.env.prod"
if [ -f "$ENVF" ]; then
  for k in AI_API_KEY AI_BASE_URL AI_MODEL; do
    if grep -q "^${k}=.\\+" "$ENVF"; then echo "$k=set"; else echo "$k=MISSING"; fi
  done
else
  echo "WARN: $ENVF not found. Chat will stay unconfigured until AI_* are written there (do not paste secrets into chat)."
fi
echo "==> done"
