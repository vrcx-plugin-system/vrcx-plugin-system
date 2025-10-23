#!/usr/bin/env pwsh
# VRCX Plugin System - Complete Build & Release Script using Bluscream-BuildTools
# Builds, tests, and optionally publishes the plugin system with full automation

param(
    [switch]$Publish
)

$ErrorActionPreference = "Stop"

# Install and import Bluscream-BuildTools module
Write-Host "📦 Installing Bluscream-BuildTools module..." -ForegroundColor Cyan
if (-not (Get-Module -ListAvailable -Name Bluscream-BuildTools)) {
    Install-Module -Name Bluscream-BuildTools -Scope CurrentUser -Force -Repository PSGallery
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install Bluscream-BuildTools module from PowerShell Gallery"
    }
}
Import-Module Bluscream-BuildTools -Force
if (-not (Get-Module Bluscream-BuildTools)) {
    throw "Failed to import Bluscream-BuildTools module"
}
Write-Host "✓ Bluscream-BuildTools module loaded" -ForegroundColor Green

# Configuration
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PluginSystemRoot = Split-Path -Parent $ProjectDir
$PluginsDir = Join-Path $PluginSystemRoot "plugins"
$TargetDir = "$env:APPDATA\VRCX"
$Branch = "main"

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        VRCX Plugin System - Complete Build & Release      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check prerequisites using Bluscream-BuildTools
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Green

$prerequisites = @(
    @{ Command = "node"; Name = "Node.js" },
    @{ Command = "npm"; Name = "NPM" },
    @{ Command = "git"; Name = "Git" }
)

$allPrerequisitesMet = $true
foreach ($prereq in $prerequisites) {
    if (-not (Get-Command $prereq.Command -ErrorAction SilentlyContinue)) {
        Write-Host "❌ $($prereq.Name) not found" -ForegroundColor Red
        $allPrerequisitesMet = $false
    }
    else {
        Write-Host "✓ $($prereq.Name) available" -ForegroundColor Green
    }
}

if (-not $allPrerequisitesMet) {
    throw "Missing required prerequisites. Please install Node.js, NPM, and Git."
}

Write-Host ""

# Step 2: Version Management using Bluscream-BuildTools
Write-Host "🔢 Managing version..." -ForegroundColor Green

# Get current timestamp for build version
$buildTimestamp = [Math]::Floor((Get-Date).ToUniversalTime().Subtract((Get-Date "01/01/1970")).TotalSeconds)
$versionTag = "v$(Get-Date -Format 'yyyy.MM.dd')-$buildTimestamp"

Write-Host "✓ Build version: $versionTag" -ForegroundColor Green
Write-Host ""

# Step 3: Node.js Build using Bluscream-BuildTools
Write-Host "📦 Building with Node.js..." -ForegroundColor Green

if (-not (Get-Command Nodejs-Build -ErrorAction SilentlyContinue)) {
    throw "Nodejs-Build command not found in Bluscream-BuildTools module"
}

# Build core system
$coreBuildResult = Nodejs-Build -ProjectPath $ProjectDir -Production -Script "build"
if (-not $coreBuildResult) {
    throw "Core build failed"
}

Write-Host "✓ Core system built successfully" -ForegroundColor Green

# Build plugins if they exist
if (Test-Path $PluginsDir) {
    Write-Host "🔌 Building plugins..." -ForegroundColor Green
    
    $pluginDirs = Get-ChildItem $PluginsDir -Directory
    foreach ($pluginDir in $pluginDirs) {
        $pluginPackageJson = Join-Path $pluginDir.FullName "package.json"
        if (Test-Path $pluginPackageJson) {
            Write-Host "  Building plugin: $($pluginDir.Name)" -ForegroundColor Gray
            
            $pluginBuildResult = Nodejs-Build -ProjectPath $pluginDir.FullName -Production -Script "build"
            if ($pluginBuildResult) {
                Write-Host "  ✓ Plugin $($pluginDir.Name) built successfully" -ForegroundColor Green
            }
            else {
                Write-Host "  ⚠️  Plugin $($pluginDir.Name) build failed" -ForegroundColor Yellow
            }
        }
    }
}

Write-Host ""

# Step 4: Find and organize built files using Bluscream-BuildTools
Write-Host "🔍 Finding built files..." -ForegroundColor Green

if (-not (Get-Command Find-BuiltFile -ErrorAction SilentlyContinue)) {
    throw "Find-BuiltFile command not found in Bluscream-BuildTools module"
}

# Find main JavaScript file
$mainJsFile = Find-BuiltFile -Config "production" -Arch "any" -ProjectFramework "node" -AssemblyName "custom" -FileExtension ".js" -FileType "main JavaScript" -ProjectDir $ProjectDir

if (-not $mainJsFile) {
    # Fallback to common locations
    $possiblePaths = @(
        "dist/custom.js",
        "dist/index.js",
        "build/custom.js",
        "build/index.js"
    )
    
    foreach ($path in $possiblePaths) {
        $fullPath = Join-Path $ProjectDir $path
        if (Test-Path $fullPath) {
            $mainJsFile = Get-Item $fullPath
            break
        }
    }
}

if (-not $mainJsFile) {
    throw "Main JavaScript file not found"
}

Write-Host "✓ Found main file: $($mainJsFile.Name)" -ForegroundColor Green

