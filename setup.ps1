<#
.SYNOPSIS
Vulnerable NestJS Shop - Setup Script (PowerShell Edition)
This script sets up an intentionally vulnerable application for ethical security education.

.DESCRIPTION
This is a translation of a Bash setup script for Windows using PowerShell.
It checks prerequisites (Node.js, npm), installs dependencies, sets up the database,
and creates test files for vulnerability practice.

.NOTES
WARNING: This application contains intentional security vulnerabilities!
DO NOT use in production or deploy to public environments!
For educational purposes only!
#>

# Define output colors (PowerShell equivalents)
$Host.UI.RawUI.WindowTitle = "Vulnerable NestJS Shop Setup"
$RED = "`e[31m"
$GREEN = "`e[32m"
$YELLOW = "`e[33m"
$NC = "`e[0m" # No Color (reset)

# --- Configuration ---
$NodeRequiredVersion = 18

# --- Functions ---

# Function to print status
function Print-Status {
    param([string]$Message)
    Write-Host -ForegroundColor Green "[INFO]" -NoNewline
    Write-Host " $Message"
}

# Function to print warning
function Print-Warning {
    param([string]$Message)
    Write-Host -ForegroundColor Yellow "[WARNING]" -NoNewline
    Write-Host " $Message"
}

# Function to print error and exit
function Print-Error {
    param([string]$Message)
    Write-Host -ForegroundColor Red "[ERROR]" -NoNewline
    Write-Host " $Message"
    Exit 1
}

# Function to check if a command/executable exists in the PATH
function Test-CommandExist {
    param([string]$Command)
    (Get-Command $Command -ErrorAction SilentlyContinue) -ne $null
}

# --- Main Script Execution ---

Write-Host "🔴 VULNERABLE NESTJS SHOP SETUP 🔴" -ForegroundColor Red
Write-Host "=================================="
Write-Host ""
Print-Warning "This application contains intentional security vulnerabilities!"
Print-Warning "DO NOT use in production or deploy to public environments!"
Print-Warning "For educational purposes only!"
Write-Host ""

## Check prerequisites
Print-Status "Checking prerequisites..."

# Check Node.js
if (-not (Test-CommandExist node)) {
    Print-Error "Node.js is not installed. Please install Node.js $NodeRequiredVersion+ from https://nodejs.org/"
}

$NodeVersionOutput = (node -v).Trim()
# Extract major version number (e.g., 'v18.17.1' -> '18')
$NODE_VERSION = ($NodeVersionOutput -replace '[v.]',' ' | Select -First 1).Trim().Split(' ')[0]

if ([int]$NODE_VERSION -lt $NodeRequiredVersion) {
    Print-Warning "Node.js version is $NODE_VERSION. Recommended version is $NodeRequiredVersion+."
}

# Check npm
if (-not (Test-CommandExist npm)) {
    Print-Error "npm is not installed. Please install npm (usually included with Node.js)."
}

Print-Status "Node.js and npm are available"

# Check if Docker is available (optional)
$DOCKER_AVAILABLE = $false
if (Test-CommandExist docker) {
    Print-Status "Docker is available for containerized testing"
    $DOCKER_AVAILABLE = $true
} else {
    Print-Warning "Docker not found. You can still run the app locally, but containerized testing won't be available."
}

Write-Host ""
Write-Host "🚀 Setting up Vulnerable NestJS Shop..."
Write-Host ""

## Install dependencies
Print-Status "Installing dependencies..."
npm install

if ($LASTEXITCODE -ne 0) {
    Print-Error "Failed to install dependencies (npm install failed). Check the output above."
}

## Create necessary directories
Print-Status "Creating directories..."
# -Force ensures directories are created if they don't exist
# PowerShell's mkdir equivalent is New-Item -ItemType Directory
New-Item -ItemType Directory -Force -Path '.\uploads', '.\logs', '.\config', '.\backups' | Out-Null

