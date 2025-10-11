# VRCX Custom Update Script
# This script switches to main branch, adds, commits, and pushes changes to GitHub, then copies custom files to AppData

# No parameters needed - script runs automatically

# Set error action preference
$ErrorActionPreference = "Stop"

# Define paths
$SourceDir = "P:\Visual Studio\source\repos\VRCX\vrcx-custom"
$TargetDir = "$env:APPDATA\VRCX"
$CustomJs = "custom.js"
$CustomCss = "custom.css"

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

# Function to get git commit count for version
function Get-GitCommitCount {
    try {
        $commitCount = git rev-list --count HEAD 2>$null
        if ($LASTEXITCODE -eq 0 -and $commitCount) {
            return $commitCount.Trim()
        }
    }
    catch {
        # Ignore errors
    }
    return "unknown"
}

# Function to process build timestamp placeholders
function Convert-BuildTimestamps {
    param(
        [string]$Content,
        [string]$FilePath
    )
    
    # Extract filename from FilePath for determining git path
    $fileName = Split-Path $FilePath -Leaf
    $isInJsDir = $FilePath -match '[\\/]js[\\/]'
    
    # Determine the relative git path for this file
    $gitPath = if ($isInJsDir) { "js/$fileName" } else { $fileName }
    
    # Replace {VERSION} with commit count for this specific file
    if ($Content -match '\{VERSION\}') {
        try {
            $commitCount = git rev-list --count HEAD -- $gitPath 2>$null
            if ($LASTEXITCODE -eq 0 -and $commitCount) {
                $commitCount = $commitCount.Trim()
                $Content = $Content -replace '\{VERSION\}', $commitCount
                Write-Host "  Replaced {VERSION} with $commitCount commits for $gitPath" -ForegroundColor Cyan
            }
            else {
                Write-Host "  Warning: Could not get commit count for $gitPath" -ForegroundColor Yellow
                $Content = $Content -replace '\{VERSION\}', "0"
            }
        }
        catch {
            Write-Host "  Warning: Error getting commit count for $gitPath" -ForegroundColor Yellow
            $Content = $Content -replace '\{VERSION\}', "0"
        }
    }
    
    # Replace {BUILD} with file's last modification timestamp
    if ($Content -match '\{BUILD\}') {
        $lastWrite = (Get-Item $FilePath).LastWriteTime
        $unixEpoch = [DateTime]::new(1970, 1, 1, 0, 0, 0, [DateTimeKind]::Utc)
        $unixTimestamp = [Math]::Floor(($lastWrite.ToUniversalTime() - $unixEpoch).TotalSeconds)
        
        $Content = $Content -replace '\{BUILD\}', $unixTimestamp
        Write-Host "  Replaced {BUILD} with $unixTimestamp ($lastWrite)" -ForegroundColor Cyan
    }
    
    return $Content
}

function Get-UnixTime {
    return [Math]::Floor((New-TimeSpan -Start (Get-Date "01/01/1970") -End (Get-Date)).TotalSeconds)
}

Write-Host "=== VRCX Custom Update Script ===" -ForegroundColor Cyan
Write-Host "Unix Time: $(Get-UnixTime)" -ForegroundColor Gray
Write-Host "Source Directory: $SourceDir" -ForegroundColor Gray
Write-Host "Target Directory: $TargetDir" -ForegroundColor Gray

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

# Clear logs directory
$logsDir = Join-Path $TargetDir "logs"
if (Test-Path $logsDir) {
    Write-Host "Clearing logs directory..." -ForegroundColor Yellow
    try {
        Get-ChildItem $logsDir -Filter "*.log" | Remove-Item -Force -ErrorAction Stop
        Write-Host "✓ Logs cleared successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠ Failed to clear some logs (may be in use): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

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
    
    # Process build timestamps
    $content = Convert-BuildTimestamps $content $sourceJs
    
    # Process environment variables
    $content = Convert-EnvironmentVariables $content
    
    # Try to write to target file with error handling
    try {
        Set-Content $targetJs $content -NoNewline
        Write-Host "✓ $CustomJs copied and processed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠ Failed to write $CustomJs directly: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "The file may be in use by VRCX. Trying alternative approach..." -ForegroundColor Yellow
        
        # Try using a temporary file and then moving it
        $tempFile = "$targetJs.tmp"
        try {
            Set-Content $tempFile $content -NoNewline
            Move-Item $tempFile $targetJs -Force
            Write-Host "✓ $CustomJs copied and processed successfully (via temp file)" -ForegroundColor Green
        }
        catch {
            Write-Host "⚠ Still unable to update $CustomJs. Please close VRCX and try again." -ForegroundColor Red
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
            
            # Clean up temp file if it exists
            if (Test-Path $tempFile) {
                Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# Copy custom.css
if (Test-Path $sourceCss) {
    $targetCss = Join-Path $TargetDir $CustomCss
    Write-Host "Copying $CustomCss..." -ForegroundColor Yellow
    Copy-Item $sourceCss $targetCss -Force
    Write-Host "✓ $CustomCss copied successfully" -ForegroundColor Green
}


Write-Host "File copy operations completed successfully!" -ForegroundColor Green

# # Verify GitHub deployment
# Write-Host ""
# Write-Host "=== Verifying GitHub Deployment ===" -ForegroundColor Cyan
# try {
#     $githubUrl = "https://raw.githubusercontent.com/Bluscream/vrcx-custom/main/custom.js"
#     Write-Host "Fetching from GitHub: $githubUrl" -ForegroundColor Yellow
#     $response = Invoke-WebRequest -Uri $githubUrl -UseBasicParsing -ErrorAction Stop
#     $lines = $response.Content -split "`n"
#     if ($lines.Length -ge 2) {
#         Write-Host "✓ GitHub custom.js second line:" -ForegroundColor Green
#         Write-Host "  $($lines[1])" -ForegroundColor Cyan
#     }
#     else {
#         Write-Host "⚠ File has fewer than 2 lines" -ForegroundColor Yellow
#     }
# }
# catch {
#     Write-Host "✗ Failed to fetch from GitHub: $($_.Exception.Message)" -ForegroundColor Red
# }

Write-Host ""
Write-Host "=== Script Completed ===" -ForegroundColor Cyan
Write-Host "All operations finished successfully!" -ForegroundColor Green
Write-Host ""

# Return to original directory
Set-Location $SourceDir
