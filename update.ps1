# VRCX Plugin System Update Script
# This script builds the TypeScript project and copies the bundled file to VRCX

# Set error action preference
$ErrorActionPreference = "Stop"

# Define paths - update these to match your setup
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TargetDir = "$env:APPDATA\VRCX"
$BundledFile = "custom.js"
$Branch = "main"

function Get-UnixTime {
    return [Math]::Floor((New-TimeSpan -Start (Get-Date "01/01/1970") -End (Get-Date)).TotalSeconds)
}

$unixTime = Get-UnixTime

function Commit-AndPushChanges {
    param(
        [string]$RepositoryPath,
        [string]$CommitMessage,
        [string]$BranchName = $Branch
    )
    
    # Save current location
    $originalLocation = Get-Location
    
    # Navigate to the repository
    Write-Host "Navigating to repository: $RepositoryPath" -ForegroundColor Gray
    Set-Location $RepositoryPath
    
    # Check if we're in a git repository
    if (-not (Test-Path ".git")) {
        Write-Host "⚠ Not a git repository at: $RepositoryPath" -ForegroundColor Yellow
        Set-Location $originalLocation
        return $false
    }
    
    # Get or create the target branch
    Write-Host "Setting up '$BranchName' branch..." -ForegroundColor Yellow
    $currentBranch = git rev-parse --abbrev-ref HEAD 2>$null
    
    if ($currentBranch -ne $BranchName) {
        # Check if branch exists
        $branchExists = git rev-parse --verify $BranchName 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Switching to existing '$BranchName' branch..." -ForegroundColor Yellow
            git checkout $BranchName 2>&1 | Out-Null
        }
        else {
            Write-Host "Creating new '$BranchName' branch..." -ForegroundColor Yellow
            git checkout -b $BranchName 2>&1 | Out-Null
        }
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "⚠ Failed to switch to '$BranchName' branch" -ForegroundColor Red
            Set-Location $originalLocation
            return $false
        }
        Write-Host "✓ On '$BranchName' branch" -ForegroundColor Green
    }
    else {
        Write-Host "✓ Already on '$BranchName' branch" -ForegroundColor Green
    }
    
    # Check for changes
    Write-Host "Checking for changes..." -ForegroundColor Yellow
    $status = git status --porcelain 2>$null
    
    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Host "✓ No changes to commit" -ForegroundColor Green
        Set-Location $originalLocation
        return $false
    }
    
    Write-Host "✓ Changes detected" -ForegroundColor Green
    
    # Stage all changes
    Write-Host "Staging changes..." -ForegroundColor Yellow
    $stageOutput = git add -A 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠ Failed to stage changes" -ForegroundColor Red
        Write-Host "Error: $stageOutput" -ForegroundColor Red
        Set-Location $originalLocation
        return $false
    }
    Write-Host "✓ Changes staged" -ForegroundColor Green
    
    # Commit changes
    Write-Host "Committing changes..." -ForegroundColor Yellow
    $commitOutput = git commit -m $CommitMessage 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠ Failed to commit changes" -ForegroundColor Red
        Write-Host "Error: $commitOutput" -ForegroundColor Red
        Set-Location $originalLocation
        return $false
    }
    Write-Host "✓ Changes committed" -ForegroundColor Green
    
    # Push to remote
    Write-Host "Pushing to remote '$BranchName' branch..." -ForegroundColor Yellow
    $pushOutput = git push origin $BranchName 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠ Failed to push changes" -ForegroundColor Yellow
        Write-Host "Error: $pushOutput" -ForegroundColor Yellow
        Write-Host "You may need to set up the remote or push manually" -ForegroundColor Yellow
        Set-Location $originalLocation
        return $false
    }
    Write-Host "✓ Changes pushed to GitHub" -ForegroundColor Green
    
    # Return to original location
    Set-Location $originalLocation
    return $true
}

Write-Host "=== VRCX Plugin System Build & Update Script ===" -ForegroundColor Cyan
Write-Host "Unix Time: $unixTime" -ForegroundColor Gray
Write-Host "Project Directory: $ProjectDir" -ForegroundColor Gray
Write-Host "Target Directory: $TargetDir" -ForegroundColor Gray
Write-Host ""

# Change to project directory
Write-Host "Changing to project directory..." -ForegroundColor Yellow
Set-Location $ProjectDir

# Check if Node.js is available
Write-Host "Checking for Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js not found"
    }
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "✗ Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if npm is available
Write-Host "Checking for npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "npm not found"
    }
    Write-Host "✓ npm version: $npmVersion" -ForegroundColor Green
}
catch {
    Write-Host "✗ npm is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if node_modules exists, install dependencies if needed
Write-Host ""
Write-Host "=== Dependency Check ===" -ForegroundColor Cyan
if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules not found, installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ npm install failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
}
else {
    Write-Host "✓ node_modules exists" -ForegroundColor Green
    
    # Optional: Check if package.json changed and reinstall if needed
    $packageJsonTime = (Get-Item "package.json").LastWriteTime
    $nodeModulesTime = (Get-Item "node_modules").LastWriteTime
    
    if ($packageJsonTime -gt $nodeModulesTime) {
        Write-Host "package.json is newer than node_modules, reinstalling..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "✗ npm install failed" -ForegroundColor Red
            exit 1
        }
        Write-Host "✓ Dependencies reinstalled successfully" -ForegroundColor Green
    }
}

