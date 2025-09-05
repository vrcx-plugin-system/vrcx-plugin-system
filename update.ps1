# VRCX Custom Update Script
# This script switches to main branch, adds, commits, and pushes changes to GitHub, then copies custom files to AppData

# No parameters needed - script runs automatically

# Set error action preference
$ErrorActionPreference = "Stop"

# Define paths
$SourceDir = "P:\Visual Studio\source\repos\VRCX\vrcx-custom"
$TargetDir = "P:\Visual Studio\source\repos\VRCX\AppData"
$CustomJs = "custom.js"
$CustomCss = "custom.css"
$ConfigJs = "js\config.js"

# Environment variable backup
$envVarsBackup = @{}

# Function to check and backup environment variables
function Backup-EnvironmentVariables {
    param($FilePath)
    
    if (-not (Test-Path $FilePath)) {
        return $false
    }
    
    $content = Get-Content $FilePath -Raw
    $hasEnvVars = $false
    
    # Check for STEAM_ID64 environment variable
    if ($content -match 'id:\s*["'']?\$env:STEAM_ID64["'']?') {
        $envVarsBackup['STEAM_ID64'] = $matches[0]
        $hasEnvVars = $true
        Write-Host "Found STEAM_ID64 environment variable" -ForegroundColor Yellow
    }
    
    # Check for STEAM_APIKEY environment variable  
    if ($content -match 'key:\s*["'']?\$env:STEAM_APIKEY["'']?') {
        $envVarsBackup['STEAM_APIKEY'] = $matches[0]
        $hasEnvVars = $true
        Write-Host "Found STEAM_APIKEY environment variable" -ForegroundColor Yellow
    }
    
    return $hasEnvVars
}

# Function to remove environment variables
function Remove-EnvironmentVariables {
    param($FilePath)
    
    if (-not (Test-Path $FilePath)) {
        return
    }
    
    $content = Get-Content $FilePath -Raw
    
    # Remove STEAM_ID64 environment variable
    $content = $content -replace 'id:\s*["'']?\$env:STEAM_ID64["'']?', 'id: ""'
    
    # Remove STEAM_APIKEY environment variable
    $content = $content -replace 'key:\s*["'']?\$env:STEAM_APIKEY["'']?', 'key: ""'
    
    Set-Content $FilePath $content -NoNewline
    Write-Host "Removed environment variables from $FilePath" -ForegroundColor Yellow
}

# Function to restore environment variables
function Restore-EnvironmentVariables {
    param($FilePath)
    
    if (-not (Test-Path $FilePath) -or $envVarsBackup.Count -eq 0) {
        return
    }
    
    $content = Get-Content $FilePath -Raw
    
    # Restore STEAM_ID64 if it was backed up
    if ($envVarsBackup.ContainsKey('STEAM_ID64')) {
        $content = $content -replace 'id:\s*""', $envVarsBackup['STEAM_ID64']
    }
    
    # Restore STEAM_APIKEY if it was backed up
    if ($envVarsBackup.ContainsKey('STEAM_APIKEY')) {
        $content = $content -replace 'key:\s*""', $envVarsBackup['STEAM_APIKEY']
    }
    
    Set-Content $FilePath $content -NoNewline
    Write-Host "Restored environment variables to $FilePath" -ForegroundColor Green
}

Write-Host "=== VRCX Custom Update Script ===" -ForegroundColor Cyan
Write-Host "Source Directory: $SourceDir" -ForegroundColor Gray
Write-Host "Target Directory: $TargetDir" -ForegroundColor Gray
Write-Host ""

# Change to source directory
Write-Host "Changing to source directory..." -ForegroundColor Yellow
Set-Location $SourceDir

# Environment variable handling
Write-Host "=== Environment Variable Check ===" -ForegroundColor Cyan

# Check for environment variables in custom.js and config.js
$customJsPath = Join-Path $SourceDir $CustomJs
$configJsPath = Join-Path $SourceDir $ConfigJs

$hasEnvVars = $false
if (Backup-EnvironmentVariables $customJsPath) {
    $hasEnvVars = $true
}
if (Backup-EnvironmentVariables $configJsPath) {
    $hasEnvVars = $true
}

if ($hasEnvVars) {
    Write-Host "Environment variables detected. Will remove before commit and restore after push." -ForegroundColor Yellow
    Remove-EnvironmentVariables $customJsPath
    Remove-EnvironmentVariables $configJsPath
}
else {
    Write-Host "No environment variables found." -ForegroundColor Green
}

