#!/usr/bin/env bash
set -euo pipefail

ACTION=pull
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"

orion_tor2web() {
    docker pull "$ORION_IMAGE_NAMESPACE/orion-tor2web:$ORION_IMAGE_TAG" || return $?
    docker pull "$ORION_IMAGE_NAMESPACE/orion-tor2web-tor:$ORION_IMAGE_TAG" || return $?
}

main "$@"
