@echo off
rem Start DevBhumi on http:// (computer and phone on the same Wi-Fi).
cd /d "%~dp0"
if not exist devbhumi_v09.db python seed.py devbhumi_v09.db
python -m uvicorn app:app --host 0.0.0.0 --port 8000
pause
