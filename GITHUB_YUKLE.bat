# GitHub Pages Deploy Script
# Bu script OFIS-X'i GitHub Pages'e yukler

Write-Host "=== OFIS-X GitHub Pages Yukleme ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "ADIM 1: GitHub'da yeni repo olustur" -ForegroundColor Yellow
Write-Host "   1. github.com -> Sign in"
Write-Host "   2. + -> New repository"
Write-Host "   3. Name: ofis-x"
Write-Host "   4. Public sec"
Write-Host "   5. Create repository"
Write-Host ""
Write-Host "ADIM 2: Bu klasoru Git ile ilkle" -ForegroundColor Yellow
Write-Host ""

$gitPath = "C:\ofis-giris-cikis"

# Git kurulu mu?
$git = Get-Command git -ErrorAction SilentlyContinue
if (!$git) {
    Write-Host "Git kurulu degil! Oncelikle Git'i kur: https://git-scm.com" -ForegroundColor Red
    exit
}

# .gitignore olustur
@"
node_modules/
.DS_Store
*.log
"@ | Out-File "$gitPath\.gitignore" -Encoding UTF8

# Git init
Set-Location $gitPath
git init
git add .
git commit -m "OFIS-X ilk yukleme"

Write-Host ""
Write-Host "ADIM 3: GitHub'a push et" -ForegroundColor Yellow
Write-Host "   Asagidaki komutlari terminalde calistir:" -ForegroundColor White
Write-Host ""
Write-Host "git remote add origin https://github.com/TAYKULLANICI/ofis-x.git"
Write-Host "git branch -M main"
Write-Host "git push -u origin main"
Write-Host ""
Write-Host "ADIM 4: GitHub Pages etkinlestir" -ForegroundColor Yellow
Write-Host "   1. Repo -> Settings -> Pages"
Write-Host "   2. Source: Deploy from a branch"
Write-Host "   3. Branch: main -> / (root)"
Write-Host "   4. Save"
Write-Host ""
Write-Host "ADIM 5: Erisim" -ForegroundColor Cyan
Write-Host "   https://TAYKULLANICI.github.io/ofis-x" -ForegroundColor Green
