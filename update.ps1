# VRCX Plugin System Update Script
# This script builds the TypeScript project and copies the bundled file to VRCX
# 
# Usage: .\update.ps1 [build-args...]
# Example: .\update.ps1 --no-timestamp --dev

# $ErrorActionPreference = "Stop";
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$BuildArgs
)

# Define paths - update these to match your setup
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TargetDir = "$env:APPDATA\VRCX"
$BundledFile = "custom.js"
$Branch = "main"

function Get-UnixTime {
    return [Math]::Floor((New-TimeSpan -Start (Get-Date "01/01/1970") -End (Get-Date)).TotalSeconds)
}

function Update-PluginVersionAndBuild {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PluginPath
    )
    
    if (-not (Test-Path $PluginPath)) {
        Write-Host "[FAILURE] Plugin file not found: $PluginPath" -ForegroundColor Red
        return $false
    }
    
    Write-Host "Updating version and build for: $PluginPath" -ForegroundColor Yellow
    
    # Read the file content
    $content = Get-Content $PluginPath -Raw
    
    # Find the version number
    if ($content -match 'version:\s*"(\d+)\.(\d+)\.(\d+)"') {
        $major = [int]$matches[1]
        $minor = [int]$matches[2]
        $patch = [int]$matches[3]
        $oldVersion = "$major.$minor.$patch"
        
        # Increment the patch version with rollover
        $patch++
        if ($patch -gt 9) {
            $patch = 0
            $minor++
            if ($minor -gt 9) {
                $minor = 0
                $major++
                if ($major -gt 9) {
                    $major = 0  # Complete rollover
                }
            }
        }
        
        $newVersion = "$major.$minor.$patch"
        Write-Host "  Version: $oldVersion -> $newVersion" -ForegroundColor Cyan
        
        # Update the version in content
        $content = $content -replace 'version:\s*"\d+\.\d+\.\d+"', "version: `"$newVersion`""
    }
    else {
        Write-Host "  [WARNING] Version pattern not found in file" -ForegroundColor Yellow
    }
    
    # Get the file's last modified time and convert to Unix timestamp
    $fileInfo = Get-Item $PluginPath
    $lastModified = $fileInfo.LastWriteTime
    $unixTimestamp = [Math]::Floor((New-TimeSpan -Start (Get-Date "01/01/1970") -End $lastModified).TotalSeconds)
    
    Write-Host "  Build: $unixTimestamp (Last Modified: $lastModified)" -ForegroundColor Cyan
    
    # Update the build in content
    if ($content -match 'build:\s*"\d+"') {
        $content = $content -replace 'build:\s*"\d+"', "build: `"$unixTimestamp`""
    }
    else {
        Write-Host "  [WARNING] Build pattern not found in file" -ForegroundColor Yellow
    }
    
    # Write the updated content back to the file
    try {
        Set-Content -Path $PluginPath -Value $content -NoNewline
        Write-Host "[SUCCESS] Plugin version and build updated successfully" -ForegroundColor Green
        return $true
    }
    catch {
        $errorMsg = $_.Exception.Message
        Write-Host "[FAILURE] Failed to update plugin file: $errorMsg" -ForegroundColor Red
        return $false
    }
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
        Write-Host "[WARNING] Not a git repository at: $RepositoryPath" -ForegroundColor Yellow
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
            Write-Host "[WARNING] Failed to switch to '$BranchName' branch" -ForegroundColor Red
            Set-Location $originalLocation
            return $false
        }
        Write-Host "[SUCCESS] On '$BranchName' branch" -ForegroundColor Green
    }
    else {
        Write-Host "[SUCCESS] Already on '$BranchName' branch" -ForegroundColor Green
    }
    
    # Check for changes
    Write-Host "Checking for changes..." -ForegroundColor Yellow
    $status = git status --porcelain 2>$null
    
    if ([string]::IsNullOrWhiteSpace($status)) {
        Write-Host "[SUCCESS] No changes to commit" -ForegroundColor Green
        Set-Location $originalLocation
        return $false
    }
    
    Write-Host "[SUCCESS] Changes detected" -ForegroundColor Green
    
    # Stage all changes
    Write-Host "Staging changes..." -ForegroundColor Yellow
    $stageOutput = git add -A 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARNING] Failed to stage changes" -ForegroundColor Red
        Write-Host "Error: $stageOutput" -ForegroundColor Red
        Set-Location $originalLocation
        return $false
    }
    Write-Host "[SUCCESS] Changes staged" -ForegroundColor Green
    
    # Commit changes
    Write-Host "Committing changes..." -ForegroundColor Yellow
    $commitOutput = git commit -m $CommitMessage 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARNING] Failed to commit changes" -ForegroundColor Red
        Write-Host "Error: $commitOutput" -ForegroundColor Red
        Set-Location $originalLocation
        return $false
    }
    Write-Host "[SUCCESS] Changes committed" -ForegroundColor Green
    
    # Push to remote
    Write-Host "Pushing to remote '$BranchName' branch..." -ForegroundColor Yellow
    $pushOutput = git push origin $BranchName 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARNING] Failed to push changes" -ForegroundColor Yellow
        Write-Host "Error: $pushOutput" -ForegroundColor Yellow
        Write-Host "You may need to set up the remote or push manually" -ForegroundColor Yellow
        Set-Location $originalLocation
        return $false
    }
    Write-Host "[SUCCESS] Changes pushed to GitHub" -ForegroundColor Green
    
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
    Write-Host "[SUCCESS] Node.js version: $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "[FAILURE] Node.js is not installed or not in PATH" -ForegroundColor Red
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
    Write-Host "[SUCCESS] npm version: $npmVersion" -ForegroundColor Green
}
catch {
    Write-Host "[FAILURE] npm is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if node_modules exists, install dependencies if needed
Write-Host ""
Write-Host "=== Dependency Check ===" -ForegroundColor Cyan
if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules not found, installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[FAILURE] npm install failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "[SUCCESS] Dependencies installed successfully" -ForegroundColor Green
}
else {
    Write-Host "[SUCCESS] node_modules exists" -ForegroundColor Green
    
    # Optional: Check if package.json changed and reinstall if needed
    $packageJsonTime = (Get-Item "package.json").LastWriteTime
    $nodeModulesTime = (Get-Item "node_modules").LastWriteTime
    
    if ($packageJsonTime -gt $nodeModulesTime) {
        Write-Host "package.json is newer than node_modules, reinstalling..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[FAILURE] npm install failed" -ForegroundColor Red
            exit 1
        }
        Write-Host "[SUCCESS] Dependencies reinstalled successfully" -ForegroundColor Green
    }
}

