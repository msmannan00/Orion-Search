#!/bin/bash
set -e
set -o pipefail

PROJECT_NAME="trusted-search"
ENV_FILE=".env"
LOCAL_SSL_DIR="backend/workspace/ssl"
LOCAL_SSL_CERT="$LOCAL_SSL_DIR/localhost-cert.pem"
LOCAL_SSL_KEY="$LOCAL_SSL_DIR/localhost-key.pem"
MAINTENANCE_FLAG="backend/static/.maintenance"
NG_SERVE_URL="http://127.0.0.1:4200/"
NG_SERVE_PID_FILE="/tmp/orion-ng-serve.pid"
NG_SERVE_PATTERNS=(
    '(^|[[:space:]/])ng([[:space:]].*)? serve([[:space:]]|$)'
    'node .*@angular/cli/bin/ng serve'
    'npm run serve -- --host 127.0.0.1 --port 4200'
)
PRODUCTION_SERVICES=(web documentation arangodb elasticsearch redis_server mongo)

compose() {
    docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" "$@"
}

set_env_var() {
    sed -i "/^$1=/d" "$ENV_FILE" 2>/dev/null || true
    echo "$1=$2" >> "$ENV_FILE"
}

is_nginx_running() {
    docker inspect -f '{{.State.Running}}' trusted-web-nginx 2>/dev/null | grep -qx true
}

stop_docker() {
    docker stop trusted-web-nginx 2>/dev/null || true
    docker rm trusted-web-nginx 2>/dev/null || true
    docker compose -p "$PROJECT_NAME" down --remove-orphans
}

stop_production_services_preserving_nginx() {
    docker compose -p "$PROJECT_NAME" -f docker-compose-production.yml stop "${PRODUCTION_SERVICES[@]}"
    docker compose -p "$PROJECT_NAME" -f docker-compose-production.yml rm -f "${PRODUCTION_SERVICES[@]}"
}

stop_ng_serve() {
    local pattern

    if [ -f "$NG_SERVE_PID_FILE" ]; then
        kill -9 "$(cat "$NG_SERVE_PID_FILE")" 2>/dev/null || true
        rm -f "$NG_SERVE_PID_FILE"
    fi
    for pattern in "${NG_SERVE_PATTERNS[@]}"; do
        pkill -9 -f "$pattern" 2>/dev/null || true
    done

    while curl -fsS -o /dev/null "$NG_SERVE_URL" >/dev/null 2>&1; do
        sleep 1
    done
}

ng_serve_is_running() {
    local pattern

    for pattern in "${NG_SERVE_PATTERNS[@]}"; do
        if pgrep -f "$pattern" >/dev/null; then
            return 0
        fi
    done
    return 1
}

pull_image_if_missing() {
    local image="$1"

    if docker image inspect "$image" >/dev/null 2>&1; then
        echo "Using local Docker image: $image"
        return 0
    fi

    docker pull "$image"
}

ensure_local_ssl_cert() {
    mkdir -p "$LOCAL_SSL_DIR"
    if [ -f "$LOCAL_SSL_CERT" ] && [ -f "$LOCAL_SSL_KEY" ]; then
        return 0
    fi

    openssl req -x509 -newkey rsa:2048 -nodes \
        -keyout "$LOCAL_SSL_KEY" \
        -out "$LOCAL_SSL_CERT" \
        -days 365 \
        -subj "/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1"
}

