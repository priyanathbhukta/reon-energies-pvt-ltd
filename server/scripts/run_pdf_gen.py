#!/usr/bin/env python3
"""
run_pdf_gen.py — Thin bridge between Node.js and pdf_generator.py.
Node calls:  python3 run_pdf_gen.py --output /path/to/output.pdf
Data is passed via the REON_QUOTE_JSON environment variable (JSON string).
"""
import os
import sys
import subprocess

# ── Bootstrap: auto-install missing PDF dependencies ─────────────────────────
# This ensures reportlab/pypdf/Pillow are always available even if pip install
# was never run during the Render build phase.
_REQUIRED = [
    ("reportlab", "reportlab>=4.2.0,<5.0"),
    ("pypdf",     "pypdf>=4.0.0,<5.0"),
    ("PIL",       "Pillow>=10.0.0,<12.0"),
]

def _ensure_deps():
    missing = []
    for mod, pkg in _REQUIRED:
        try:
            __import__(mod)
        except ImportError:
            missing.append(pkg)
    if missing:
        print(f"[run_pdf_gen] Installing missing packages: {missing}", file=sys.stderr)
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "--no-cache-dir"] + missing,
            stdout=subprocess.DEVNULL,
            stderr=sys.stderr,
        )
        print("[run_pdf_gen] Packages installed successfully.", file=sys.stderr)

_ensure_deps()
# ─────────────────────────────────────────────────────────────────────────────

import json
import argparse

# Add the services directory to the path so we can import pdf_generator
sys.path.insert(0, os.path.dirname(__file__))
from pdf_generator import generate_quotation


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True, help='Output PDF path')
    args = parser.parse_args()

    raw_json = os.environ.get('REON_QUOTE_JSON', '{}')
    try:
        data = json.loads(raw_json)
    except json.JSONDecodeError as e:
        print(f'ERROR: Invalid JSON: {e}', file=sys.stderr)
        sys.exit(1)

    try:
        out = generate_quotation(data, args.output)
        print(f'OK: {out}')
    except Exception as e:
        print(f'ERROR: {e}', file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
