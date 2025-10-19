# VRCX Plugin System Update Script
# Builds, tests, and deploys the plugin system with detailed reporting
# Usage: .\update.ps1 [--no-timestamp] [--skip-tests] [--skip-deploy] [--skip-git]

param(
    [switch]$NoTimestamp,
    [switch]$SkipTests,
    [switch]$SkipDeploy,
    [switch]$SkipGit
)

$ErrorActionPreference = "Stop"

# ============================================================================
# CONFIGURATION
# ============================================================================

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PluginSystemRoot = Split-Path -Parent $ProjectDir
$PluginsDir = Join-Path $PluginSystemRoot "plugins"
$TargetDir = "$env:APPDATA\VRCX"
$Branch = "main"

# Build results tracking
$BuildResults = @{
    Core    = @{
        Path      = "dist\custom.js"
        Built     = $false
        TsSize    = 0
        JsSize    = 0
        Committed = $false
        Pushed    = $false
    }
    Plugins = @()
    Tests   = @{
        Passed   = 0
        Failed   = 0
        Total    = 0
        Duration = 0
    }
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Failure {
    param([string]$Message)
    Write-Host "[FAILURE] $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Info {
    param([string]$Message)
    Write-Host "$Message" -ForegroundColor Yellow
}

function Test-Command {
    param([string]$Command, [string]$Name)
    
    Write-Info "Checking for $Name..."
    try {
        $version = & $Command --version 2>$null
        if ($LASTEXITCODE -ne 0) { throw "$Name not found" }
        $versionLine = if ($version -is [array]) { $version[0] } else { $version }
        Write-Success "$Name version: $versionLine"
        return $true
    }
    catch {
        Write-Failure "$Name is not installed or not in PATH"
        return $false
    }
}

function Get-FileSize {
    param([string]$Path)
    if (Test-Path $Path) {
        $size = (Get-Item $Path).Length
        return [math]::Round($size / 1KB, 2)
    }
    return 0
}

function Invoke-GitOperation {
    param(
        [string]$RepoPath,
        [string]$CommitMessage,
        [string]$BranchName = $Branch
    )
    
    $originalLocation = Get-Location
    Set-Location $RepoPath
    
    try {
        # Verify git repo
        if (-not (Test-Path ".git")) {
            Write-Warning "Not a git repository: $RepoPath"
            return @{ Committed = $false; Pushed = $false }
        }
        
        # Ensure on correct branch
        $currentBranch = git rev-parse --abbrev-ref HEAD 2>$null
        if ($currentBranch -ne $BranchName) {
            $branchExists = git rev-parse --verify $BranchName 2>$null
            if ($LASTEXITCODE -eq 0) {
                git checkout $BranchName 2>&1 | Out-Null
            }
            else {
                git checkout -b $BranchName 2>&1 | Out-Null
            }
        }
        
        # Check for changes
        $status = git status --porcelain 2>$null
        if ([string]::IsNullOrWhiteSpace($status)) {
            Write-Success "No changes to commit"
            return @{ Committed = $false; Pushed = $false }
        }
        
        # Stage, commit, push
        git add -A 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Failed to stage changes"
            return @{ Committed = $false; Pushed = $false }
        }
        
        git commit -m $CommitMessage 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Failed to commit changes"
            return @{ Committed = $false; Pushed = $false }
        }
        
        git push origin $BranchName 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Failed to push changes"
            return @{ Committed = $true; Pushed = $false }
        }
        
        Write-Success "Changes committed and pushed"
        return @{ Committed = $true; Pushed = $true }
    }
    finally {
        Set-Location $originalLocation
    }
}

