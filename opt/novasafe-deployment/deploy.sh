#!/bin/bash

set -e

BASE_DIR="/opt/novasafe"

LANDING_DIR="$BASE_DIR/marketing/landing"
AUTH_DIR="$BASE_DIR/platform/auth"
APP_DIR="$BASE_DIR/platform/app"
BACKEND_DIR="$BASE_DIR/platform/backend"
NGINX_DIR="$BASE_DIR/infra/nginx"

SERVICE=$1

echo "======================================="
echo "NovaSafe Deployment Tool"
echo "======================================="
echo "Service: $SERVICE"
echo ""

detect_compose() {
    if docker compose version >/dev/null 2>&1; then
        DC="docker compose"
    else
        DC="docker-compose"
    fi
}

deploy_service() {

    DIR=$1
    NAME=$2

    echo ""
    echo "🚀 Deploying $NAME"
    echo "Directory: $DIR"

    if [ ! -d "$DIR" ]; then
        echo "❌ Directory not found: $DIR"
        exit 1
    fi

    cd $DIR

    detect_compose

    echo "📦 Pulling latest image"
    $DC pull

    echo "🔄 Restarting container"
    $DC up -d --remove-orphans

    echo "📊 Status"
    docker ps | grep $NAME || true

    echo "📜 Logs"
    docker logs --tail 30 $NAME || true

    echo "✅ $NAME deployed"
}

case $SERVICE in

landing)
    deploy_service "$LANDING_DIR" "novasafe-landing"
    ;;

auth)
    deploy_service "$AUTH_DIR" "novasafe-auth"
    ;;

app)
    deploy_service "$APP_DIR" "novasafe-app"
    ;;

backend)
    deploy_service "$BACKEND_DIR" "novasafe-backend"
    ;;

nginx)
    deploy_service "$NGINX_DIR" "novasafe-nginx"
    ;;

all)

    echo "🚀 Deploying ALL services"

    deploy_service "$LANDING_DIR" "novasafe-landing"
    deploy_service "$AUTH_DIR" "novasafe-auth"
    deploy_service "$BACKEND_DIR" "novasafe-backend"
    deploy_service "$APP_DIR" "novasafe-app"

    echo ""
    echo "✅ All services deployed"
    ;;

status)

    echo "📊 Container Status"
    docker ps

    ;;

logs)

    TARGET=$2

    if [ -z "$TARGET" ]; then
        echo "Usage: ./deploy.sh logs [container]"
        exit 1
    fi

    docker logs -f $TARGET
    ;;

restart)

    TARGET=$2

    if [ -z "$TARGET" ]; then
        echo "Usage: ./deploy.sh restart [container]"
        exit 1
    fi

    docker restart $TARGET
    ;;

cleanup)

    echo "🧹 Cleaning unused docker images"
    docker image prune -f
    docker container prune -f
    ;;

*)

    echo "Usage:"
    echo ""
    echo "./deploy.sh landing"
    echo "./deploy.sh auth"
    echo "./deploy.sh app"
    echo "./deploy.sh backend"
    echo "./deploy.sh nginx"
    echo "./deploy.sh all"
    echo ""
    echo "./deploy.sh status"
    echo "./deploy.sh logs <container>"
    echo "./deploy.sh restart <container>"
    echo "./deploy.sh cleanup"
    echo ""
    exit 1

    ;;

esac

echo ""
echo "======================================="
echo "Deployment Finished"
echo "======================================="