# Build the project
Write-Host ""
Write-Host "=== Build ===" -ForegroundColor Cyan

# Show build arguments if any
if ($BuildArgs -and $BuildArgs.Count -gt 0) {
    $argsString = $BuildArgs -join ' '
    Write-Host "Build arguments: $argsString" -ForegroundColor Gray
    
    # Check if --no-timestamp flag is present
    $hasNoTimestamp = $BuildArgs -contains '--no-timestamp' -or $BuildArgs -contains '--skip-timestamp'
    
    if ($hasNoTimestamp) {
        Write-Host "Building TypeScript project (skipping timestamp update)..." -ForegroundColor Yellow
        # Run prebuild with the flag, then build without args
        npm run prebuild -- --no-timestamp
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[FAILURE] Prebuild failed" -ForegroundColor Red
            exit 1
        }
        npm run build
    }
    else {
        Write-Host "Building TypeScript project with arguments..." -ForegroundColor Yellow
        # Pass other arguments to build (webpack will receive them)
        npm run build -- $BuildArgs
    }
}
else {
    Write-Host "Building TypeScript project..." -ForegroundColor Yellow
    npm run build
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAILURE] Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "[SUCCESS] Build completed successfully" -ForegroundColor Green

# Verify build output exists
$distFile = Join-Path $ProjectDir "dist\$BundledFile"
if (-not (Test-Path $distFile)) {
    Write-Host "[FAILURE] Build output not found: $distFile" -ForegroundColor Red
    exit 1
}

$fileSize = (Get-Item $distFile).Length
$fileSizeKB = [math]::Round($fileSize / 1KB, 2)
Write-Host "[SUCCESS] Build output size: $fileSizeKB KB" -ForegroundColor Green

# Copy to VRCX directory
Write-Host ""
Write-Host "=== Deploy ===" -ForegroundColor Cyan

# Check if target directory exists
if (-not (Test-Path $TargetDir)) {
    Write-Host "[FAILURE] Target directory does not exist: $TargetDir" -ForegroundColor Red
    Write-Host "Please ensure VRCX is installed" -ForegroundColor Yellow
    exit 1
}

$targetFile = Join-Path $TargetDir $BundledFile
Write-Host "Copying $BundledFile to VRCX directory..." -ForegroundColor Yellow