# Build the project
Write-Host ""
Write-Host "=== Build ===" -ForegroundColor Cyan
Write-Host "Building TypeScript project..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build completed successfully" -ForegroundColor Green

# Verify build output exists
$distFile = Join-Path $ProjectDir "dist\$BundledFile"
if (-not (Test-Path $distFile)) {
    Write-Host "✗ Build output not found: $distFile" -ForegroundColor Red
    exit 1
}

$fileSize = (Get-Item $distFile).Length
Write-Host "✓ Build output size: $([math]::Round($fileSize / 1KB, 2)) KB" -ForegroundColor Green

# Copy to VRCX directory
Write-Host ""
Write-Host "=== Deploy ===" -ForegroundColor Cyan

# Check if target directory exists
if (-not (Test-Path $TargetDir)) {
    Write-Host "✗ Target directory does not exist: $TargetDir" -ForegroundColor Red
    Write-Host "Please ensure VRCX is installed" -ForegroundColor Yellow
    exit 1
}

$targetFile = Join-Path $TargetDir $BundledFile
Write-Host "Copying $BundledFile to VRCX directory..." -ForegroundColor Yellow

# Try to write to target file with error handling
try {
    Copy-Item $distFile $targetFile -Force
    Write-Host "✓ $BundledFile deployed successfully" -ForegroundColor Green
}
catch {
    Write-Host "⚠ Failed to copy $BundledFile directly: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "The file may be in use by VRCX. Trying alternative approach..." -ForegroundColor Yellow
    
    # Try using a temporary file and then moving it
    $tempFile = "$targetFile.tmp"
    try {
        Copy-Item $distFile $tempFile -Force
        Move-Item $tempFile $targetFile -Force
        Write-Host "✓ $BundledFile deployed successfully (via temp file)" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠ Still unable to update $BundledFile. Please close VRCX and try again." -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        
        # Clean up temp file if it exists
        if (Test-Path $tempFile) {
            Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
        }
        exit 1
    }
}

# Clear logs directory (optional)
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

Write-Host ""
Write-Host "=== Git Commit & Push ===" -ForegroundColor Cyan

# Navigate to the parent directory (vrcx-plugin-system)
$PluginSystemRoot = Split-Path -Parent $ProjectDir

# Check if git is available
Write-Host "Checking for Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Git not found"
    }
    Write-Host "✓ Git version: $gitVersion" -ForegroundColor Green
}
catch {
    Write-Host "⚠ Git is not installed or not in PATH, skipping commit/push" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "=== Script Completed ===" -ForegroundColor Cyan
    Write-Host "✓ Build and deployment finished successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now restart VRCX to load the updated plugin system." -ForegroundColor Yellow
    Write-Host ""
    Set-Location $ProjectDir
    exit 0
}

# Check if gh CLI is available
Write-Host "Checking for GitHub CLI..." -ForegroundColor Yellow
$ghAvailable = $false
try {
    $ghVersion = gh --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ GitHub CLI version: $($ghVersion.Split("`n")[0])" -ForegroundColor Green
        $ghAvailable = $true
    }
}
catch {
    Write-Host "⚠ GitHub CLI not installed, releases will be skipped" -ForegroundColor Yellow
}

# Commit changes from within the vrcx-plugin-system submodule
Write-Host ""
Write-Host "--- Plugin System Core (Submodule) ---" -ForegroundColor Cyan

# Create commit message with timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMessage = @"
Update VRCX Plugin System - $timestamp
"@

# Commit and push from the project directory
$hasChanges = Commit-AndPushChanges -RepositoryPath $ProjectDir -CommitMessage $commitMessage -BranchName $Branch

# Create GitHub Release if gh CLI is available and there were changes
if ($ghAvailable -and $hasChanges) {
    Write-Host ""
    Write-Host "=== GitHub Release ===" -ForegroundColor Cyan
    
    # Generate release tag based on Unix time
    $unixTime = $unixTime
    $releaseTag = "v$unixTime"
    $releaseTitle = "VRCX Plugin System Build - $unixTime"
    $releaseNotes = @"
Automated build and release of VRCX Plugin System at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## Installation
Download [custom.js](https://github.com/vrcx-plugin-system/vrcx-plugin-system/releases/latest/download/custom.js) and place it in your VRCX AppData folder.
"@
    
    Write-Host "Creating release '$releaseTag'..." -ForegroundColor Yellow
    Write-Host "Asset: $(Join-Path $ProjectDir 'dist\custom.js')" -ForegroundColor Gray
    
    # Create release with the built file as asset
    $assetPath = Join-Path $ProjectDir "dist\custom.js"
    if (Test-Path $assetPath) {
        gh release create $releaseTag $assetPath `
            --title $releaseTitle `
            --notes $releaseNotes `
            --target $Branch `
            2>&1 | Out-Host
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ GitHub release created successfully!" -ForegroundColor Green
        }
        else {
            Write-Host "⚠ Failed to create GitHub release" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "⚠ Asset file not found: $assetPath" -ForegroundColor Yellow
    }
}
elseif (-not $hasChanges) {
    Write-Host ""
    Write-Host "✓ No changes to commit or release" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Script Completed ===" -ForegroundColor Cyan
Write-Host "✓ Build, deployment, and version control finished successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now restart VRCX to load the updated plugin system." -ForegroundColor Yellow
Write-Host ""

# Return to original directory
Set-Location $ProjectDir
