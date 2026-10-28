@echo off
REM Makes sure JAVA_HOME points at a JDK 17 or newer. If it is not set,
REM the newest JDK under "C:\Program Files\Java" is used.
if defined JAVA_HOME if exist "%JAVA_HOME%\bin\javac.exe" goto :check
for /d %%D in ("C:\Program Files\Java\jdk-*") do set "JAVA_HOME=%%D"
if not defined JAVA_HOME (
  echo No JDK found. Install JDK 17 or newer and set JAVA_HOME.
  exit /b 1
)
:check
"%JAVA_HOME%\bin\java.exe" -version 2>&1 | findstr /r /c:"version .1\.[0-8]\." >nul && (
  echo JAVA_HOME points at Java 8. Set it to a JDK 17 or newer.
  exit /b 1
)
exit /b 0