function Show-BuildSummary {
    Write-Section "Build Summary"
    
    # Create table data
    $tableData = @()
    
    # Core module
    $tableData += [PSCustomObject]@{
        Component = "Core System"
        Built     = if ($BuildResults.Core.Built) { "✓" } else { "✗" }
        Committed = if ($BuildResults.Core.Committed) { "✓" } else { "✗" }
        Pushed    = if ($BuildResults.Core.Pushed) { "✓" } else { "✗" }
        Size      = "$($BuildResults.Core.JsSize) KB"
    }
    
    # Plugins
    $pluginStats = @{
        Total  = $BuildResults.Plugins.Count
        Built  = ($BuildResults.Plugins | Where-Object { $_.Built }).Count
        Failed = ($BuildResults.Plugins | Where-Object { -not $_.Built }).Count
    }
    
    $tableData += [PSCustomObject]@{
        Component = "Plugins ($($pluginStats.Built)/$($pluginStats.Total))"
        Built     = if ($pluginStats.Built -gt 0) { "✓" } else { "✗" }
        Committed = if ($BuildResults.Core.Committed) { "✓" } else { "✗" }
        Pushed    = if ($BuildResults.Core.Pushed) { "✓" } else { "✗" }
        Size      = "$(($BuildResults.Plugins | Measure-Object -Property JsSize -Sum).Sum) KB"
    }
    
    # Tests
    if ($BuildResults.Tests.Total -gt 0) {
        $tableData += [PSCustomObject]@{
            Component = "Tests ($($BuildResults.Tests.Passed)/$($BuildResults.Tests.Total))"
            Built     = if ($BuildResults.Tests.Failed -eq 0) { "✓" } else { "✗" }
            Committed = "-"
            Pushed    = "-"
            Size      = "$([math]::Round($BuildResults.Tests.Duration / 1000, 1))s"
        }
    }
    
    # Display table
    $tableData | Format-Table -AutoSize
    
    Write-Host ""
    if ($BuildResults.Core.Built -and $pluginStats.Built -eq $pluginStats.Total) {
        Write-Success "All components built successfully!"
    }
    elseif ($BuildResults.Core.Built) {
        Write-Warning "Core built, but $($pluginStats.Failed) plugin(s) failed"
    }
    else {
        Write-Failure "Build incomplete"
    }
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

Write-Section "VRCX Plugin System Build & Update"
Write-Host "Project: $ProjectDir" -ForegroundColor Gray
Write-Host "Target: $TargetDir" -ForegroundColor Gray
Write-Host ""

Set-Location $ProjectDir

# Check prerequisites
Write-Section "Prerequisites"
if (-not (Test-Command "node" "Node.js")) { exit 1 }
if (-not (Test-Command "npm" "npm")) { exit 1 }
$hasGit = Test-Command "git" "Git"
$hasGh = Test-Command "gh" "GitHub CLI"

# Install/update dependencies
Write-Section "Dependencies"
if (-not (Test-Path "node_modules")) {
    Write-Info "Installing dependencies..."
    npm install | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Failure "npm install failed"
        exit 1
    }
    Write-Success "Dependencies installed"
}
else {
    $packageJsonTime = (Get-Item "package.json").LastWriteTime
    $nodeModulesTime = (Get-Item "node_modules").LastWriteTime
    
    if ($packageJsonTime -gt $nodeModulesTime) {
        Write-Info "package.json is newer, reinstalling..."
        npm install | Out-Host
        if ($LASTEXITCODE -ne 0) {
            Write-Failure "npm install failed"
            exit 1
        }
        Write-Success "Dependencies reinstalled"
    }
    else {
        Write-Success "Dependencies up to date"
    }
}