# Git operations
Write-Host "=== Git Operations ===" -ForegroundColor Cyan

# Check if we're in a git repository
try {
    git status --porcelain 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Not a git repository or git not available"
    }
}
catch {
    Write-Host "Error: Not in a git repository or git is not available" -ForegroundColor Red
    Write-Host "Exiting..." -ForegroundColor Yellow
    exit 1
}

# Switch to main branch
Write-Host "Switching to main branch..." -ForegroundColor Yellow
git checkout main

# Check for changes
$changes = git status --porcelain
if ([string]::IsNullOrWhiteSpace($changes)) {
    Write-Host "No changes detected. Nothing to commit." -ForegroundColor Yellow
}
else {
    Write-Host "Changes detected:" -ForegroundColor Green
    git status --short
    
    # Add all changes
    Write-Host "Adding all changes..." -ForegroundColor Yellow
    git add .
    
    # Generate commit message
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $CommitMessage = "Update at $timestamp"
    
    # Commit changes
    Write-Host "Committing changes..." -ForegroundColor Yellow
    git commit -m $CommitMessage
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Commit failed. Stashing changes..." -ForegroundColor Red
        git stash push -m "Auto-stash after failed commit at $timestamp"
        Write-Host "Changes stashed successfully." -ForegroundColor Yellow
        
        # Restore environment variables even if commit failed
        if ($hasEnvVars) {
            Write-Host "Restoring environment variables after failed commit..." -ForegroundColor Yellow
            Restore-EnvironmentVariables $customJsPath
            Restore-EnvironmentVariables $configJsPath
            Write-Host "Environment variables restored successfully!" -ForegroundColor Green
        }
        
        exit 1
    }
    
    # Push to GitHub
    Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Push failed. Stashing changes..." -ForegroundColor Red
        git stash push -m "Auto-stash after failed push at $timestamp"
        Write-Host "Changes stashed successfully." -ForegroundColor Yellow
        
        # Restore environment variables even if push failed
        if ($hasEnvVars) {
            Write-Host "Restoring environment variables after failed push..." -ForegroundColor Yellow
            Restore-EnvironmentVariables $customJsPath
            Restore-EnvironmentVariables $configJsPath
            Write-Host "Environment variables restored successfully!" -ForegroundColor Green
        }
        
        exit 1
    }
    
    Write-Host "Git operations completed successfully!" -ForegroundColor Green
    
    # Restore environment variables after successful push
    if ($hasEnvVars) {
        Write-Host "Restoring environment variables..." -ForegroundColor Yellow
        Restore-EnvironmentVariables $customJsPath
        Restore-EnvironmentVariables $configJsPath
        Write-Host "Environment variables restored successfully!" -ForegroundColor Green
    }
}

# File copying operations
Write-Host ""
Write-Host "=== File Copy Operations ===" -ForegroundColor Cyan

# Check if source files exist
$sourceJs = Join-Path $SourceDir $CustomJs
$sourceCss = Join-Path $SourceDir $CustomCss

if (-not (Test-Path $sourceJs)) {
    Write-Host "Warning: $CustomJs not found in source directory" -ForegroundColor Yellow
}

if (-not (Test-Path $sourceCss)) {
    Write-Host "Warning: $CustomCss not found in source directory" -ForegroundColor Yellow
}

# Check if target directory exists
if (-not (Test-Path $TargetDir)) {
    Write-Host "Error: Target directory $TargetDir does not exist" -ForegroundColor Red
    exit 1
}

# Copy custom.js
if (Test-Path $sourceJs) {
    $targetJs = Join-Path $TargetDir $CustomJs
    Write-Host "Copying $CustomJs..." -ForegroundColor Yellow
    Copy-Item $sourceJs $targetJs -Force
    Write-Host "✓ $CustomJs copied successfully" -ForegroundColor Green
}

# Copy custom.css
if (Test-Path $sourceCss) {
    $targetCss = Join-Path $TargetDir $CustomCss
    Write-Host "Copying $CustomCss..." -ForegroundColor Yellow
    Copy-Item $sourceCss $targetCss -Force
    Write-Host "✓ $CustomCss copied successfully" -ForegroundColor Green
}

Write-Host "File copy operations completed successfully!" -ForegroundColor Green

Write-Host ""
Write-Host "=== Script Completed ===" -ForegroundColor Cyan
Write-Host "All operations finished successfully!" -ForegroundColor Green

# Return to original directory
Set-Location $SourceDir
