@echo off
REM Runs the packaged application on http://localhost:8080.
REM It reads backend\db.properties for the database connection.
setlocal
set "ROOT=%~dp0.."
call "%~dp0java-home.cmd" || exit /b 1
if not exist "%ROOT%\backend\target\share-market-portfolio.jar" (
  echo The jar is missing. Run scripts\build.cmd first.
  exit /b 1
)
pushd "%ROOT%\backend"
"%JAVA_HOME%\bin\java.exe" -jar target\share-market-portfolio.jar
popd
