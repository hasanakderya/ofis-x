@echo off
title OFIS-X Sunucu
color 0A
echo.
echo  ==========================================
echo   OFIS-X - Yerel Sunucu Baslatiliyor...
echo  ==========================================
echo.

cd /d "%~dp0"

python --version 2>nul
if errorlevel 0 goto python
echo [HATA] Python bulunamadi!
pause
exit

:python
echo [OK] Python bulundu. Sunucu baslatiliyor...
echo Adres: http://localhost:8080
python -m http.server 8080