client_build() {
    cd client || exit
    rm -rf build-next
    if [ "$1" = "-t" ]; then
        npx ng build --configuration instrumented --output-path build-next
        node instrument-build.js build-next/browser
    else
        npx ng build --configuration production --output-path build-next
    fi
    test -d build-next/browser
    mkdir -p build
    find build-next -maxdepth 1 -type f -exec mv -f {} build-next/browser/ \;
    rsync -a --delete build-next/browser/ build/
    rm -rf build-next
    cd ..
    local backups_holding
    backups_holding=""
    if [ -d backend/build/backups ]; then
        backups_holding="$(mktemp -d)/backups"
        mv backend/build/backups "$backups_holding"
    fi
    rm -rf backend/build
    mkdir -p backend/build
    cp -r client/build/* backend/build/
    if [ -n "$backups_holding" ]; then
        rm -rf backend/build/backups
        mv "$backups_holding" backend/build/backups
        rmdir "$(dirname "$backups_holding")" 2>/dev/null || true
    fi
    mkdir -p backend/build/backups
    if [ "$(stat -c %u backend/build/backups)" != "${APP_UID:-1000}" ]; then
        sudo chown -R "${APP_UID:-1000}:${APP_GID:-1000}" backend/build/backups
    fi
    rm -rf backend/workspace/build
    mkdir -p backend/workspace/build
    cp -r client/build/* backend/workspace/build/
}

install_client_dependencies() {
    local build_flag="$1"

    cd client || exit
    if [ ! -f package-lock.json ] && [ ! -f npm-shrinkwrap.json ]; then
        echo "Missing client lockfile; refusing unpinned dependency install"
        exit 1
    fi
    if { [ "$build_flag" = "-d" ] || [ "$build_flag" = "-t" ] || [ "$build_flag" = "-tb" ]; } \
        && ng_serve_is_running; then
        echo "Angular dev server is running; preserving node_modules and skipping npm ci"
    else
        npm ci
    fi
    npm run lint
    cd ..
}

use_compose_file() {
    case "$1" in
        -t|-tb)     COMPOSE_FILE="docker-compose-testing.yml" ;;
        production) COMPOSE_FILE="docker-compose-production.yml" ;;
        *)          COMPOSE_FILE="docker-compose.yml" ;;
    esac
}

report_unhealthy_web_main() {
    echo "Last healthcheck output for trusted-web-main:" >&2
    docker inspect -f '{{range .State.Health.Log}}{{.Start}} exit={{.ExitCode}} {{.Output}}
{{end}}' trusted-web-main 2>/dev/null | tail -n 3 >&2 || true
    docker logs --tail 50 trusted-web-main >&2 || true
}

wait_for_application_services() {
    local health
    local now
    local timeout_seconds="${APPLICATION_READY_TIMEOUT:-600}"
    local unhealthy_grace_seconds="${APPLICATION_UNHEALTHY_GRACE:-90}"
    local deadline=$(( $(date +%s) + timeout_seconds ))
    local unhealthy_since=0

    echo "Waiting for application services to become ready..."
    until health="$(docker inspect -f '{{.State.Health.Status}}' trusted-web-main 2>/dev/null)" \
        && [ "$health" = "healthy" ]; do
        now="$(date +%s)"
        if [ "$health" = "unhealthy" ]; then
            if [ "$unhealthy_since" -eq 0 ]; then
                unhealthy_since="$now"
                echo "trusted-web-main reports unhealthy; allowing ${unhealthy_grace_seconds}s for it to recover..."
            elif [ $(( now - unhealthy_since )) -ge "$unhealthy_grace_seconds" ]; then
                echo "ERROR: trusted-web-main stayed unhealthy for ${unhealthy_grace_seconds}s." >&2
                report_unhealthy_web_main
                return 1
            fi
        else
            unhealthy_since=0
        fi
        if [ "$now" -ge "$deadline" ]; then
            echo "ERROR: trusted-web-main did not become healthy within ${timeout_seconds}s (last status: ${health:-unknown})" >&2
            report_unhealthy_web_main
            return 1
        fi
        sleep 2
    done
}

enable_maintenance_mode() {
    touch "$MAINTENANCE_FLAG"
}

disable_maintenance_mode() {
    rm -f "$MAINTENANCE_FLAG"
}

wait_for_test_service() {
    local url="https://127.0.0.1:8443/api/test/ready"
    local timeout_seconds="${TEST_SERVICE_READY_TIMEOUT:-300}"
    local deadline
    local http_status
    local container_health

    case "$timeout_seconds" in
        ''|*[!0-9]*)
            echo "TEST_SERVICE_READY_TIMEOUT must be a non-negative integer, got: $timeout_seconds" >&2
            return 2
            ;;
    esac

    deadline=$((SECONDS + timeout_seconds))
    echo "Waiting for test service to become ready..."

    while true; do
        http_status="$(curl -ksS -o /dev/null -w '%{http_code}' --max-time 5 "$url" 2>/dev/null || true)"
        if [ "$http_status" = "200" ]; then
            echo "Test service is ready."
            return 0
        fi

        container_health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' trusted-web-main 2>/dev/null || true)"
        if [ "$container_health" = "unhealthy" ] || [ "$container_health" = "exited" ] || [ "$container_health" = "dead" ]; then
            echo "Test service failed before becoming ready (container: ${container_health}, HTTP: ${http_status:-unreachable})." >&2
            docker logs --tail 100 trusted-web-main >&2 || true
            return 1
        fi

        if [ "$SECONDS" -ge "$deadline" ]; then
            echo "Timed out after ${timeout_seconds}s waiting for $url (container: ${container_health:-unknown}, HTTP: ${http_status:-unreachable})." >&2
            compose ps >&2 || true
            docker logs --tail 100 trusted-web-main >&2 || true
            return 1
        fi

        sleep 2
    done
}

run_backend_tests_protected() {
    if [ "${SKIP_BACKEND_TESTS:-0}" = "1" ]; then
        echo "Skipping backend tests because SKIP_BACKEND_TESTS=1"
        return 0
    fi

    local pytest_cmd='cd /app && python -m pytest -q tests --maxfail=1 --disable-warnings'
    local runner=()

    if command -v timeout >/dev/null 2>&1; then
        runner=(timeout "${BACKEND_TEST_TIMEOUT:-1800}")
    fi

    echo "Running backend tests in isolated protected test container..."
    "${runner[@]}" docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" run --rm --no-deps -T \
        -e TESTING_ENABLED=1 -e PYTHONPATH=/app web sh -lc "$pytest_cmd"
}

restart_ng_serve() {
    stop_ng_serve

    (
        cd client || exit
        nohup npm run serve -- --host 127.0.0.1 --port 4200 >/tmp/orion-ng-serve.log 2>&1 &
        echo $! > "$NG_SERVE_PID_FILE"
    )

    until curl -fsS -o /dev/null "$NG_SERVE_URL" >/dev/null 2>&1; do
        sleep 2
    done
}

set_testing_enabled() {
    if [ "$1" = "-t" ] || [ "$1" = "-tb" ]; then
        set_env_var TESTING_ENABLED '"1"'
    else
        set_env_var TESTING_ENABLED '"0"'
    fi
}
set_swarm_url_to_local_ip() {
    local local_ip

    if [[ "$(uname)" == "Darwin" ]]; then
        local_ip="$(ipconfig getifaddr en0 || ipconfig getifaddr en1)"
    else
        local_ip="$(hostname -I | awk '{print $1}')"
    fi
    
    if [[ -z "$local_ip" ]]; then
        local_ip="$(ifconfig | awk '/inet / && $2 != "127.0.0.1" {print $2; exit}')"
    fi

    set_env_var SWARM_URL "http://$local_ip:5132"
}

if [ "$1" = "-ip" ]; then
    set_swarm_url_to_local_ip
    shift
fi

if [ "$1" = "stop" ]; then
    stop_ng_serve
    stop_docker
    echo "Orion Intelligence service stopped"
    exit 0
fi

if [ "$1" = "restore" ]; then
    BACKUP_NAME="$2"
    if [ -z "$BACKUP_NAME" ]; then
        echo "Usage: $0 restore <backup_name>"
        exit 1
    fi
    if ! docker inspect -f '{{.State.Running}}' trusted-web-main 2>/dev/null | grep -qx true; then
        echo "trusted-web-main is not running. Start the stack first."
        exit 1
    fi
    docker exec trusted-web-main python3 restore_backup.py "$BACKUP_NAME"
    exit $?
fi

if [ "$1" = "-doc" ] || [ "$1" = "-docs" ]; then
    docker compose -p "$PROJECT_NAME" -f docker-compose-testing.yml down -v --remove-orphans
    "$0" build -t
    restart_ng_serve
    if [ "$1" = "-doc" ]; then
        bash docs/scripts/generate_docs.sh --clear
    else
        bash docs/scripts/generate_docs.sh
    fi
    exit 0
fi

COMMAND=$1
FLAG=$2
EXTRA_FLAG=$3

if [ "$COMMAND" = "production" ]; then
    enable_maintenance_mode
    trap disable_maintenance_mode EXIT
    if is_nginx_running; then
        stop_production_services_preserving_nginx
    else
        stop_docker
    fi
elif [ "$COMMAND" != "build" ] \
    || { [ "$FLAG" != "-d" ] && [ "$FLAG" != "-t" ] && [ "$FLAG" != "-tb" ] && [ "$FLAG" != "-p" ]; }; then
    stop_docker
fi

set_testing_enabled "$FLAG"

if [ "$COMMAND" = "build" ]; then
    if [ "$FLAG" = "-p" ]; then
        enable_maintenance_mode
        trap disable_maintenance_mode EXIT
    elif [ "$FLAG" = "-d" ] || [ "$FLAG" = "-t" ] || [ "$FLAG" = "-tb" ]; then
        if [ "$FLAG" = "-d" ]; then
            cp nginx/nginx-dev.conf nginx/nginx.conf
        else
            cp nginx/nginx-testing.conf nginx/nginx.conf
        fi
        if is_nginx_running; then
            docker exec trusted-web-nginx nginx -t
            docker exec trusted-web-nginx nginx -s reload
        fi
        if [ "$FLAG" != "-d" ]; then
            enable_maintenance_mode
            trap disable_maintenance_mode EXIT
        fi
    fi

    pull_image_if_missing python:3.11-slim
    install_client_dependencies "$FLAG"

    case "$FLAG" in
        -t|-tb)
            ensure_local_ssl_cert
            client_build "-t"
            use_compose_file "$FLAG"
            ;;
        -c)
            ensure_local_ssl_cert
            client_build "$FLAG"
            cp nginx/nginx-dev.conf nginx/nginx.conf
            use_compose_file "default"
            ;;
        -b)
            set_swarm_url_to_local_ip
            ensure_local_ssl_cert
            cp nginx/nginx-dev.conf nginx/nginx.conf
            use_compose_file "default"
            ;;
        -d)
            set_swarm_url_to_local_ip
            ensure_local_ssl_cert
            client_build "$FLAG"
            use_compose_file "default"
            ;;
        -p)
            client_build "$FLAG"
            use_compose_file "production"
            cp nginx/nginx-prod.conf nginx/nginx.conf
            sudo mkdir -p /srv/elasticsearch/data
            sudo chown -R 1000:1000 /srv/elasticsearch/data
            export ELASTIC_ROOT_IP="elasticsearch"
            ;;
        *)
            echo "Unknown build flag: $FLAG"
            exit 1
            ;;
    esac

    if [ "$COMPOSE_FILE" = "docker-compose.yml" ]; then
        compose build web documentation
    else
        compose build
    fi

elif [ "$COMMAND" = "production" ]; then
    use_compose_file "production"
else
    use_compose_file "default"
fi

mkdir -p backend/workspace/parser/parser_files
chmod -R a+rwX backend/workspace/parser/parser_files 2>/dev/null || true

mkdir -p backend/workspace/logs
chmod a+rwX backend/workspace/logs 2>/dev/null || true

docker network create --driver bridge shared_bridge 2>/dev/null || true
docker network create --driver bridge orion_nexus_backend 2>/dev/null || true
compose_up_services=()

if [ "$COMPOSE_FILE" = "docker-compose.yml" ]; then
    compose_up_services=(web nginx)
elif [ "$COMPOSE_FILE" = "docker-compose-production.yml" ] && is_nginx_running; then
    compose_up_services=("${PRODUCTION_SERVICES[@]}")
fi

if [ "$COMMAND" = "build" ] && [ "$FLAG" = "-p" ]; then
    if [ ! -f client/build/assets/data/map/world.json ]; then
        echo "Missing client/build/assets/data/map/world.json"
        exit 1
    fi
fi

compose pull --include-deps --ignore-buildable --policy missing "${compose_up_services[@]}"

up_extra_args=()
if [ "$COMMAND" = "build" ] && [ "$FLAG" = "-p" ] && [ "$EXTRA_FLAG" = "-full" ]; then
    up_extra_args=(--force-recreate)
fi

compose up -d --pull missing "${up_extra_args[@]}" "${compose_up_services[@]}"

if [ "$COMMAND" = "build" ] && [ "$FLAG" = "-p" ]; then
    compose exec -T nginx nginx -t
    compose exec -T nginx nginx -s reload
    wait_for_application_services
    sudo systemctl restart tor@default
    disable_maintenance_mode
    trap - EXIT
fi

case "$COMMAND:$FLAG" in
    build:-t|build:-tb)
        wait_for_test_service
        disable_maintenance_mode
        trap - EXIT
        if [ "$FLAG" = "-tb" ]; then
            run_backend_tests_protected
        fi
        ;;
    build:-d)
        wait_for_application_services
        disable_maintenance_mode
        trap - EXIT
        ;;
    build:-p)
        ;;
    production:*)
        wait_for_application_services
        disable_maintenance_mode
        trap - EXIT
        ;;
    *)
        wait_for_application_services
        ;;
esac
