"""
tools/run_and_capture.py - Starts uvicorn and vite preview, captures 32 screenshots, and cleanly exits.
"""
import sys
import os
import time
import subprocess
import urllib.request
from pathlib import Path

_HERE = Path(__file__).resolve().parent
PROJECT_ROOT = _HERE.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"

def wait_for_url(url: str, timeout: int = 45):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(url, timeout=3) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.5)
    return False

def main():
    print("Starting uvicorn backend on port 8000...")
    env = os.environ.copy()
    env["PYTHONPATH"] = str(PROJECT_ROOT)
    api_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "api.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=str(PROJECT_ROOT),
        env=env,
    )

    print("Starting vite preview on port 5173...")
    vite_proc = subprocess.Popen(
        ["npx.cmd" if sys.platform == "win32" else "npx", "vite", "preview", "--port", "5173"],
        cwd=str(FRONTEND_DIR),
    )

    try:
        print("Waiting for API (http://127.0.0.1:8000/api/health)...")
        if not wait_for_url("http://127.0.0.1:8000/api/health"):
            raise RuntimeError("API failed to become ready.")

        print("Waiting for Frontend (http://localhost:5173)...")
        if not wait_for_url("http://localhost:5173"):
            raise RuntimeError("Frontend failed to become ready.")

        print("Both servers online! Running screenshot script...")
        cmd = [
            "node",
            str(_HERE / "take_screenshots.cjs"),
            "--base-url", "http://localhost:5173",
            "--out-dir", str(PROJECT_ROOT / "screenshots" / "v2"),
        ]
        res = subprocess.run(cmd, cwd=str(PROJECT_ROOT))
        if res.returncode != 0:
            sys.exit(res.returncode)

    finally:
        print("Cleaning up server processes...")
        try:
            vite_proc.terminate()
            vite_proc.wait(timeout=5)
        except Exception:
            vite_proc.kill()

        try:
            api_proc.terminate()
            api_proc.wait(timeout=5)
        except Exception:
            api_proc.kill()
        print("All processes terminated.")

if __name__ == "__main__":
    main()
