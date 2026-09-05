#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_PATH="$(readlink -f "${BASH_SOURCE[0]}")"
readonly APP_DIR="$(dirname "$SCRIPT_PATH")"
readonly LIVE_CONTAINER="hearth"
readonly TEST_CONTAINER="hearth-test"
readonly LIVE_PORT="3080"
readonly TEST_PORT="3089"

log() {
    printf '%s\n' "$*"
}

fail() {
    printf 'Error: %s\n' "$*" >&2
    exit 1
}

cleanup_test_container() {
    docker rm -f "$TEST_CONTAINER" >/dev/null 2>&1 || true
}

health_check() {
    local container_name="$1"
    local url="$2"
    local http_status=""
    local attempt

    docker exec "$container_name" nginx -t || return 1

    for attempt in {1..15}; do
        http_status="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "$url" || true)"
        if [[ "$http_status" == "200" ]]; then
            log "Health check passed for $container_name"
            return 0
        fi
        sleep 1
    done

    log "Health check failed for $container_name. Last HTTP status: ${http_status:-none}"
    return 1
}

pwa_check() {
    local base_url="$1"
    local service_worker_headers
    local app_html
    local worker_script
    local recovery_html
    local app_bundle
    local worker_bundle

    service_worker_headers="$(curl -fsSI --max-time 10 "$base_url/sw.js")" || return 1
    grep -qi '^Cache-Control:.*no-store' <<<"$service_worker_headers" || return 1
    grep -qi '^Service-Worker-Allowed: /' <<<"$service_worker_headers" || return 1

    app_html="$(curl -fsS --max-time 10 "$base_url/")" || return 1
    worker_script="$(curl -fsS --max-time 10 "$base_url/sw.js")" || return 1
    recovery_html="$(curl -fsS --max-time 10 "$base_url/api/pwa-update.html")" || return 1

    app_bundle="$(grep -m 1 -oE 'assets/index-[A-Za-z0-9_-]+\.js' <<<"$app_html")" || return 1
    worker_bundle="$(grep -m 1 -oE 'assets/index-[A-Za-z0-9_-]+\.js' <<<"$worker_script")" || return 1

    [[ -n "$app_bundle" && "$app_bundle" == "$worker_bundle" ]] || return 1
    grep -q '<title>Updating Hearth</title>' <<<"$recovery_html" || return 1

    log "PWA checks passed. Bundle: $app_bundle"
}

cd "$APP_DIR"

command -v git >/dev/null || fail "git is required"
command -v docker >/dev/null || fail "docker is required"
command -v curl >/dev/null || fail "curl is required"

[[ "$(git branch --show-current)" == "main" ]] || fail "Run this script from the main branch"
git diff --quiet || fail "Tracked files contain uncommitted changes"
git diff --cached --quiet || fail "The Git index contains uncommitted changes"

if [[ "${HEARTH_UPDATE_SYNCED:-0}" != "1" ]]; then
    log "Updating the local main branch"
    git pull --ff-only origin main
    exec env HEARTH_UPDATE_SYNCED=1 bash "$SCRIPT_PATH"
fi

readonly COMMIT="$(git rev-parse --short=7 HEAD)"
readonly IMAGE="hearth:$COMMIT"
readonly BACKUP_CONTAINER="hearth-backup-$(date +%Y%m%d-%H%M%S)"

if docker container inspect "$LIVE_CONTAINER" >/dev/null 2>&1; then
    current_image="$(docker inspect "$LIVE_CONTAINER" --format '{{.Config.Image}}')"
    if [[ "$current_image" == "$IMAGE" ]] && health_check "$LIVE_CONTAINER" "http://127.0.0.1:$LIVE_PORT/"; then
        log "Hearth $COMMIT is already deployed and healthy"
        exit 0
    fi
fi

trap cleanup_test_container EXIT
cleanup_test_container

log "Building $IMAGE"
docker build -t "$IMAGE" .

log "Starting test container"
docker run -d \
    --name "$TEST_CONTAINER" \
    -p "127.0.0.1:$TEST_PORT:80" \
    "$IMAGE" >/dev/null

health_check "$TEST_CONTAINER" "http://127.0.0.1:$TEST_PORT/" || fail "Test deployment failed"
pwa_check "http://127.0.0.1:$TEST_PORT" || fail "Test PWA checks failed"
cleanup_test_container

docker container inspect "$LIVE_CONTAINER" >/dev/null 2>&1 || fail "Live Hearth container was not found"

log "Stopping the current Hearth container"
docker stop "$LIVE_CONTAINER" >/dev/null
if ! docker rename "$LIVE_CONTAINER" "$BACKUP_CONTAINER"; then
    docker start "$LIVE_CONTAINER" >/dev/null
    fail "The live container could not be renamed. The previous release was restarted"
fi

rollback() {
    log "Deployment failed. Restoring $BACKUP_CONTAINER"
    docker rm -f "$LIVE_CONTAINER" >/dev/null 2>&1 || true
    docker rename "$BACKUP_CONTAINER" "$LIVE_CONTAINER"
    docker start "$LIVE_CONTAINER" >/dev/null
    health_check "$LIVE_CONTAINER" "http://127.0.0.1:$LIVE_PORT/" || \
        fail "Rollback started, but its health check failed"
    fail "Deployment failed. The previous release was restored"
}

if ! docker run -d \
    --name "$LIVE_CONTAINER" \
    --restart unless-stopped \
    -p "$LIVE_PORT:80" \
    "$IMAGE" >/dev/null; then
    rollback
fi

health_check "$LIVE_CONTAINER" "http://127.0.0.1:$LIVE_PORT/" || rollback
pwa_check "http://127.0.0.1:$LIVE_PORT" || rollback

mapfile -t older_backups < <(
    docker ps -a \
        --filter 'name=^/hearth-backup-' \
        --filter 'status=exited' \
        --format '{{.Names}}' |
        grep -vxF "$BACKUP_CONTAINER" || true
)

if ((${#older_backups[@]} > 0)); then
    older_images=()
    for older_backup in "${older_backups[@]}"; do
        older_images+=("$(docker inspect "$older_backup" --format '{{.Config.Image}}')")
    done

    log "Removing older rollback containers"
    if docker rm "${older_backups[@]}" >/dev/null; then
        for older_image in "${older_images[@]}"; do
            if ! docker image rm "$older_image" >/dev/null 2>&1; then
                log "Unused image $older_image was not removed"
            fi
        done
    else
        log "An older rollback container was not removed"
    fi
fi

trap - EXIT

log "Hearth $COMMIT deployed successfully"
log "Rollback container: $BACKUP_CONTAINER"
docker ps \
    --filter 'name=^/hearth$' \
    --format 'Name: {{.Names}}  Image: {{.Image}}  Status: {{.Status}}  Ports: {{.Ports}}'
