#!/usr/bin/env bash
# exit on errors
set -o errexit

echo "Installing Python dependencies (reportlab pypdf pillow)..."
pip3 install reportlab pypdf pillow

echo "Installing Node dependencies..."
npm install
