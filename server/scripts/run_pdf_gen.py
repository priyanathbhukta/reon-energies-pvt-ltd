#!/usr/bin/env python3
"""
run_pdf_gen.py — Thin bridge between Node.js and pdf_generator.py.
Node calls:  python3 run_pdf_gen.py --output /path/to/output.pdf
Data is passed via the REON_QUOTE_JSON environment variable (JSON string).
"""
import os
import sys
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
