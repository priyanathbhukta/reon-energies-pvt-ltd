#!/usr/bin/env bash
# exit on errors
set -o errexit

echo "Upgrading pip..."
pip3 install --upgrade pip

echo "Installing Python dependencies (pinned versions for stability)..."
# reportlab: PDF generation engine
# pypdf: PDF merging/reading
# Pillow: image processing for cover page
pip3 install --no-cache-dir \
  "reportlab>=4.2.0,<5.0" \
  "pypdf>=4.0.0,<5.0" \
  "Pillow>=10.0.0,<12.0"

echo "Verifying Python deps..."
python3 -c "import reportlab, pypdf, PIL; print('✅ Python deps OK')"

echo "Installing Node dependencies..."
npm install