# Step 5: Create release package using Bluscream-BuildTools
Write-Host "📦 Creating release package..." -ForegroundColor Green

if (-not (Get-Command New-ReleasePackage -ErrorAction SilentlyContinue)) {
    throw "New-ReleasePackage command not found in Bluscream-BuildTools module"
}

# Prepare build workflow info for release package
$buildWorkflowInfo = @{
    ProjectPath     = $ProjectDir
    Configuration   = "production"
    Architecture    = "any"
    Framework       = "node"
    AssemblyName    = "custom"
    OutputDirectory = "./dist/"
    BuiltFiles      = @($mainJsFile)
    CopiedFiles     = @($mainJsFile.FullName)
    ArchivePath     = $null
    Success         = $true
}

$releasePackage = New-ReleasePackage -ReleaseInfo $buildWorkflowInfo -Version $versionTag -ReleaseNotes "VRCX Plugin System $versionTag - TypeScript/Node.js build" -CreateArchives

if (-not $releasePackage -or -not $releasePackage.Success) {
    throw "Release package creation failed"
}

Write-Host "✓ Release package created successfully" -ForegroundColor Green
Write-Host ""

# Step 6: Git operations using Bluscream-BuildTools
Write-Host "📝 Committing changes..." -ForegroundColor Green

if (-not (Get-Command Git-CommitRepository -ErrorAction SilentlyContinue)) {
    throw "Git-CommitRepository command not found in Bluscream-BuildTools module"
}

$commitResult = Git-CommitRepository -Path $ProjectDir -Message "Update VRCX Plugin System $versionTag"
if (-not $commitResult) {
    throw "Git commit failed"
}

if (-not (Get-Command Git-PushRepository -ErrorAction SilentlyContinue)) {
    throw "Git-PushRepository command not found in Bluscream-BuildTools module"
}

$pushResult = Git-PushRepository -Path $ProjectDir
if (-not $pushResult) {
    throw "Git push failed"
}

Write-Host "✓ Committed and pushed using Bluscream-BuildTools" -ForegroundColor Green
Write-Host ""

# Step 7: Create GitHub release (only if -Publish flag is used)
if ($Publish) {
    Write-Host "🚀 Creating GitHub release..." -ForegroundColor Green
    
    if (-not (Get-Command GitHub-CreateRelease -ErrorAction SilentlyContinue)) {
        throw "GitHub-CreateRelease command not found in Bluscream-BuildTools module"
    }
    
    # Prepare release assets
    $releaseAssets = @($mainJsFile.FullName)
    
    # Add archive if it exists
    if ($releasePackage.ArchivePath -and (Test-Path $releasePackage.ArchivePath)) {
        $releaseAssets += $releasePackage.ArchivePath
    }
    
    # Create release notes with download links
    $fileList = $releaseAssets | ForEach-Object { 
        $fileName = Split-Path $_ -Leaf
        "- [$fileName](https://github.com/Bluscream/vrcx-plugin-system/releases/latest/download/$fileName)"
    } | Out-String
    $releaseNotes = "VRCX Plugin System $versionTag`n`nChanges:`n- Update VRCX Plugin System $versionTag`n`nFiles included:`n$fileList"
    
    $releaseResult = GitHub-CreateRelease -Repository "https://github.com/Bluscream/vrcx-plugin-system" -Tag $versionTag -Title "VRCX Plugin System $versionTag" -Notes $releaseNotes -Prerelease -Assets $releaseAssets
    
    if ($releaseResult) {
        Write-Host "✓ Release created using Bluscream-BuildTools: https://github.com/Bluscream/vrcx-plugin-system/releases/tag/$versionTag" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  Release creation failed - fallback actions should have been triggered" -ForegroundColor Yellow
    }
}
else {
    Write-Host "⏭️  Skipping release (use -Publish to create release)" -ForegroundColor Yellow
}

# Step 8: Install to VRCX (if target directory exists)
if (Test-Path $TargetDir) {
    Write-Host "📁 Installing to VRCX..." -ForegroundColor Green
    
    $targetFile = Join-Path $TargetDir "custom.js"
    Copy-Item $mainJsFile.FullName $targetFile -Force
    
    Write-Host "✓ Installed to VRCX: $targetFile" -ForegroundColor Green
}
else {
    Write-Host "⚠️  VRCX directory not found: $TargetDir" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                    ✓ ALL DONE!                             ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📊 Build Summary:" -ForegroundColor Cyan
Write-Host "  Version: $versionTag" -ForegroundColor Gray
Write-Host "  Main File: $($mainJsFile.Name)" -ForegroundColor Gray
Write-Host "  File Size: $([math]::Round($mainJsFile.Length / 1KB, 2)) KB" -ForegroundColor Gray

if ($Publish) {
    Write-Host "📦 Release: https://github.com/Bluscream/vrcx-plugin-system/releases/tag/$versionTag" -ForegroundColor Magenta
    if ($releasePackage.ArchivePath) {
        Write-Host "📁 Release Package: $($releasePackage.ArchivePath)" -ForegroundColor Magenta
    }
}

Write-Host "📍 Built Files: $($mainJsFile.DirectoryName)" -ForegroundColor Cyan
if (Test-Path $TargetDir) {
    Write-Host "📍 VRCX Installation: $TargetDir" -ForegroundColor Cyan
}