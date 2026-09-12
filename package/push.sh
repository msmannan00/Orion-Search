#!/usr/bin/env bash
set -euo pipefail

ACTION=push
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"

orion_tor2web() {
    local context="$ORION_BASE_DIR/Orion-Tor2Web" dockerfile
    local gateway="$ORION_IMAGE_NAMESPACE/orion-tor2web:$ORION_IMAGE_TAG"
    local tor="$ORION_IMAGE_NAMESPACE/orion-tor2web-tor:$ORION_IMAGE_TAG"
    for dockerfile in deploy/official.Dockerfile deploy/tor.Dockerfile; do
        [[ -f "$context/$dockerfile" ]] || {
            printf 'Missing %s/%s\n' "$context" "$dockerfile" >&2; return 1;
        }
    done
    docker build --file "$context/deploy/official.Dockerfile" --tag "$gateway" "$context" || return $?
    docker build --file "$context/deploy/tor.Dockerfile" --tag "$tor" "$context" || return $?
    docker push "$gateway" || return $?
    docker push "$tor" || return $?
}

main "$@"