# Run tests
if (-not $SkipTests) {
    Write-Section "Tests"
    Write-Info "Running test suite..."
    $testStart = Get-Date
    
    $testOutput = npm test 2>&1 | Out-String
    $testDuration = ((Get-Date) - $testStart).TotalMilliseconds
    
    # Parse test results
    $BuildResults.Tests.Duration = $testDuration
    
    if ($testOutput -match "Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total") {
        $BuildResults.Tests.Passed = [int]$matches[1]
        $BuildResults.Tests.Total = [int]$matches[2]
        $BuildResults.Tests.Failed = 0
    }
    elseif ($testOutput -match "Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total") {
        $BuildResults.Tests.Failed = [int]$matches[1]
        $BuildResults.Tests.Passed = [int]$matches[2]
        $BuildResults.Tests.Total = [int]$matches[3]
    }
    else {
        # Fallback: count from output
        $BuildResults.Tests.Passed = 0
        $BuildResults.Tests.Total = 0
        $BuildResults.Tests.Failed = 0
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Failure "Tests failed ($($BuildResults.Tests.Failed) failed, $($BuildResults.Tests.Passed) passed)"
        Show-BuildSummary
        exit 1
    }
    
    Write-Success "All $($BuildResults.Tests.Passed) tests passed in $([math]::Round($testDuration / 1000, 1))s"
}
else {
    Write-Warning "Tests skipped"
}

# Build core system
Write-Section "Build Core System"
Write-Info "Building TypeScript project..."

if ($NoTimestamp) {
    $env:SKIP_TIMESTAMP = "true"
}

npm run build | Out-Host

if ($NoTimestamp) {
    Remove-Item Env:\SKIP_TIMESTAMP -ErrorAction SilentlyContinue
}

if ($LASTEXITCODE -ne 0) {
    Write-Failure "Core build failed"
    Show-BuildSummary
    exit 1
}

$distFile = Join-Path $ProjectDir "dist\custom.js"
if (Test-Path $distFile) {
    $BuildResults.Core.Built = $true
    $BuildResults.Core.JsSize = Get-FileSize $distFile
    Write-Success "Core built successfully ($($BuildResults.Core.JsSize) KB)"
}
else {
    Write-Failure "Build output not found"
    exit 1
}

# Build plugins
Write-Section "Build Plugins"

if (Test-Path $PluginsDir) {
    $currentDir = Get-Location
    Set-Location $PluginsDir
    
    try {
        # Install plugin dependencies if needed
        if (-not (Test-Path "node_modules")) {
            Write-Info "Installing plugin dependencies..."
            npm install | Out-Host
        }
        
        # Build plugins
        Write-Info "Building plugins..."
        $buildOutput = npm run build 2>&1 | Out-String
        
        if ($LASTEXITCODE -eq 0) {
            # Parse build output for plugin stats
            if ($buildOutput -match "Success:\s+(\d+)") {
                $successCount = [int]$matches[1]
                Write-Success "$successCount plugins built successfully"
            }
            
            # Check repo.json
            $repoFile = Join-Path $PluginsDir "dist\repo.json"
            if (Test-Path $repoFile) {
                $repoContent = Get-Content $repoFile -Raw | ConvertFrom-Json
                $pluginCount = $repoContent.modules.Count
                
                # Track each plugin
                foreach ($module in $repoContent.modules) {
                    $pluginFile = Join-Path $PluginsDir "dist\$($module.id).js"
                    $BuildResults.Plugins += @{
                        Name      = $module.name
                        Id        = $module.id
                        Path      = "dist\$($module.id).js"
                        Built     = (Test-Path $pluginFile)
                        JsSize    = (Get-FileSize $pluginFile)
                        Committed = $false
                        Pushed    = $false
                    }
                }
                
                Write-Success "Repository metadata created: $pluginCount modules"
            }
        }
        else {
            Write-Warning "Plugin build failed"
        }
    }
    finally {
        Set-Location $currentDir
    }
}
else {
    Write-Warning "Plugins directory not found, skipping..."
}

