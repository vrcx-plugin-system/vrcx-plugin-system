# VRCX Custom Update Script
# This script adds, commits, and pushes changes to GitHub, then copies custom files to AppData

param(
    [string]$CommitMessage = "",
    [switch]$SkipGit = $false,
    [switch]$SkipCopy = $false,
    [switch]$Backup = $false
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Define paths
$SourceDir = "P:\Visual Studio\source\repos\VRCX\vrcx-custom"
$TargetDir = "P:\Visual Studio\source\repos\VRCX\AppData"
$CustomJs = "custom.js"
$CustomCss = "custom.css"

Write-Host "=== VRCX Custom Update Script ===" -ForegroundColor Cyan
Write-Host "Source Directory: $SourceDir" -ForegroundColor Gray
Write-Host "Target Directory: $TargetDir" -ForegroundColor Gray
Write-Host ""

# Change to source directory
Write-Host "Changing to source directory..." -ForegroundColor Yellow
Set-Location $SourceDir

# Git operations
if (-not $SkipGit) {
    Write-Host "=== Git Operations ===" -ForegroundColor Cyan
    
    # Check if we're in a git repository
    try {
        $gitStatus = git status --porcelain 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Not a git repository or git not available"
        }
    }
    catch {
        Write-Host "Error: Not in a git repository or git is not available" -ForegroundColor Red
        Write-Host "Skipping git operations..." -ForegroundColor Yellow
        $SkipGit = $true
    }
    
    if (-not $SkipGit) {
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
            
            # Generate commit message if not provided
            if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
                $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                $CommitMessage = "Update VRCX custom files

• Updated custom.js and custom.css
• Timestamp: $timestamp
• Automated commit from update script"
            }
            
            # Commit changes
            Write-Host "Committing changes..." -ForegroundColor Yellow
            git commit -m $CommitMessage
            
            # Push to GitHub
            Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
            git push origin ai
            
            Write-Host "Git operations completed successfully!" -ForegroundColor Green
        }
    }
}

# File copying operations
if (-not $SkipCopy) {
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
        
        # Create backup if target exists and -Backup is specified
        if ($Backup -and (Test-Path $targetJs)) {
            $backupJs = "$targetJs.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
            Copy-Item $targetJs $backupJs
            Write-Host "Created backup: $backupJs" -ForegroundColor Gray
        }
        
        Copy-Item $sourceJs $targetJs -Force
        Write-Host "✓ $CustomJs copied successfully" -ForegroundColor Green
    }
    
    # Copy custom.css
    if (Test-Path $sourceCss) {
        $targetCss = Join-Path $TargetDir $CustomCss
        Write-Host "Copying $CustomCss..." -ForegroundColor Yellow
        
        # Create backup if target exists and -Backup is specified
        if ($Backup -and (Test-Path $targetCss)) {
            $backupCss = "$targetCss.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
            Copy-Item $targetCss $backupCss
            Write-Host "Created backup: $backupCss" -ForegroundColor Gray
        }
        
        Copy-Item $sourceCss $targetCss -Force
        Write-Host "✓ $CustomCss copied successfully" -ForegroundColor Green
    }
    
    Write-Host "File copy operations completed successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Script Completed ===" -ForegroundColor Cyan
Write-Host "All operations finished successfully!" -ForegroundColor Green

# Return to original directory
Set-Location $SourceDir
