#!/bin/bash
# Shared safe-check helpers — skip or warn when resources already exist.

# Requires logging.sh to be sourced first.

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

pkg_installed() {
    dpkg -s "$1" >/dev/null 2>&1
}

# Install apt package only if missing; never abort the script.
apt_install_if_missing() {
    local pkg="$1"
    if pkg_installed "${pkg}"; then
        log_ok "Already installed: ${pkg}"
        return 0
    fi
    log_step "Installing ${pkg}"
    if apt-get install -y -qq "${pkg}"; then
        log_ok "Installed ${pkg}"
        return 0
    fi
    log_warn "Could not install ${pkg} — continuing"
    return 1
}

ensure_command() {
    local cmd="$1"
    local hint="${2:-}"
    if command_exists "${cmd}"; then
        log_ok "Found: ${cmd}"
        return 0
    fi
    log_error "Required command not found: ${cmd}"
    [ -n "${hint}" ] && log_info "${hint}"
    return 1
}

ensure_docker_cli() {
    if command_exists docker; then
        log_ok "Docker CLI: $(docker --version 2>/dev/null || echo ok)"
        return 0
    fi
    log_error "Docker CLI not found"
    return 1
}

ensure_compose_cli() {
    if docker compose version >/dev/null 2>&1; then
        log_ok "docker compose plugin available"
        return 0
    fi
    if command_exists docker-compose; then
        log_ok "docker-compose standalone available"
        return 0
    fi
    log_error "Neither 'docker compose' nor 'docker-compose' found"
    return 1
}

ensure_docker_daemon() {
    if systemctl is-active docker >/dev/null 2>&1; then
        log_ok "Docker daemon is running"
        return 0
    fi
    log_step "Starting Docker daemon"
    systemctl enable docker 2>/dev/null || true
    systemctl start docker 2>/dev/null || service docker start 2>/dev/null || true
    sleep 2
    if systemctl is-active docker >/dev/null 2>&1 || docker info >/dev/null 2>&1; then
        log_ok "Docker daemon is running"
        return 0
    fi
    log_warn "Docker daemon may not be running — continuing anyway"
    return 1
}

ensure_docker_network() {
    local net="${1:-novasafe-network}"
    if docker network inspect "${net}" >/dev/null 2>&1; then
        log_ok "Network '${net}' already exists"
        return 0
    fi
    log_step "Creating network '${net}'"
    docker network create "${net}" >/dev/null
    log_ok "Network '${net}' created"
}

connect_network_if_needed() {
    local net="$1"
    local container="$2"
    if ! docker ps --format '{{.Names}}' | grep -Fxq "${container}"; then
        return 0
    fi
    if docker inspect "${container}" --format '{{json .NetworkSettings.Networks}}' 2>/dev/null \
        | grep -q "\"${net}\""; then
        log_ok "${container} already on ${net}"
        return 0
    fi
    docker network connect "${net}" "${container}" 2>/dev/null || true
    log_ok "Connected ${container} to ${net}"
}

container_is_running() {
    local name="$1"
    docker ps --format '{{.Names}}' | grep -Fxq "${name}"
}

container_exists() {
    local name="$1"
    docker ps -a --format '{{.Names}}' | grep -Fxq "${name}"
}

ensure_directory() {
    local dir="$1"
    if [ -d "${dir}" ]; then
        return 0
    fi
    mkdir -p "${dir}"
    log_ok "Created directory: ${dir}"
}

ensure_file_executable() {
    local file="$1"
    [ -f "${file}" ] && chmod +x "${file}" 2>/dev/null || true
}

env_file_present() {
    [ -f "${1}/.env" ]
}
