#!/bin/bash
# Shared logging helpers for NovaSafe deploy scripts.

NS_LOG_COLOR="${NS_LOG_COLOR:-auto}"

if [ "${NS_LOG_COLOR}" = "auto" ]; then
    if [ -t 1 ]; then
        NS_LOG_COLOR="yes"
    else
        NS_LOG_COLOR="no"
    fi
fi

if [ "${NS_LOG_COLOR}" = "yes" ]; then
    C_RESET='\033[0m'
    C_BOLD='\033[1m'
    C_DIM='\033[2m'
    C_CYAN='\033[36m'
    C_GREEN='\033[32m'
    C_YELLOW='\033[33m'
    C_RED='\033[31m'
    C_BLUE='\033[34m'
    C_MAGENTA='\033[35m'
else
    C_RESET='' C_BOLD='' C_DIM='' C_CYAN='' C_GREEN='' C_YELLOW='' C_RED='' C_BLUE='' C_MAGENTA=''
fi

ns_timestamp() {
    date -u '+%Y-%m-%d %H:%M:%S UTC'
}

log_banner() {
    local title="$1"
    local subtitle="${2:-}"
    echo ""
    echo -e "${C_CYAN}${C_BOLD}╔══════════════════════════════════════════════════════════════╗${C_RESET}"
    printf "${C_CYAN}${C_BOLD}║${C_RESET} %-60s ${C_CYAN}${C_BOLD}║${C_RESET}\n" "$title"
    if [ -n "$subtitle" ]; then
        printf "${C_CYAN}${C_BOLD}║${C_RESET} ${C_DIM}%-60s${C_RESET} ${C_CYAN}${C_BOLD}║${C_RESET}\n" "$subtitle"
    fi
    echo -e "${C_CYAN}${C_BOLD}╚══════════════════════════════════════════════════════════════╝${C_RESET}"
    echo ""
}

log_section() {
    local title="$1"
    echo ""
    echo -e "${C_BLUE}${C_BOLD}━━━ ${title} ━━━${C_RESET}"
    echo -e "${C_DIM}    $(ns_timestamp)${C_RESET}"
}

log_step() {
    echo -e "${C_MAGENTA}▶${C_RESET} ${C_BOLD}$1${C_RESET}"
}

log_info() {
    echo -e "  ${C_DIM}│${C_RESET} $1"
}

log_ok() {
    echo -e "  ${C_GREEN}✔${C_RESET} $1"
}

log_warn() {
    echo -e "  ${C_YELLOW}⚠${C_RESET} $1"
}

log_error() {
    echo -e "  ${C_RED}✖${C_RESET} $1"
}

log_cmd() {
    echo -e "  ${C_DIM}\$${C_RESET} ${C_CYAN}$1${C_RESET}"
}

log_divider() {
    echo -e "${C_DIM}──────────────────────────────────────────────────────────────${C_RESET}"
}

log_summary_row() {
    local label="$1"
    local value="$2"
    local status="${3:-}"
    if [ -n "$status" ]; then
        printf "  %-28s %s  %s\n" "$label" "$value" "$status"
    else
        printf "  %-28s %s\n" "$label" "$value"
    fi
}
