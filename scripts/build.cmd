@echo off
REM Builds the React UI into the backend, then packages one runnable jar:
REM backend\target\share-market-portfolio.jar
setlocal
set "ROOT=%~dp0.."
call "%~dp0java-home.cmd" || exit /b 1

echo [1/2] Building the web UI ...
pushd "%ROOT%\frontend"
if not exist node_modules call npm install --no-audit --no-fund || (popd & exit /b 1)
call npm run build || (popd & exit /b 1)
popd

echo [2/2] Packaging the Spring Boot jar (tests included) ...
pushd "%ROOT%\backend"
call mvnw.cmd -B package || (popd & exit /b 1)
popd

echo.
echo Done. Start it with scripts\run.cmd and open http://localhost:8080