# Deploy to VRCX
if (-not $SkipDeploy) {
    Write-Section "Deploy to VRCX"
    
    if (-not (Test-Path $TargetDir)) {
        Write-Failure "Target directory does not exist: $TargetDir"
        Write-Warning "Please ensure VRCX is installed"
        exit 1
    }
    
    $targetFile = Join-Path $TargetDir "custom.js"
    Write-Info "Copying custom.js to VRCX directory..."
    
    try {
        Copy-Item $distFile $targetFile -Force
        Write-Success "Deployed to VRCX successfully"
    }
    catch {
        Write-Warning "Failed to copy directly: $($_.Exception.Message)"
        Write-Info "Trying alternative approach..."
        
        $tempFile = "$targetFile.tmp"
        try {
            Copy-Item $distFile $tempFile -Force
            Move-Item $tempFile $targetFile -Force
            Write-Success "Deployed via temp file"
        }
        catch {
            Write-Failure "Unable to deploy. Please close VRCX and try again."
            if (Test-Path $tempFile) {
                Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
            }
            Show-BuildSummary
            exit 1
        }
    }
    
    # Clear logs
    $logsDir = Join-Path $TargetDir "logs"
    if (Test-Path $logsDir) {
        try {
            Get-ChildItem $logsDir -Filter "*.log" | Remove-Item -Force -ErrorAction SilentlyContinue
            Write-Success "Logs cleared"
        }
        catch {
            Write-Warning "Some logs could not be cleared (in use)"
        }
    }
}
else {
    Write-Warning "Deployment skipped"
}

# Git operations
if (-not $SkipGit -and $hasGit) {
    Write-Section "Git Operations"
    
    # Commit core system
    Write-Host "--- Core System ---" -ForegroundColor Magenta
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $coreResult = Invoke-GitOperation -RepoPath $ProjectDir -CommitMessage "Update VRCX Plugin System - $timestamp"
    $BuildResults.Core.Committed = $coreResult.Committed
    $BuildResults.Core.Pushed = $coreResult.Pushed
    
    # Commit plugins
    if (Test-Path $PluginsDir) {
        Write-Host "--- Plugins Repository ---" -ForegroundColor Magenta
        $pluginsResult = Invoke-GitOperation -RepoPath $PluginsDir -CommitMessage "Update plugins - $timestamp"
        
        # Update all plugin results
        foreach ($plugin in $BuildResults.Plugins) {
            $plugin.Committed = $pluginsResult.Committed
            $plugin.Pushed = $pluginsResult.Pushed
        }
    }
    
    # Create GitHub release
    if ($hasGh -and $coreResult.Committed) {
        Write-Host "--- GitHub Release ---" -ForegroundColor Magenta
        $releaseTag = [Math]::Floor((New-TimeSpan -Start (Get-Date "01/01/1970") -End (Get-Date)).TotalSeconds)
        $releaseTitle = "Build $releaseTag"
        $releaseNotes = @"
Automated build - $timestamp

## Components
- Core System: $($BuildResults.Core.JsSize) KB
- Plugins: $($BuildResults.Plugins.Count) modules
- Tests: $($BuildResults.Tests.Passed)/$($BuildResults.Tests.Total) passed

## Installation
Download [custom.js](https://github.com/vrcx-plugin-system/vrcx-plugin-system/releases/latest/download/custom.js) and place it in ``%APPDATA%\VRCX\``
"@
        
        $assetPath = Join-Path $ProjectDir "dist\custom.js"
        if (Test-Path $assetPath) {
            gh release create $releaseTag $assetPath `
                --title $releaseTitle `
                --notes $releaseNotes `
                --target $Branch `
                2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "GitHub release created: $releaseTag"
            }
            else {
                Write-Warning "Failed to create GitHub release"
            }
        }
    }
}
else {
    if ($SkipGit) {
        Write-Warning "Git operations skipped"
    }
    else {
        Write-Warning "Git not available, skipping version control"
    }
}

# Show final summary
Show-BuildSummary

Write-Host ""
Write-Success "Build process completed!"
Write-Host ""
Write-Info "You can now restart VRCX to load the updated plugin system."
Write-Host ""

Set-Location $ProjectDir
