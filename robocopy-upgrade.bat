@echo off
:: ─────────────────────────────────────────────────────────────────────────────
:: robocopy-upgrade.bat
:: Installeert de upgrade pack (images + content engine) in je site.
:: Dubbelklik dit bestand OF run vanuit terminal in E:\2026_Github\
:: ─────────────────────────────────────────────────────────────────────────────

set SOURCE=E:\2026_Github\mrdoggostyle-images-v2\upgrade-pack
set TARGET=E:\2026_Github\mrdoggostyle_site

echo.
echo ============================================================
echo   🐾  MR. DOGGO STYLE — Image + Content Engine Install
echo ============================================================
echo   Source: %SOURCE%
echo   Target: %TARGET%
echo.

:: Check source exists
if not exist "%SOURCE%" (
  echo ERROR: Source map niet gevonden:
  echo   %SOURCE%
  echo.
  echo Unzip het ZIP bestand eerst naar E:\2026_Github\
  pause
  exit /b 1
)

:: Backup
echo [1/3] Backup maken van gewijzigde bestanden...
robocopy "%TARGET%\src\components" "%TARGET%\_backup\src\components" /E /COPY:DAT /NFL /NDL /NJH /NJS
robocopy "%TARGET%\src\pages" "%TARGET%\_backup\src\pages" /E /COPY:DAT /NFL /NDL /NJH /NJS
echo        Backup opgeslagen in: %TARGET%\_backup\
echo.

:: Copy upgrade files
echo [2/3] Nieuwe bestanden kopiëren...
robocopy "%SOURCE%" "%TARGET%" /E ^
  /XD node_modules .git dist .astro _backup ^
  /XF package-lock.json

echo.

:: Run content engine
echo [3/3] Content engine draaien (top 50 breeds × 4 categories)...
cd /d "%TARGET%"
node generate-content.mjs --type breed --top50

echo.
echo ============================================================
echo   ✅  Klaar! Volgende stap:
echo.
echo       npm install
echo       npm run dev
echo.
echo   Controleer:
echo       http://localhost:4321          (homepage met echte images)
echo       http://localhost:4321/breeds   (breed grid met fotos)
echo       http://localhost:4321/breeds/labrador-retriever
echo.
echo   Content engine later nogmaals draaien:
echo       node generate-content.mjs --top50
echo       node generate-content.mjs        (alle 277 breeds)
echo ============================================================
echo.
pause
