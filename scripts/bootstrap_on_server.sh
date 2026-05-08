#!/usr/bin/env bash
# 首次在腾讯云服务器上部署 yiiicloude-panel（手动跑一次；之后 CI 接管）
#
# 用法：
#   1. SSH 上腾讯云：ssh ubuntu@110.40.138.75
#   2. git clone 后跑：bash scripts/bootstrap_on_server.sh
#
# 假设：
#   - ubuntu 用户在 docker 组（docker / docker compose 已装）
#   - yiiicloude-public network 已存在（yiiicloude-api stack 创建的）
#   - 公网/私网能连 GitHub / docker hub
#
# 不做：装 docker；写 .env（密文，下面交互填）

set -euo pipefail

REPO_URL="${1:-https://github.com/HeiBangLaoDa/yiiicloude-panel.git}"
PROJECT_DIR=/opt/yiiicloude-panel
ENV_DIR=/etc/yiiicloude-panel
ENV_FILE=$ENV_DIR/.env

cyan()  { echo -e "\033[1;36m==> $*\033[0m"; }
green() { echo -e "\033[1;32m✅ $*\033[0m"; }
red()   { echo -e "\033[1;31m❌ $*\033[0m" >&2; }

cyan "[0/5] 前置检查"
command -v docker >/dev/null || { red "未装 docker"; exit 1; }
command -v git >/dev/null || sudo apt-get update && sudo apt-get install -y git
docker network ls --format '{{.Name}}' | grep -q '^yiiicloude-public$' || {
    red "yiiicloude-public network 不存在。先跑 yiiicloude-api stack（它会创建这个 network）"
    exit 1
}
green "前置 OK"

cyan "[1/5] 创建目录"
sudo mkdir -p "$PROJECT_DIR" "$ENV_DIR"
sudo chown "$(whoami):$(whoami)" "$PROJECT_DIR"
sudo chmod 700 "$ENV_DIR"
green "目录就绪：$PROJECT_DIR / $ENV_DIR"

cyan "[2/5] 克隆仓库"
if [[ -d "$PROJECT_DIR/.git" ]]; then
    cd "$PROJECT_DIR" && git pull --ff-only
else
    git clone "$REPO_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi
green "代码就位：$(git rev-parse --short HEAD)"

cyan "[3/5] 写 .env（仅当 $ENV_FILE 不存在）"
if [[ ! -f "$ENV_FILE" ]]; then
    sudo cp "$PROJECT_DIR/docker/.env.prod.example" "$ENV_FILE"
    sudo chmod 600 "$ENV_FILE"
    green "已从 docker/.env.prod.example 复制为 $ENV_FILE"
    echo ""
    echo "👉 现在填实际值（关键：POSTGRES_PASSWORD / PAYLOAD_SECRET / SECRET_FERNET_KEY / ADMIN_SECRET）："
    echo "   sudo nano $ENV_FILE"
    echo ""
    echo "   生成命令："
    echo "   POSTGRES_PASSWORD: openssl rand -hex 24"
    echo "   PAYLOAD_SECRET:    openssl rand -hex 32"
    echo "   SECRET_FERNET_KEY: 必须与 control-plane 同（已存在则抄；新生成: python3 -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'）"
    echo "   ADMIN_SECRET:      与 control-plane ADMIN_SECRET 同值"
    echo ""
    read -p "填完 .env 后回车继续... "
else
    green ".env 已存在，跳过"
fi

cyan "[4/5] 起 panel-pg + build panel-app"
docker compose -f docker/docker-compose.prod.yml --env-file "$ENV_FILE" up -d panel-pg
echo "等 panel-pg 健康..."
for i in {1..20}; do
    if docker compose -f docker/docker-compose.prod.yml ps panel-pg | grep -q "healthy"; then
        green "panel-pg healthy"
        break
    fi
    sleep 3
done

docker compose -f docker/docker-compose.prod.yml --env-file "$ENV_FILE" build panel-app
docker compose -f docker/docker-compose.prod.yml --env-file "$ENV_FILE" up -d panel-app

cyan "[5/5] 等 panel-app /api/access"
for i in {1..40}; do
    if curl -fs http://127.0.0.1:3010/api/access >/dev/null 2>&1; then
        green "panel-app /api/access 200，bootstrap 完成"
        echo ""
        echo "👉 下一步：跑 seed 重置 service-account API key + 创建 demo 数据"
        echo "   docker compose -f docker/docker-compose.prod.yml --env-file $ENV_FILE exec panel-app sh -c 'cd /app && pnpm tsx scripts/seed_customer_demo.ts' 2>&1 | tee /tmp/panel-seed.log"
        echo "   （注意 standalone runner 不带 pnpm/tsx —— 实际跑法是从本地 pnpm tsx 直连 panel-pg：见 progress 文档）"
        echo ""
        echo "之后改代码：本机 git push origin main → GitHub Actions 自动部署"
        exit 0
    fi
    sleep 3
done

red "/api/access 120s 内没响应"
docker compose -f docker/docker-compose.prod.yml --env-file "$ENV_FILE" logs --tail 80 panel-app
exit 1
