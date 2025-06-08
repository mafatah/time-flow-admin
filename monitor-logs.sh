#!/bin/bash

# monitor-logs.sh - Comprehensive log monitoring for time-flow-admin
# Created: June 8, 2025

# ANSI color codes
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
BOLD='\033[1m'
RESET='\033[0m'

# Log file paths
VITE_LOG="./dev.log"
BACKEND_LOG="./backend/logs/app.log"
ERROR_LOG="./error.log"
BROWSER_LOG="./browser-console.log"  # If you're using a tool to capture browser logs

# Create log directory if it doesn't exist
mkdir -p ./logs

# Header
echo -e "${BOLD}${BLUE}╔════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${BLUE}║                TIME-FLOW-ADMIN LOG MONITOR                 ║${RESET}"
echo -e "${BOLD}${BLUE}╚════════════════════════════════════════════════════════════╝${RESET}"
echo -e "${CYAN}Started at: $(date)${RESET}"
echo -e "${CYAN}Monitoring:${RESET}"
echo -e "  ${GREEN}✓${RESET} Development server (Vite)"
echo -e "  ${GREEN}✓${RESET} Backend server (NestJS)"
echo -e "  ${GREEN}✓${RESET} Error logs"
echo -e "  ${GREEN}✓${RESET} Browser console (if available)"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop monitoring${RESET}"
echo ""

# Function to add timestamp and format logs
format_log() {
  local source=$1
  local line=$2
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  
  # Format based on log content
  if [[ $line == *"error"* || $line == *"Error"* || $line == *"ERROR"* || $line == *"exception"* || $line == *"Exception"* ]]; then
    echo -e "${timestamp} ${PURPLE}[${source}]${RESET} ${RED}${line}${RESET}"
  elif [[ $line == *"warn"* || $line == *"Warn"* || $line == *"WARNING"* ]]; then
    echo -e "${timestamp} ${PURPLE}[${source}]${RESET} ${YELLOW}${line}${RESET}"
  elif [[ $line == *"debug"* || $line == *"Debug"* || $line == *"DEBUG"* ]]; then
    echo -e "${timestamp} ${PURPLE}[${source}]${RESET} ${GRAY}${line}${RESET}"
  else
    echo -e "${timestamp} ${PURPLE}[${source}]${RESET} ${line}"
  fi
}

# Function to monitor a log file
monitor_log() {
  local source=$1
  local log_file=$2
  
  # Check if log file exists, create empty file if not
  if [ ! -f "$log_file" ]; then
    touch "$log_file"
    echo -e "${YELLOW}Created empty log file: $log_file${RESET}"
  fi
  
  # Use tail to monitor the log file
  tail -f "$log_file" 2>/dev/null | while read -r line; do
    format_log "$source" "$line"
  done &
}

# Function to monitor development server output
monitor_dev_server() {
  # Get PID of running Vite server
  local vite_pid=$(ps aux | grep "vite" | grep -v grep | awk '{print $2}' | head -1)
  
  if [ -n "$vite_pid" ]; then
    echo -e "${GREEN}Found Vite server running with PID: $vite_pid${RESET}"
    
    # Create a named pipe for capturing stdout
    local pipe_file="./logs/vite_pipe"
    rm -f "$pipe_file"
    mkfifo "$pipe_file"
    
    # Start monitoring the pipe
    cat "$pipe_file" | while read -r line; do
      format_log "VITE" "$line"
    done &
    
    # Try to attach to the process output (this is system-dependent)
    if command -v strace &> /dev/null; then
      echo -e "${CYAN}Using strace to monitor Vite output...${RESET}"
      strace -p "$vite_pid" -e write=1,2 -s 1024 2>&1 | grep -v "^write" > "$pipe_file" &
    else
      echo -e "${YELLOW}Could not attach to Vite process output directly.${RESET}"
      echo -e "${YELLOW}Monitoring dev.log instead...${RESET}"
      monitor_log "VITE" "$VITE_LOG"
    fi
  else
    echo -e "${YELLOW}No running Vite server found. Monitoring log file instead.${RESET}"
    monitor_log "VITE" "$VITE_LOG"
  fi
}

# Function to monitor backend server output
monitor_backend_server() {
  # Get PID of running NestJS server
  local nest_pid=$(ps aux | grep "nest" | grep -v grep | awk '{print $2}' | head -1)
  
  if [ -n "$nest_pid" ]; then
    echo -e "${GREEN}Found NestJS server running with PID: $nest_pid${RESET}"
    # Similar approach as with Vite server
  else
    echo -e "${YELLOW}No running NestJS server found. Monitoring log file instead.${RESET}"
    monitor_log "BACKEND" "$BACKEND_LOG"
  fi
}

# Function to check for Electron processes
check_electron() {
  local electron_pid=$(ps aux | grep "electron" | grep -v grep | awk '{print $2}' | head -1)
  
  if [ -n "$electron_pid" ]; then
    echo -e "${GREEN}Found Electron process running with PID: $electron_pid${RESET}"
    # Monitor Electron logs if available
  else
    echo -e "${GRAY}No Electron process detected.${RESET}"
  fi
}

# Function to check server status periodically
check_server_status() {
  while true; do
    # Check if Vite server is responsive
    if curl -s http://localhost:8080/ > /dev/null 2>&1; then
      echo -e "$(date "+%Y-%m-%d %H:%M:%S") ${PURPLE}[STATUS]${RESET} ${GREEN}Web server is running at http://localhost:8080/${RESET}"
    else
      echo -e "$(date "+%Y-%m-%d %H:%M:%S") ${PURPLE}[STATUS]${RESET} ${RED}Web server is NOT responding at http://localhost:8080/${RESET}"
    fi
    
    # Check if backend server is responsive (adjust port as needed)
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
      echo -e "$(date "+%Y-%m-%d %H:%M:%S") ${PURPLE}[STATUS]${RESET} ${GREEN}Backend server is running at http://localhost:3000/${RESET}"
    else
      echo -e "$(date "+%Y-%m-%d %H:%M:%S") ${PURPLE}[STATUS]${RESET} ${YELLOW}Backend server is NOT responding at http://localhost:3000/${RESET}"
    fi
    
    # Check memory usage of key processes
    echo -e "$(date "+%Y-%m-%d %H:%M:%S") ${PURPLE}[MEMORY]${RESET} $(ps -eo pmem,comm | grep -E 'node|vite|electron' | grep -v grep)"
    
    sleep 60  # Check every minute
  done &
}

# Function to monitor browser console logs (if available)
monitor_browser_console() {
  if [ -f "$BROWSER_LOG" ]; then
    monitor_log "BROWSER" "$BROWSER_LOG"
  else
    echo -e "${YELLOW}Browser console log file not found at: $BROWSER_LOG${RESET}"
    echo -e "${YELLOW}To capture browser logs, you may need to use browser developer tools.${RESET}"
  fi
}

# Function to clean up on exit
cleanup() {
  echo -e "\n${CYAN}Stopping log monitoring...${RESET}"
  kill $(jobs -p) 2>/dev/null
  rm -f ./logs/vite_pipe 2>/dev/null
  echo -e "${GREEN}Log monitoring stopped.${RESET}"
  exit 0
}

# Set up cleanup on script exit
trap cleanup EXIT INT TERM

# Start monitoring
monitor_dev_server
monitor_backend_server
monitor_log "ERROR" "$ERROR_LOG"
monitor_browser_console
check_electron
check_server_status

# Keep the script running
echo -e "${GREEN}Log monitoring active. Watching for changes...${RESET}"
echo -e "${GRAY}─────────────────────────────────────────────────${RESET}"
wait
