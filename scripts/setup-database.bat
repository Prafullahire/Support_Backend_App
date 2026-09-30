@echo off
echo ========================================
echo  Support Team DB Setup
echo ========================================
echo.

cd /d "%~dp0.."

echo Step 1: Creating database support_team_db...
mysql -u root -pPassword -e "CREATE DATABASE IF NOT EXISTS support_team_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if errorlevel 1 (
    echo.
    echo ERROR: Could not connect to MySQL.
    echo Please ensure MySQL is running and password is correct in backend\.env
    echo.
    echo Or run this SQL manually in MySQL Workbench:
    echo   CREATE DATABASE IF NOT EXISTS support_team_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    pause
    exit /b 1
)
echo Database created.

echo.
echo Step 2: Generating Prisma client...
call npx prisma generate

echo.
echo Step 3: Creating all tables...
call npx prisma db push

echo.
echo Step 4: Seeding sample data...
call npm run prisma:seed

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo  Database: support_team_db
echo  Admin:    admin@support.com / Admin@123
echo  Employee: employee@support.com / Employee@123
echo ========================================
pause
