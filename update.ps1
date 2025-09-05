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

# Function to process environment variable placeholders in file content
function Convert-EnvironmentVariables {
    param($Content)
    
    # Find all {env:VARIABLE_NAME} patterns and replace them
    $pattern = '\{env:([^}]+)\}'
    $envMatches = [regex]::Matches($Content, $pattern)
    
    foreach ($match in $envMatches) {
        $fullMatch = $match.Value  # e.g., "{env:STEAM_ID64}"
        $varName = $match.Groups[1].Value  # e.g., "STEAM_ID64"
        
        # Get the environment variable value
        $envValue = [Environment]::GetEnvironmentVariable($varName)
        
        if ($envValue) {
            $Content = $Content -replace [regex]::Escape($fullMatch), $envValue
            Write-Host "Replaced $fullMatch with actual value" -ForegroundColor Green
        }
        else {
            Write-Host "Warning: Environment variable $varName not set" -ForegroundColor Yellow
        }
    }
    
    return $Content
}

Write-Host "=== VRCX Custom Update Script ===" -ForegroundColor Cyan
Write-Host "Source Directory: $SourceDir" -ForegroundColor Gray
Write-Host "Target Directory: $TargetDir" -ForegroundColor Gray
Write-Host ""

# Change to source directory
Write-Host "Changing to source directory..." -ForegroundColor Yellow
Set-Location $SourceDir


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
        
        
        exit 1
    }
    
    # Push to GitHub
    Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Push failed. Stashing changes..." -ForegroundColor Red
        git stash push -m "Auto-stash after failed push at $timestamp"
        Write-Host "Changes stashed successfully." -ForegroundColor Yellow
        
        
        exit 1
    }
    
    Write-Host "Git operations completed successfully!" -ForegroundColor Green
    
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
    
    # Read source file content
    $content = Get-Content $sourceJs -Raw
    
    # Process environment variables
    $content = Convert-EnvironmentVariables $content
    
    # Write processed content to target file
    Set-Content $targetJs $content -NoNewline
    Write-Host "✓ $CustomJs copied and processed successfully" -ForegroundColor Green
}

# Copy custom.css
if (Test-Path $sourceCss) {
    $targetCss = Join-Path $TargetDir $CustomCss
    Write-Host "Copying $CustomCss..." -ForegroundColor Yellow
    Copy-Item $sourceCss $targetCss -Force
    Write-Host "✓ $CustomCss copied successfully" -ForegroundColor Green
}

# Copy config.js (if it exists)
$sourceConfigJs = Join-Path $SourceDir $ConfigJs
if (Test-Path $sourceConfigJs) {
    $targetConfigJs = Join-Path $TargetDir $ConfigJs
    Write-Host "Copying $ConfigJs..." -ForegroundColor Yellow
    
    # Read source file content
    $content = Get-Content $sourceConfigJs -Raw
    
    # Process environment variables
    $content = Convert-EnvironmentVariables $content
    
    # Write processed content to target file
    Set-Content $targetConfigJs $content -NoNewline
    Write-Host "✓ $ConfigJs copied and processed successfully" -ForegroundColor Green
}

Write-Host "File copy operations completed successfully!" -ForegroundColor Green

Write-Host ""
Write-Host "=== Script Completed ===" -ForegroundColor Cyan
Write-Host "All operations finished successfully!" -ForegroundColor Green

# Return to original directory
Set-Location $SourceDir
