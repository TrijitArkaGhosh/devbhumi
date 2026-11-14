@echo off
rem Start DevBhumi on https:// so the live camera works on phones (testing on your own Wi-Fi).
cd /d "%~dp0"
python make_cert.py || (pause & exit /b 1)
if not exist devbhumi_v09.db python seed.py devbhumi_v09.db
python -m uvicorn app:app --host 0.0.0.0 --port 8443 --ssl-keyfile dev_cert\key.pem --ssl-certfile dev_cert\cert.pem
pause
