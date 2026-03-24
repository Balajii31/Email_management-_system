"""
Supabase Keep-Alive Script
Pings the Supabase project every time it runs to prevent auto-pausing.
Scheduled via Windows Task Scheduler to run every 4 days.
"""

import urllib.request
import urllib.error
import json
import os
import sys
from datetime import datetime

# ── Config (reads from .env) ──────────────────────────────────────────────────
SUPABASE_URL = None
SUPABASE_ANON_KEY = None

LOG_FILE = os.path.join(os.path.dirname(__file__), "keepalive.log")
ENV_FILE = os.path.join(os.path.dirname(__file__), "..", ".env")


def read_anon_key():
    """Read NEXT_PUBLIC_SUPABASE_ANON_KEY from .env file."""
    try:
        with open(ENV_FILE, "r") as f:
            for line in f:
                line = line.strip()
                if line.startswith("NEXT_PUBLIC_SUPABASE_ANON_KEY="):
                    key = line.split("=", 1)[1].strip().strip('"').strip("'")
                    return key
    except FileNotFoundError:
        pass
    return None


def read_supabase_url():
    """Read NEXT_PUBLIC_SUPABASE_URL from .env file."""
    try:
        with open(ENV_FILE, "r") as f:
            for line in f:
                line = line.strip()
                if line.startswith("NEXT_PUBLIC_SUPABASE_URL="):
                    url = line.split("=", 1)[1].strip().strip('"').strip("'")
                    return url
    except FileNotFoundError:
        pass
    return None


def log(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"[{timestamp}] {message}"
    print(entry)
    try:
        with open(LOG_FILE, "a") as f:
            f.write(entry + "\n")
    except Exception:
        pass


def ping_supabase():
    supabase_url = read_supabase_url() or SUPABASE_URL
    anon_key = read_anon_key() or SUPABASE_ANON_KEY

    if not supabase_url:
        log("ERROR: Could not find NEXT_PUBLIC_SUPABASE_URL in .env")
        sys.exit(1)

    if not anon_key:
        log("ERROR: Could not find NEXT_PUBLIC_SUPABASE_ANON_KEY in .env")
        sys.exit(1)

    # Ping the Supabase health endpoint
    url = f"{supabase_url}/rest/v1/"
    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
    }

    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response:
            status = response.status
            log(f"SUCCESS: Supabase ping OK (HTTP {status}) — project stays active!")
            return True

    except urllib.error.HTTPError as e:
        # Any HTTP response (even 4xx) means the server is awake — good!
        log(f"SUCCESS: Supabase responded (HTTP {e.code}) — project is active!")
        return True

    except urllib.error.URLError as e:
        log(f"ERROR: Could not reach Supabase — {e.reason}")
        log("   → Project may be paused. Visit: https://supabase.com/dashboard")
        return False

    except Exception as e:
        log(f"ERROR: Unexpected error — {e}")
        return False


if __name__ == "__main__":
    log("── Supabase Keep-Alive Ping ──────────────────────────")
    success = ping_supabase()
    log("─────────────────────────────────────────────────────")
    sys.exit(0 if success else 1)