# Intentionally insecure permissions (equivalent for Windows - setting permissions is complex in vanilla PS,
# but we can simulate the intent with a comment and by ensuring basic access).
# For full parity, one would use ICACLS, but for an educational script,
# relying on default Windows permissions being permissive for the local user is often sufficient.
Print-Warning "Directory permissions are intentionally insecure for testing."

## Generate Prisma client
Print-Status "Generating Prisma client..."
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Print-Error "Failed to generate Prisma client."
}

## Setup database
Print-Status "Setting up database..."
# The Bash script had `npx prisma db push --accept-data-loss`. We use `&` to run npx.
npx prisma db push --accept-data-loss

if ($LASTEXITCODE -ne 0) {
    Print-Error "Failed to push database schema."
}

## Seed database with vulnerable data
Print-Status "Seeding database with test data (including weak passwords)..."
npm run prisma:seed

if ($LASTEXITCODE -ne 0) {
    Print-Error "Failed to seed database."
}

## Create some test files for upload testing
Print-Status "Creating test files for vulnerability testing..."

# Content for test.txt
"This is a test text file" | Out-File -FilePath '.\uploads\test.txt' -Encoding UTF8

# Content for test.sh (Note: This is a Windows script, so the '.sh' is for simulating a Linux/Unix environment file)
"#!/bin/bash`r`necho 'This would be dangerous in production'" | Out-File -FilePath '.\uploads\test.sh' -Encoding UTF8
# The chmod +x equivalent on Windows is often unnecessary or complex to simulate, but we note the intent.

# Create a fake sensitive file for testing directory traversal
"root:x:0:0:root:/root:/bin/bash" | Out-File -FilePath '.\uploads\fake_passwd' -Encoding UTF8
"admin:password123" | Out-File -FilePath '.\uploads\sensitive_config.txt' -Encoding UTF8

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 How to use this vulnerable application:"
Write-Host ""
Write-Host "1. 🎯 Local Development:"
Write-Host "    npm run start:dev"
Write-Host "    Access at: http://localhost:3000"
Write-Host "    Swagger docs: http://localhost:3000/api"
Write-Host ""

if ($DOCKER_AVAILABLE) {
Write-Host "2. 🐳 Docker Testing (Recommended for full vulnerability testing):"
Write-Host "    docker-compose up --build"
Write-Host "    Multiple services will be exposed on various ports"
Write-Host ""
}

Write-Host "3. 📖 Documentation:"
Write-Host "    README.md - Full documentation and testing examples"
Write-Host "    SECURITY.md - Detailed vulnerability reference"
Write-Host "    Postman collection - Vulnerable-Shop-API.postman_collection.json"
Write-Host ""
Write-Host "4. 🔑 Test Credentials:"
Write-Host "    Admin: admin@shop.com / password123"
Write-Host "    User 1: john@example.com / 123456"
Write-Host "    User 2: jane@example.com / qwerty"
Write-Host ""
Write-Host "⚠️  SECURITY REMINDERS:" -ForegroundColor Yellow
Print-Warning "This application is INTENTIONALLY VULNERABLE"
Print-Warning "Contains OWASP Top 10 vulnerabilities and more"
Print-Warning "DO NOT deploy to production environments"
Print-Warning "DO NOT expose to public networks"
Print-Warning "Use only in isolated, controlled environments"
Print-Warning "Designed for security education and training"
Write-Host ""
Write-Host "🎓 Learning Objectives:"
Write-Host "    • Understand common web application vulnerabilities"
Write-Host "    • Practice security testing techniques"
Write-Host "    • Learn secure coding practices by seeing what NOT to do"
Write-Host "    • Explore container security issues"
Write-Host ""
Write-Host "Happy (ethical) hacking! 🔓"
Write-Host ""

# Final security warning
Write-Host "==================================" -ForegroundColor Red
Write-Host "⚠️  FINAL WARNING ⚠️" -ForegroundColor Red
Write-Host "This software is intentionally vulnerable" -ForegroundColor Red
Write-Host "Use responsibly and ethically" -ForegroundColor Red
Write-Host "For educational purposes only" -ForegroundColor Red
Write-Host "==================================" -ForegroundColor Red