#!/usr/bin/env python3
"""
StrayBuddy — interactive 3-runtime controller.

Three runtimes, one shared backend:

  1. USER FRONTEND      Next.js  - localhost:3000   (the map, strays, campaigns)
  2. BACKEND API        Express  - localhost:5000   (shared by both frontends)
  3. ADMIN FRONTEND     Next.js  - localhost:3001   (the admin console)

Both frontends talk to the SAME backend on port 5000, so business logic lives
in one layer instead of being duplicated.

Controls while running:
   h  health check every runtime
   r  restart one runtime
   l  tail the last log lines of a runtime
   s  status summary
   d  list the CSV data files
   q  stop everything and exit

Run with:
    python server.py
"""

from __future__ import annotations

import json
import queue
import socket
import subprocess
import sys
import threading
import time
import urllib.request
import os
from datetime import datetime
from pathlib import Path



ROOT = Path(__file__).resolve().parent

CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
MAGENTA = "\033[95m"
BLUE = "\033[94m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

BACKEND_PORT = int(os.environ.get("BACKEND_PORT", 5000))
USER_PORT = int(os.environ.get("USER_PORT", 3000))
ADMIN_PORT = int(os.environ.get("ADMIN_PORT", 3001))

LOG_LIMIT = 400


# -------------------------------------------------------------------------------
# Runtime bookkeeping
# -------------------------------------------------------------------------------
class Runtime:
    def __init__(self, key: str, label: str, port: int, color: str, command: list[str], cwd: Path):
        self.key = key
        self.label = label
        self.port = port
        self.color = color
        self.command = command
        self.cwd = cwd
        self.proc: subprocess.Popen | None = None
        self.lines: list[str] = []
        self.lock = threading.Lock()
        self.state = "stopped"   # stopped | starting | up | crashed

    # -------------------------------------------------- lifecycle
    def start(self) -> None:
        if self.proc and self.proc.poll() is None:
            return

        self.state = "starting"
        self.lines.clear()

        env = os.environ.copy()
        env["PORT"] = str(self.port)
        # Next reads NODE_OPTIONS for the second instance; keep them apart
        env["NEXT_DISABLE_TELEMETRY"] = "1"

        try:
            self.proc = subprocess.Popen(
                self.command,
                cwd=str(self.cwd),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                # Node prints UTF-8 (next build's ✔, emoji in logs). Relying on the
                # Windows locale (cp1252) crashed the pump thread on those bytes.
                text=True,
                encoding="utf-8",
                errors="replace",
                bufsize=1,
                shell=(os.name == "nt"),
                env=env,
            )
        except Exception as exc:  # pragma: no cover - environment issue
            self.push(f"failed to start: {exc}")
            self.state = "crashed"
            return

        threading.Thread(target=self._pump, daemon=True).start()
        threading.Thread(target=self._watch, daemon=True).start()

    def _pump(self) -> None:
        """Copy process output into the in-memory log."""
        if not self.proc or not self.proc.stdout:
            return
        for raw in iter(self.proc.stdout.readline, ""):
            line = raw.rstrip()
            if line:
                self.push(line)

    def _watch(self) -> None:
        """Wait for the port to answer, then keep an eye on the process."""
        deadline = time.time() + 90
        while time.time() < deadline:
            if self.proc is None or self.proc.poll() is not None:
                self.state = "crashed"
                self.push("process exited")
                return
            if port_open(self.port, timeout=0.4):
                self.state = "up"
                return
            time.sleep(1.2)
        # still running but not listening: dev servers can be slow to boot
        self.state = "up" if self.proc and self.proc.poll() is None else "crashed"

    def stop(self) -> None:
        if not self.proc:
            self.state = "stopped"
            return
        try:
            if os.name == "nt":
                subprocess.call(
                    ["taskkill", "/F", "/T", "/PID", str(self.proc.pid)],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
            else:
                self.proc.terminate()
        except Exception:
            pass
        self.state = "stopped"
        self.proc = None

    def restart(self) -> None:
        self.stop()
        time.sleep(1.0)
        self.start()

    # -------------------------------------------------- helpers
    def push(self, line: str) -> None:
        stamp = datetime.now().strftime("%H:%M:%S")
        with self.lock:
            self.lines.append(f"{DIM}{stamp}{RESET} {self.color}[{self.label}]{RESET} {line}")
            if len(self.lines) > LOG_LIMIT:
                del self.lines[:-LOG_LIMIT]

    def tail(self, count: int = 15) -> list[str]:
        with self.lock:
            return self.lines[-count:]

    @property
    def url(self) -> str:
        return f"http://localhost:{self.port}"


# -------------------------------------------------------------------------------
# Small utilities
# -------------------------------------------------------------------------------
def port_open(port: int, host: str = "127.0.0.1", timeout: float = 0.5) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def get_lan_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def http_health(url: str, timeout: float = 2.0) -> tuple[bool, str]:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as res:
            body = res.read(180).decode("utf-8", "ignore")
            return True, body.replace("\n", " ")[:140]
    except Exception as exc:
        return False, str(exc)[:140]


def kill_port_owner(port: int) -> None:
    """Stop anything already sitting on our port so a restart is clean."""
    if os.name != "nt":
        return
    try:
        out = subprocess.run(
            ["netstat", "-ano", "-p", "TCP"],
            capture_output=True,
            text=True,
            timeout=10,
        ).stdout
        for line in out.splitlines():
            if f":{port}" in line and "LISTENING" in line:
                pid = line.split()[-1]
                subprocess.call(["taskkill", "/F", "/PID", pid], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass


# -------------------------------------------------------------------------------
# Banner
# -------------------------------------------------------------------------------
def print_banner(lan_ip: str, runtimes: list[Runtime]) -> None:
    os.system("cls" if os.name == "nt" else "clear")
    print(f"{CYAN}{BOLD}{'=' * 66}{RESET}")
    print(f"{GREEN}{BOLD}      STRAYBUDDY — 3 RUNTIME CONTROLLER{RESET}")
    print(f"{CYAN}{BOLD}{'=' * 66}{RESET}")
    print(f" {BOLD}1. User app{RESET}      {GREEN}{runtimes[0].url:<26}{RESET} map · strays · campaigns")
    print(f" {BOLD}2. Backend API{RESET}   {YELLOW}{runtimes[1].url:<26}{RESET} shared by both frontends")
    print(f" {BOLD}3. Admin app{RESET}     {MAGENTA}{runtimes[2].url:<26}{RESET} telemetry · campaigns")
    print(f"{CYAN}{'-' * 66}{RESET}")
    print(f" {YELLOW}{BOLD}Phone (same Wi-Fi){RESET}")
    print(f"   User app : {GREEN}http://{lan_ip}:{USER_PORT}{RESET}")
    print(f"   Admin app: {MAGENTA}http://{lan_ip}:{ADMIN_PORT}{RESET}")
    print(f"   API      : {YELLOW}http://{lan_ip}:{BACKEND_PORT}/api/health{RESET}")
    print(f"{CYAN}{'-' * 66}{RESET}")
    print(f" {BOLD}Controls:{RESET} {GREEN}h{RESET} health  {GREEN}r{RESET} restart  {GREEN}l{RESET} logs"
          f"  {GREEN}s{RESET} status  {GREEN}d{RESET} data files  {RED}q{RESET} quit")
    print(f"{CYAN}{BOLD}{'=' * 66}{RESET}\n")


# -------------------------------------------------------------------------------
# Controller
# -------------------------------------------------------------------------------
def main() -> int:
    os.environ.setdefault("BACKEND_API_URL", f"http://127.0.0.1:{BACKEND_PORT}")

    runtimes = [
        Runtime(
            "user",
            "USER:3000",
            USER_PORT,
            GREEN,
            ["node", str(ROOT / "node_modules" / "next" / "dist" / "bin" / "next"), "dev", "-H", "0.0.0.0", "-p", str(USER_PORT)],
            ROOT,
        ),
        Runtime("api", "API:5000", BACKEND_PORT, YELLOW, ["node", str(ROOT / "backend" / "server.js")], ROOT),
        Runtime(
            "admin",
            "ADMIN:3001",
            ADMIN_PORT,
            MAGENTA,
            # The admin frontend is the same Next app; only the entry route differs.
            ["node", str(ROOT / "node_modules" / "next" / "dist" / "bin" / "next"), "dev", "-H", "0.0.0.0", "-p", str(ADMIN_PORT)],
            ROOT,
        ),
    ]

    lan_ip = get_lan_ip()
    print_banner(lan_ip, runtimes)

    for port in (USER_PORT, ADMIN_PORT, BACKEND_PORT):
        kill_port_owner(port)

    print(f"{YELLOW}Starting the shared backend first (both frontends depend on it)...{RESET}")
    runtimes[1].start()
    time.sleep(1.5)

    print(f"{GREEN}Starting the user frontend on {USER_PORT}...{RESET}")
    runtimes[0].start()

    print(f"{MAGENTA}Starting the admin frontend on {ADMIN_PORT}...{RESET}\n")
    runtimes[2].start()

    output: "queue.Queue[str]" = queue.Queue()

    def log_printer() -> None:
        seen = {rt.key: 0 for rt in runtimes}
        while True:
            for rt in runtimes:
                lines = rt.tail(200)
                for line in lines[seen[rt.key]:]:
                    print(line, flush=True)
                seen[rt.key] = len(lines)
            time.sleep(0.5)

    threading.Thread(target=log_printer, daemon=True).start()

    def read_commands() -> None:
        """Read keyboard commands in the background."""
        while True:
            try:
                cmd = input().strip().lower()
            except EOFError:
                return
            output.put(cmd)

    threading.Thread(target=read_commands, daemon=True).start()

    def stop_all() -> None:
        print(f"\n{RED}{BOLD}Stopping all runtimes...{RESET}")
        for rt in runtimes:
            print(f" - {rt.label}")
            rt.stop()
        print(f"{GREEN}All stopped. Bye!{RESET}\n")

    try:
        while True:
            try:
                cmd = output.get(timeout=0.6)
            except queue.Empty:
                # keep the banner honest: refresh state line occasionally
                continue

            if not cmd:
                continue

            if cmd in ("q", "quit", "exit"):
                stop_all()
                return 0

            if cmd == "s":
                print(f"\n{BOLD}Status{RESET}")
                for rt in runtimes:
                    dot = f"{GREEN}up{RESET}" if rt.state == "up" else (
                        f"{YELLOW}starting{RESET}" if rt.state == "starting" else f"{RED}{rt.state}{RESET}"
                    )
                    print(f"  {rt.label:<12} {dot:<20} {rt.url}")
                print()

            elif cmd == "h":
                print(f"\n{BOLD}Health checks{RESET}")
                for rt in runtimes:
                    path = "/api/health" if rt.key == "api" else "/"
                    ok, detail = http_health(rt.url + path)
                    mark = f"{GREEN}ok{RESET}" if ok else f"{RED}down{RESET}"
                    print(f"  {rt.label:<12} {mark}  {DIM}{detail}{RESET}")
                print()

            elif cmd == "r":
                answer = input(f"Restart which runtime? user / api / admin / all: ").strip().lower()
                targets = runtimes if answer == "all" else [rt for rt in runtimes if rt.key == answer[:4]]
                if not targets:
                    print(f"{YELLOW}Unknown runtime.{RESET}")
                for rt in targets:
                    print(f"{YELLOW}Restarting {rt.label}...{RESET}")
                    kill_port_owner(rt.port)
                    rt.restart()

            elif cmd == "l":
                answer = input("Logs of which runtime? user / api / admin: ").strip().lower()
                for rt in runtimes:
                    if rt.key == answer[:4]:
                        print(f"\n{BOLD}{rt.label} — last lines{RESET}")
                        for line in rt.tail(20):
                            print(line)
                        print()

            elif cmd == "d":
                print(f"{CYAN}StrayBuddy now stores its data in backend/data as CSV files.{RESET}")
                print(f"{DIM}No database server is needed: users.csv, cats.csv, dogs.csv, others.csv, campaigns.csv...{RESET}")
                data_dir = ROOT / "backend" / "data"
                if not data_dir.exists():
                    print(f"{RED}backend/data is missing.{RESET}")
                else:
                    for csv_file in sorted(data_dir.glob("*.csv")):
                        print(f"  - {csv_file.name}")

            else:
                print(f"{YELLOW}Commands: h health · r restart · l logs · s status · d database · q quit{RESET}")

    except KeyboardInterrupt:
        stop_all()
        return 0
    finally:
        for rt in runtimes:
            if rt.proc and rt.proc.poll() is None:
                rt.stop()


if __name__ == "__main__":
    sys.exit(main())
