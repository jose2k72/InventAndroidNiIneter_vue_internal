@echo off
set "JAVA_HOME=C:\Program Files\Java\jdk-17"
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo Using JAVA_HOME for this build: %JAVA_HOME%
java -version
call gradlew.bat assembleDebug
pause
