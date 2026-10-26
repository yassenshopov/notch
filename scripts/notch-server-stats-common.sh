#!/usr/bin/env bash
# Shared helpers for notch-mint-stats.sh / notch-pi-stats.sh — emit one JSON line on stdout.
set -euo pipefail

json_escape() {
  python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' <<<"$1"
}

read_mem_mb() {
  awk '
    /MemTotal:/ { t=int($2/1024) }
    /MemAvailable:/ { a=int($2/1024) }
    END {
      if (t>0) { u=t-a; printf "%d %d %.1f", t, u, 100*u/t } else { print "0 0 0" }
    }
  ' /proc/meminfo
}

read_swap_mb() {
  awk '
    /SwapTotal:/ { t=int($2/1024) }
    /SwapFree:/ { f=int($2/1024) }
    END {
      if (t>0) { u=t-f; printf "%d %d %.1f", t, u, 100*u/t } else { print "0 0 0" }
    }
  ' /proc/meminfo
}

read_disk_gb() {
  df -BG / 2>/dev/null | awk 'NR==2 {
    gsub(/G/,"",$2); gsub(/G/,"",$3);
    t=$2+0; u=$3+0;
    if (t>0) printf "%.1f %.1f %.1f", t, u, 100*u/t; else print "0 0 0"
  }'
}

read_cpu_temp_c() {
  local raw=""
  for z in /sys/class/thermal/thermal_zone*/temp; do
    [[ -r "$z" ]] && raw=$(cat "$z" 2>/dev/null) && break
  done
  if [[ -n "$raw" && "$raw" =~ ^[0-9]+$ ]]; then
    awk -v t="$raw" 'BEGIN { printf "%.1f", t/1000 }'
  else
    echo "null"
  fi
}

read_tailscale_ip() {
  if command -v tailscale >/dev/null 2>&1; then
    tailscale ip -4 2>/dev/null | head -n1 || true
  fi
}

emit_server_stats_json() {
  local mirror_root="${NOTCH_MIRROR_ROOT:-}"
  local mirror_count="null"
  local mirror_log="null"

  if [[ -n "$mirror_root" && -d "$mirror_root" ]]; then
    mirror_count=$(find "$mirror_root" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
    local log_dir="${NOTCH_MIRROR_LOG_DIR:-$mirror_root}"
    if [[ -d "$log_dir" ]]; then
      mirror_log=$(find "$log_dir" -maxdepth 1 -type f -name '*.log' -printf '%f\n' 2>/dev/null | sort | tail -n1 || true)
      [[ -z "$mirror_log" ]] && mirror_log="null"
    fi
  fi

  local hostname uptime_sec load1 load5 load15
  hostname=$(hostname -s 2>/dev/null || hostname)
  uptime_sec=$(awk '{print int($1)}' /proc/uptime)
  read -r load1 load5 load15 _ < /proc/loadavg

  local mem_total mem_used mem_pct
  read -r mem_total mem_used mem_pct < <(read_mem_mb)

  local swap_total swap_used swap_pct
  read -r swap_total swap_used swap_pct < <(read_swap_mb)

  local disk_total disk_used disk_pct
  read -r disk_total disk_used disk_pct < <(read_disk_gb)

  local cpu_count process_count cpu_temp tailscale_ip
  cpu_count=$(nproc 2>/dev/null || echo 1)
  process_count=$(ps -e --no-headers 2>/dev/null | wc -l | tr -d ' ')
  cpu_temp=$(read_cpu_temp_c)
  tailscale_ip=$(read_tailscale_ip)

  if [[ "$mirror_log" != "null" && -n "$mirror_log" ]]; then
    mirror_log=$(json_escape "$mirror_log")
  fi

  if [[ "$cpu_temp" == "null" ]]; then
    cpu_temp_json="null"
  else
    cpu_temp_json="$cpu_temp"
  fi

  if [[ "$tailscale_ip" == "" ]]; then
    tailscale_json="null"
  else
    tailscale_json=$(json_escape "$tailscale_ip")
  fi

  if [[ "$mirror_log" == "null" ]]; then
    mirror_log_json="null"
  else
    mirror_log_json="$mirror_log"
  fi

  printf '%s\n' "{\"hostname\":\"$hostname\",\"uptimeSec\":$uptime_sec,\"load1\":$load1,\"load5\":$load5,\"load15\":$load15,\"memTotalMb\":$mem_total,\"memUsedMb\":$mem_used,\"memUsedPct\":$mem_pct,\"swapTotalMb\":$swap_total,\"swapUsedMb\":$swap_used,\"swapUsedPct\":$swap_pct,\"diskTotalGb\":$disk_total,\"diskUsedGb\":$disk_used,\"diskUsedPct\":$disk_pct,\"cpuCount\":$cpu_count,\"processCount\":$process_count,\"cpuTempC\":$cpu_temp_json,\"tailscaleIp\":$tailscale_json,\"mirrorRepoCount\":$mirror_count,\"mirrorLastLog\":$mirror_log_json}"
}
