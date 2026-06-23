#!/usr/bin/env bash
set -e
echo "== swap =="
if ! swapon --show | grep -q file; then
  fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

export DEBIAN_FRONTEND=noninteractive
echo "== base packages =="
apt-get update -y -q
apt-get install -y -q nodejs npm curl gnupg debian-keyring debian-archive-keyring apt-transport-https

echo "== caddy =="
if ! command -v caddy >/dev/null 2>&1; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y -q
  apt-get install -y -q caddy
fi

echo "== app =="
mkdir -p /opt/laser
cp /root/relay.js /opt/laser/relay.js
cd /opt/laser
[ -f package.json ] || npm init -y >/dev/null 2>&1
npm install ws >/dev/null 2>&1

cat > /etc/systemd/system/laser-relay.service <<EOF
[Unit]
Description=Laser relay
After=network.target
[Service]
WorkingDirectory=/opt/laser
ExecStart=/usr/bin/node /opt/laser/relay.js
Restart=always
RestartSec=2
Environment=UI_USER=${UI_USER}
Environment=UI_PASSWORD=${UI_PASSWORD}
Environment=AGENT_TOKEN=${AGENT_TOKEN}
[Install]
WantedBy=multi-user.target
EOF

cat > /etc/caddy/Caddyfile <<EOF
${SSLIP_HOST} {
    reverse_proxy 127.0.0.1:3000
}
EOF

systemctl daemon-reload
systemctl enable laser-relay >/dev/null 2>&1
systemctl restart laser-relay
systemctl restart caddy
sleep 3
echo "== status =="
echo "relay: $(systemctl is-active laser-relay)"
echo "caddy: $(systemctl is-active caddy)"
echo "node:  $(node --version)"
echo "DONE"
