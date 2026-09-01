#!/usr/bin/env bash
# 在服务器 134.175.54.151 上执行一次，创建 englishStudy 静态目录并配置 CORS
# 用法：ssh root@134.175.54.151 'bash -s' < scripts/server-setup-englishStudy.sh
set -euo pipefail

# 本机站点 root 为 /var/www/vue-admin（见 nginx sites-enabled/vue-admin）
DIR="/var/www/vue-admin/englishStudy"
mkdir -p "$DIR"
chown -R www-data:www-data "$DIR" 2>/dev/null || chown -R nginx:nginx "$DIR" 2>/dev/null || true
chmod -R 755 "$DIR"

# 占位 update.json（随后会被发版脚本覆盖）
if [ ! -f "$DIR/update.json" ]; then
  cat > "$DIR/update.json" <<'EOF'
{
  "version": "1.0.0",
  "versionCode": 1,
  "apkUrl": "http://134.175.54.151/englishStudy/app-1.0.0.apk",
  "notes": "目录已就绪，等待首次发版上传",
  "publishedAt": "2026-09-01",
  "force": false
}
EOF
fi

# Nginx 站点片段：若使用 Nginx，写入 conf.d（存在才写）
NGX=""
for c in /etc/nginx/conf.d/englishStudy.conf /www/server/panel/vhost/nginx/englishStudy.conf; do
  NGX_DIR=$(dirname "$c")
  if [ -d "$NGX_DIR" ]; then
    NGX="$c"
    break
  fi
done

if [ -n "$NGX" ]; then
  cat > "$NGX" <<'EOF'
# englishStudy APK / update.json
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root /var/www/html;

    location /englishStudy/ {
        alias /var/www/html/englishStudy/;
        autoindex off;
        types {
            application/json json;
            application/vnd.android.package-archive apk;
        }
        # 允许 App / 浏览器跨域拉清单
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, OPTIONS" always;
        add_header Access-Control-Allow-Headers "*" always;
        if ($request_method = OPTIONS) { return 204; }
    }
}
EOF
  nginx -t && (systemctl reload nginx || service nginx reload) || true
  echo "已写入 Nginx 配置: $NGX"
else
  echo "未检测到 Nginx conf 目录。若用宝塔/Apache，请把站点根目录指到 /var/www/html，并保证可访问："
  echo "  http://134.175.54.151/englishStudy/update.json"
  echo "且对 JSON 响应加上 CORS: Access-Control-Allow-Origin: *"
fi

echo "完成。目录: $DIR"
echo "请在本机执行: npm run release:apk"
