@echo off
REM Starts a private MySQL 8.0 instance for development on port 3307.
REM Data lives in .localdb\data inside the project, so your own MySQL80
REM service and its password are never touched. root has no password here.
setlocal
set "MYSQL_HOME=C:\Program Files\MySQL\MySQL Server 8.0"
if not "%MYSQL_BASEDIR%"=="" set "MYSQL_HOME=%MYSQL_BASEDIR%"
set "ROOT=%~dp0.."
set "DATA=%ROOT%\.localdb\data"

if not exist "%DATA%\mysql" (
  echo Initialising a new data directory in %DATA% ...
  mkdir "%ROOT%\.localdb" 2>nul
  "%MYSQL_HOME%\bin\mysqld.exe" --no-defaults --initialize-insecure --basedir="%MYSQL_HOME%" --datadir="%DATA%"
  if errorlevel 1 exit /b 1
)

echo Starting MySQL on port 3307 (Ctrl+C to stop) ...
"%MYSQL_HOME%\bin\mysqld.exe" --no-defaults --basedir="%MYSQL_HOME%" --datadir="%DATA%" --port=3307 --mysqlx=OFF --console
