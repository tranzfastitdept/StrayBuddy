# ==============================================================================
# StrayBuddy Interactive 3-Tier Server Terminal Manager (Option B)
# Launches and monitors:
#   1. Backend Server (Express/Node - Port 5000)
#   2. Mobile Frontend (Next.js - Port 3000)
#   3. Admin Portal (Next.js Admin Gateway - Port 3000/admin)
# ==============================================================================

import os
import sys
import time
import socket
import subprocess
import threading
import signal

# ANSI Color Codes for terminal UI
CYAN = '\033[96m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
MAGENTA = '\033[95m'
BLUE = '\033[94m'
BOLD = '\033[1m'
RESET = '\033[0m'

processes = []
running = True

def get_lan_ip():
    """Detect active Wi-Fi / LAN IP address for phone testing."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Does not send packets; resolves preferred outbound IP
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def print_banner(lan_ip):
    os.system('cls' if os.name == 'nt' else 'clear')
    print(f"{CYAN}{BOLD}======================================================================{RESET}")
    print(f"{GREEN}{BOLD}      🐾  STRAYBUDDY 3-TIER PRODUCTION SERVER CONTROLLER  🐾{RESET}")
    print(f"{CYAN}{BOLD}======================================================================{RESET}")
    print(f" {BOLD}Layer 1: Mobile User Frontend{RESET}  ->  {GREEN}http://localhost:3000{RESET}")
    print(f" {BOLD}Layer 2: Standalone API Server{RESET} ->  {YELLOW}http://localhost:5000{RESET}")
    print(f" {BOLD}Layer 3: Admin Dashboard Portal{RESET}->  {MAGENTA}http://localhost:3000/admin{RESET}")
    print(f" {BOLD}Charity Announcements Board{RESET}    ->  {BLUE}http://localhost:3000/announcements{RESET}")
    print(f"{CYAN}----------------------------------------------------------------------{RESET}")
    print(f" {YELLOW}{BOLD}📱 MOBILE PHONE ACCESS (Same Wi-Fi):{RESET}")
    print(f"    User Radar Map:    {GREEN}{BOLD}http://{lan_ip}:3000{RESET}")
    print(f"    Admin Portal:      {MAGENTA}{BOLD}http://{lan_ip}:3000/admin{RESET}")
    print(f"    Backend Health:    {YELLOW}{BOLD}http://{lan_ip}:5000/api/health{RESET}")
    print(f"{CYAN}----------------------------------------------------------------------{RESET}")
    print(f" {BOLD}Superadmin Credentials:{RESET} Username: {GREEN}superad{RESET} | Password: {GREEN}superad{RESET}")
    print(f" {BOLD}Database Mode:{RESET}          {CYAN}CSV (Local Dev) / Supabase (Production){RESET}")
    print(f" {BOLD}Press Ctrl + C anytime to cleanly terminate all 3 servers.{RESET}")
    print(f"{CYAN}{BOLD}======================================================================{RESET}\n")

def stream_logs(pipe, prefix, color):
    """Read output line-by-line and print with clean service tags."""
    try:
        for line in iter(pipe.readline, ''):
            if not running:
                break
            line_str = line.strip()
            if line_str:
                print(f"{color}[{prefix}]{RESET} {line_str}")
    except Exception:
        pass
    finally:
        pipe.close()

def start_backend():
    """Start Standalone Node/Express Backend on Port 5000."""
    script_path = os.path.join(os.getcwd(), 'backend', 'server.js')
    proc = subprocess.Popen(
        ['node', script_path],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        shell=(os.name == 'nt')
    )
    processes.append(('BACKEND (Port 5000)', proc))
    t = threading.Thread(target=stream_logs, args=(proc.stdout, 'BACKEND:5000', YELLOW), daemon=True)
    t.start()

def start_frontend():
    """Start Next.js Frontend (Mobile Web & Admin Portal on Port 3000)."""
    next_bin = os.path.join(os.getcwd(), 'node_modules', 'next', 'dist', 'bin', 'next')
    proc = subprocess.Popen(
        ['node', next_bin, 'dev', '-H', '0.0.0.0', '-p', '3000'],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        shell=(os.name == 'nt')
    )
    processes.append(('FRONTEND (Port 3000)', proc))
    t = threading.Thread(target=stream_logs, args=(proc.stdout, 'FRONTEND:3000', GREEN), daemon=True)
    t.start()

def cleanup(sig=None, frame=None):
    """Gracefully stop all child processes."""
    global running
    running = False
    print(f"\n\n{RED}{BOLD}[SHUTDOWN] Terminating all 3 server instances...{RESET}")
    for name, proc in processes:
        try:
            print(f" - Stopping {name}...")
            if os.name == 'nt':
                subprocess.call(['taskkill', '/F', '/T', '/PID', str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                proc.terminate()
        except Exception:
            pass
    print(f"{GREEN}All servers stopped successfully. Bye! 🐾{RESET}\n")
    sys.exit(0)

if __name__ == '__main__':
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    lan_ip = get_lan_ip()
    print_banner(lan_ip)

    print(f"{YELLOW}[STARTING] Launching Layer 2: Backend REST Server (port 5000)...{RESET}")
    start_backend()
    time.sleep(1)

    print(f"{GREEN}[STARTING] Launching Layer 1 & 3: Mobile Web & Admin Gateways (port 3000)...{RESET}\n")
    start_frontend()

    # Keep main thread alive monitoring processes
    try:
        while running:
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup()
