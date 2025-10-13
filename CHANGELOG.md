# Changelog

All notable changes to the VRCX Plugin System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2024-01-XX (TBD)

### 🎉 Major Refactor: TypeScript + Build System

This is a complete rewrite of the VRCX Plugin System with TypeScript and modern build tooling.

### Added

- **TypeScript Support**

  - All core modules converted from JavaScript to TypeScript
  - Type definitions in `src/types/index.ts`
  - Full type safety and IDE autocomplete

- **Build System**

  - webpack configuration for bundling
  - Single `dist/custom.js` output file
  - Minification with Terser
  - Development and production build modes
  - Watch mode for auto-rebuild during development

- **Project Structure**

  - `package.json` for npm dependencies
  - `tsconfig.json` for TypeScript configuration
  - `webpack.config.js` for bundler configuration
  - `.gitignore` to exclude build artifacts and dependencies

- **Documentation**

  - Comprehensive `README.md` with setup and usage guide
  - `MIGRATION-GUIDE.md` for v2.x users
  - `CHANGELOG.md` (this file)
  - `plugin-template.js` with JSDoc annotations for plugin developers

- **Build Scripts**

  - `npm run build` - Production build (minified)
  - `npm run build:dev` - Development build (unminified)
  - `npm run watch` - Watch mode for auto-rebuild
  - `npm run clean` - Clean build artifacts

- **Deployment**

  - Updated `update.ps1` PowerShell script
  - Automated build and copy to VRCX AppData
  - Dependency checking and installation

- **GitHub Actions**
  - `build-and-release.yml` workflow
  - Manual trigger for creating releases
  - Automatic versioning with Unix timestamp
  - Release artifacts uploaded to GitHub Releases
  - Downloadable via `https://github.com/vrcx-plugin-system/vrcx-plugin-system/releases/latest/download/custom.js`

### Changed

- **Core Modules** (now bundled at build-time instead of loaded at runtime)

  - `Logger` - Standalone class (no longer extends `CoreModule`)
  - `ConfigManager` - Standalone class with same API
  - `SettingsStore` - Converted to TypeScript
  - `utils` - Exported as object with utility functions
  - `Plugin` - Refactored class with cleaner structure
  - `PluginLoader` - Now only handles remote plugins
  - `PluginManager` - Simplified lifecycle management

- **Architecture**

  - Removed `Module` base class
  - Removed `CoreModule` base class
  - Removed `ModuleLoader` class (replaced by webpack)
  - Core modules no longer downloaded at runtime
  - Bootstrap process simplified (no module loading phase)

- **Plugin URLs**

  - Plugins moved to separate repository: `https://github.com/vrcx-plugin-system/plugins`
  - Updated all default plugin URLs to new repository
  - Old URL format: `https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/*.js`
  - New URL format: `https://raw.githubusercontent.com/vrcx-plugin-system/plugins/main/*.js`

- **Build Output**
  - Single bundled `dist/custom.js` file (~150KB minified)
  - No source maps (inline source code)
  - No separate module files
  - Faster VRCX startup (no network requests for core modules)

### Removed

- **Runtime Module Loading**

  - No more downloading core modules from GitHub
  - No more `coreModules` array in `ModuleLoader`
  - No more module loading timeout handling

- **Base Classes**

  - `Module` class removed
  - `CoreModule` class removed
  - Modules no longer inherit from base classes

- **Legacy Files**
  - Old `custom.js` (replaced with bundled version)
  - Old `js/logger.js`, `js/config.js`, `js/utils.js`, `js/plugin.js`
  - Old `update.ps1` (replaced with build-aware version)

### Fixed

- **Type Safety**

  - Fixed type errors with proper TypeScript definitions
  - Improved type inference for plugin developers
  - Better IDE autocomplete and error detection

- **Build Reliability**
  - Consistent builds with webpack
  - No runtime dependency on external URLs
  - Faster and more reliable startup

### Deprecated

- **Old Plugin URLs**
  - Plugins should migrate to new repository URLs
  - Old URLs will eventually stop working
  - See MIGRATION-GUIDE.md for update instructions

### Security

- **Build-time Bundling**
  - Core code is now bundled and served locally
  - Reduced attack surface (fewer runtime network requests)
  - Code integrity ensured by bundling

## [2.3.0] - 2024-XX-XX (Previous Version)

### Features (Pre-refactor)

- Module base classes (`Module`, `CoreModule`)
- Runtime module loading system (`ModuleLoader`)
- Core modules loaded from GitHub at startup
- Plugin system with lifecycle management
- Hook system (pre, post, void, replace)
- Equicord-inspired settings system
- Logger with multiple output targets
- ConfigManager with localStorage backend
- Utility functions for common tasks

## Migration Notes

### From 2.x to 3.0

**For Users:**

1. Install Node.js 20+
2. Clone new repository
3. Run `npm install`
4. Run `npm run build`
5. Run `.\update.ps1` (or manually copy `dist/custom.js`)
6. Restart VRCX

**For Plugin Developers:**

- No code changes required!
- Plugins continue to work as-is
- Update plugin URLs if self-hosting
- Use JSDoc annotations for type hints

**For Core Developers:**

- Learn TypeScript basics
- Understand webpack bundling
- Follow new project structure
- Use `npm run watch` for development

See `MIGRATION-GUIDE.md` for detailed instructions.

## Future Plans

### [3.1.0] - Planned

- Hot module replacement (HMR) for faster development
- Plugin hot-reloading without VRCX restart
- Improved error reporting and debugging
- Plugin marketplace integration
- Auto-update system for core modules

### [3.2.0] - Planned

- React UI for plugin management
- Visual settings editor
- Plugin dependency resolution
- Plugin permissions system
- Sandboxed plugin execution

### [4.0.0] - Future

- Electron integration for native features
- Native plugin API (C#/C++ plugins)
- Standalone plugin development toolkit
- Plugin distribution via npm
- Official plugin registry

## Breaking Changes

### 3.0.0

- **Module Base Classes Removed**

  - `Module`, `CoreModule`, `ModuleLoader` no longer exist
  - Core modules must be refactored to standalone classes/functions

- **Build System Required**

  - Node.js 20+ now required for development
  - Must run `npm install` and `npm run build`
  - Cannot edit `custom.js` directly anymore (edit `src/` files)

- **Plugin URL Changes**

  - All default plugin URLs changed to new repository
  - Old URLs will break when old repository is archived
  - Update configs to use new URLs

- **Distribution Changes**
  - Core modules no longer served as separate files
  - Must use bundled `dist/custom.js`
  - Cannot load core modules individually

## Repository History

- **v2.x and earlier:** https://github.com/Bluscream/vrcx-custom
- **v3.0+:** https://github.com/vrcx-plugin-system/vrcx-plugin-system
- **Plugins:** https://github.com/vrcx-plugin-system/plugins

## Links

- [GitHub Repository](https://github.com/vrcx-plugin-system/vrcx-plugin-system)
- [Plugins Repository](https://github.com/vrcx-plugin-system/plugins)
- [Issue Tracker](https://github.com/vrcx-plugin-system/vrcx-plugin-system/issues)
- [Releases](https://github.com/vrcx-plugin-system/vrcx-plugin-system/releases)
- [VRCX](https://github.com/vrcx-team/VRCX)

---

**Legend:**

- 🎉 Major release
- ✨ New feature
- 🔧 Bug fix
- 📝 Documentation
- ⚠️ Breaking change
- 🔒 Security fix
