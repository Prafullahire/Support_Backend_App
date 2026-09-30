@echo off
cd /d "%~dp0"
echo Generating Prisma client...
call npx prisma generate
if errorlevel 1 exit /b 1
echo Pushing schema to database...
call npx prisma db push
if errorlevel 1 exit /b 1
echo Done. You can now run: npm run start:dev
pause
