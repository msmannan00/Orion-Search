#!/usr/bin/env bash

PACKAGE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ORION_BASE_DIR="${ORION_BASE_DIR:-$(cd -- "$PACKAGE_DIR/../.." && pwd)}"
ORION_IMAGE_NAMESPACE="${ORION_IMAGE_NAMESPACE:-msmannan00}"
ORION_IMAGE_TAG="${ORION_IMAGE_TAG:-latest}"
REPOSITORIES=(Orion-Crawler Orion-Dark-Nexus Orion-Intelligence Orion-mail
    Orion-Micros Orion-Sandbox Orion-Social Orion-Storage Orion-Tor2Web)
HANDLERS=(orion_crawler orion_dark_nexus orion_intelligence orion_mail
    orion_micros orion_sandbox orion_social orion_storage orion_tor2web)
SELECTED=(0 0 0 0 0 0 0 0 0)

pending() { printf '%s: %s not implemented yet.\n' "$1" "$ACTION" >&2; return 1; }
orion_crawler()      { pending Orion-Crawler; }
orion_dark_nexus()   { pending Orion-Dark-Nexus; }
orion_intelligence() { pending Orion-Intelligence; }
orion_mail()         { pending Orion-mail; }
orion_micros()       { pending Orion-Micros; }
orion_sandbox()      { pending Orion-Sandbox; }
orion_social()       { pending Orion-Social; }
orion_storage()      { pending Orion-Storage; }

restore_terminal() { printf '\033[?25h\033[?1049l'; }

choose_repositories() {
    [[ -t 0 && -t 1 && "${TERM:-dumb}" != dumb ]] || {
        printf 'Run this script in a terminal.\n' >&2; return 1;
    }
    local cursor=0 count index row checked label key suffix value
    local total=${#REPOSITORIES[@]}
    trap restore_terminal EXIT
    trap 'exit 130' INT
    trap 'exit 143' TERM
    printf '\033[?1049h\033[?25l'
    while true; do
        count=0
        for value in "${SELECTED[@]}"; do count=$((count + value)); done
        printf '\033[H\033[2JOrion Docker %s\n\n' "$ACTION"
        printf 'Up/Down: move | Space: toggle | Enter: run | q/Esc: cancel\n\n'
        for ((row = 0; row <= total; row++)); do
            checked=' '
            if ((row == 0)); then
                label=All
                if ((count == total)); then checked=x; fi
            else
                label="${REPOSITORIES[row - 1]}"
                if ((SELECTED[row - 1])); then checked=x; fi
            fi
            if ((cursor == row)); then printf '\033[7m'; fi
            printf '  [%s] %-24s\033[0m\n' "$checked" "$label"
        done
        printf '\nSelected: %s/%s | %s:<%s>\n' "$count" "$total" "$ORION_IMAGE_NAMESPACE" "$ORION_IMAGE_TAG"
        printf 'Tor2Web is ready; other handlers are pending.\n'
        IFS= read -rsn1 key || exit 130
        if [[ "$key" == $'\033' ]]; then
            suffix=''
            IFS= read -rsn2 -t 0.15 suffix || true
            key+="$suffix"
        fi
        case "$key" in
            $'\033[A'|k) cursor=$(((cursor + total) % (total + 1))) ;;
            $'\033[B'|j) cursor=$(((cursor + 1) % (total + 1))) ;;
            ' ')
                if ((cursor == 0)); then
                    value=$((count != total))
                    for index in "${!SELECTED[@]}"; do SELECTED[index]=$value; done
                else
                    index=$((cursor - 1))
                    SELECTED[index]=$((1 - SELECTED[index]))
                fi
                ;;
            '') if ((count > 0)); then break; fi ;;
            q|Q|$'\033') exit 130 ;;
        esac
    done
    restore_terminal
    trap - EXIT INT TERM
}

main() {
    if (($#)); then printf 'Usage: %s (interactive)\n' "$0" >&2; return 1; fi
    choose_repositories || return $?
    local index failed=0
    for index in "${!REPOSITORIES[@]}"; do
        ((SELECTED[index])) || continue
        printf '\n%s: %s\n' "$ACTION" "${REPOSITORIES[index]}"
        "${HANDLERS[index]}" || failed=1
    done
    return "$failed"
}
