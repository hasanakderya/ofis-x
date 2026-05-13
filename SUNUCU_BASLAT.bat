@echo off
chcp 65001 > nul
echo Yonetici yetkisi ile calistiriliyor...

REM Yonetici yetkisi kontrolu
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Bu dosyayi SAG TIKLAYIP "Yonetici olarak calistir" secenegiyle acin!
    pause
    exit
)

REM Firewall kurali ekle
netsh advfirewall firewall add rule name="Ofis Takip Port 3000" protocol=TCP dir=in localport=3000 action=allow > nul 2>&1
echo Firewall kurali eklendi.

REM IP adresini bul
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr "192\."') do set IP=%%a
set IP=%IP: =%

echo.
echo ╔══════════════════════════════════════════════╗
echo ║   OFİS GİRİŞ-ÇIKIŞ TAKİP - SUNUCU          ║
echo ╚══════════════════════════════════════════════╝
echo.
echo  Tablet/Telefon adresi (ayni WiFide):
echo  http://%IP%:3000
echo.
echo  Bilgisayar adresi:
echo  http://localhost:3000
echo.
echo  Kapatmak icin bu pencereyi kapatin.
echo.

timeout /t 2 /nobreak > nul
start http://localhost:3000

npx serve "C:\Users\Asbil\ofis-giris-cikis" -l 3000 --no-clipboard

pause
