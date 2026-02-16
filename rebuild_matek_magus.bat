@echo off
setlocal

REM --- Mappa beallitasa, hogy csak itt dolgozzon ---
cd /d "C:\CORE\matekMagus" || goto :cd_error

echo [matekMagus] node_modules torlese...
if exist "node_modules" (
    rmdir /s /q "node_modules"
    echo [matekMagus] node_modules torolve.
) else (
    echo [matekMagus] node_modules nem letezik, lepes kihagyva.
)

echo.
echo [matekMagus] npm install fut...
call npm install
if errorlevel 1 (
    echo.
    echo [matekMagus] Hiba az npm install alatt. Leallok.
    goto :end
)

echo.
echo [matekMagus] npm start indul...
call npm start

goto :end

:cd_error
echo Nem sikerult a C:\CORE\matekMagus mappaba leptetni.

:end
endlocal
