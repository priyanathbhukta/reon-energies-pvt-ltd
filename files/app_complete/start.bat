@echo off
echo Starting Quotation Generator...

start cmd /k "cd backend && node app.js"
start cmd /k "cd frontend && npm run dev"

echo Backend and Frontend are starting.
echo Please open http://localhost:5173 in your browser.