# Try to write to target file with error handling
try {
    Copy-Item $distFile $targetFile -Force
    Write-Host "[SUCCESS] $BundledFile deployed successfully" -ForegroundColor Green
}
catch {
    $errorMsg = $_.Exception.Message
    Write-Host "[WARNING] Failed to copy $BundledFile directly: $errorMsg" -ForegroundColor Yellow
    Write-Host "The file may be in use by VRCX. Trying alternative approach..." -ForegroundColor Yellow
    
    # Try using a temporary file and then moving it
    $tempFile = "$targetFile.tmp"
    try {
        Copy-Item $distFile $tempFile -Force
        Move-Item $tempFile $targetFile -Force
        Write-Host "[SUCCESS] $BundledFile deployed successfully (via temp file)" -ForegroundColor Green
    }
    catch {
        $errorMsg = $_.Exception.Message
        Write-Host "[WARNING] Still unable to update $BundledFile. Please close VRCX and try again." -ForegroundColor Red
        Write-Host "Error: $errorMsg" -ForegroundColor Red
        
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
        Write-Host "[SUCCESS] Logs cleared successfully" -ForegroundColor Green
    }
    catch {
        $errorMsg = $_.Exception.Message
        Write-Host "[WARNING] Failed to clear some logs (may be in use): $errorMsg" -ForegroundColor Yellow
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
    Write-Host "[SUCCESS] Git version: $gitVersion" -ForegroundColor Green
}
catch {
    Write-Host "[WARNING] Git is not installed or not in PATH, skipping commit/push" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "=== Script Completed ===" -ForegroundColor Cyan
    Write-Host "[SUCCESS] Build and deployment finished successfully!" -ForegroundColor Green
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
        $ghVersionFirstLine = $ghVersion.Split("`n")[0]
        Write-Host "[SUCCESS] GitHub CLI version: $ghVersionFirstLine" -ForegroundColor Green
        $ghAvailable = $true
    }
}
catch {
    Write-Host "[WARNING] GitHub CLI not installed, releases will be skipped" -ForegroundColor Yellow
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

# Also commit and push the parent plugins repository
Write-Host ""
Write-Host "--- Plugins Repository (Parent Repo) ---" -ForegroundColor Cyan

$pluginsRepoPath = Join-Path $PluginSystemRoot "plugins"
Write-Host "Plugins repo path: $pluginsRepoPath" -ForegroundColor Gray

# Create commit message for plugins
$pluginsCommitMessage = @"
Update plugins - $timestamp
"@

# Commit and push plugins repo changes
$hasPluginsChanges = Commit-AndPushChanges -RepositoryPath $pluginsRepoPath -CommitMessage $pluginsCommitMessage -BranchName $Branch

# Create GitHub Release if gh CLI is available and there were changes
if ($ghAvailable -and $hasChanges) {
    Write-Host ""
    Write-Host "=== GitHub Release ===" -ForegroundColor Cyan
    
    # Generate release tag based on Unix time
    $unixTime = $unixTime
    $releaseTag = "$unixTime"
    $releaseTitle = "VRCX Plugin System Build - $unixTime"
    $releaseDateTime = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $releaseNotes = @"
Automated build and release of VRCX Plugin System at $releaseDateTime

## Installation
Download [custom.js](https://github.com/vrcx-plugin-system/vrcx-plugin-system/releases/latest/download/custom.js) and place it in `%APPDATA%\VRCX\`
"@
    
    Write-Host "Creating release '$releaseTag'..." -ForegroundColor Yellow
    $assetPathDisplay = Join-Path $ProjectDir 'dist\custom.js'
    Write-Host "Asset: $assetPathDisplay" -ForegroundColor Gray
    
    # Create release with the built file as asset
    $assetPath = Join-Path $ProjectDir "dist\custom.js"
    if (Test-Path $assetPath) {
        gh release create $releaseTag $assetPath `
            --title $releaseTitle `
            --notes $releaseNotes `
            --target $Branch `
            2>&1 | Out-Host
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[SUCCESS] GitHub release created successfully!" -ForegroundColor Green
        }
        else {
            Write-Host "[WARNING] Failed to create GitHub release" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "[WARNING] Asset file not found: $assetPath" -ForegroundColor Yellow
    }
}
elseif (-not $hasChanges) {
    Write-Host ""
    Write-Host "[SUCCESS] No changes to commit or release" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Script Completed ===" -ForegroundColor Cyan
Write-Host "[SUCCESS] Build, deployment, and version control finished successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now restart VRCX to load the updated plugin system." -ForegroundColor Yellow
Write-Host ""

# Return to original directory
Set-Location $ProjectDir
