# Avatar Logger Plugin

Automatically logs and submits avatar IDs to various avatar database providers, similar to the [VRC-LOG](https://github.com/shaybox/vrc-log) Rust application.

## Features

- **Automatic Avatar Detection**: Captures avatar IDs from multiple sources:
  - Avatar change events (`AvatarChange`)
  - Avatar dialog views (`showAvatarDialog`)
  - Avatar history (`addAvatarToHistory`)
  - Avatar selections (`selectAvatar`)
  - API requests (`getAvatar`)
- **Store Scanning**: Can scan existing VRCX stores on startup:
  - Cached avatars
  - Avatar history
  - Avatar favorites
- **Multi-Provider Support**: Sends avatar IDs to 5 avatar database providers:

  - **avtrDB** - Avatar Search (api.avtrdb.com)
  - **NSVR** - NekoSune Community (avtr.nekosunevr.co.uk)
  - **PAW** - Puppy's Avatar World (paw-api.amelia.fun)
  - **VRCDB** - Avatar Search (search.bs002.de)
  - **VRCWB** - World Balancer (avatar.worldbalancer.com)

- **Smart Processing**:

  - Deduplication (doesn't send the same avatar twice)
  - Rate limiting per provider
  - Batch processing
  - Automatic retry on failures
  - Persistent storage (remembers processed avatars)

- **Statistics Tracking**:
  - Total avatars processed
  - Unique avatars found
  - Per-provider statistics (sent, unique, errors)

## Configuration

### General Settings

- **Enable Avatar Logging**: Master switch to enable/disable the plugin
- **Discord User ID (Attribution)**: Your Discord User ID for attribution (leave empty for anonymous)
- **Log to Console**: Whether to log avatar processing to browser console

### Provider Settings

Enable/disable each provider individually:

- Enable avtrDB
- Enable NSVR
- Enable PAW
- Enable VRCDB
- Enable VRCWB

### Advanced Settings

- **Batch Size**: Number of avatars to process simultaneously (default: 5)
- **Queue Delay (ms)**: Delay between processing batches (default: 2000ms)
- **Retry Attempts**: Number of retry attempts for failed requests (default: 3)
- **Scan Stores on Startup**: Whether to scan avatar stores when you log in (default: true)

## Usage

### Basic Usage

The plugin is **enabled by default**. If you need to enable/disable it:

**Method 1: Via Plugin Manager UI**
1. Enable the `plugin-manager-ui` plugin
2. Navigate to the "Plugins" tab in VRCX
3. Use the toggle to enable/disable Avatar Logger

**Method 2: Via Config File**
Edit `%LOCALAPPDATA%\VRChat\VRChat\config.json`:
```json
{
  "customjs": {
    "plugins": {
      "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/avatar-log.js": true
    }
  }
}
```

**Method 3: Via Console**
```javascript
const config = customjs.configManager.getPluginConfig();
config["https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/avatar-log.js"] = true;
customjs.configManager.setPluginConfig(config);
await customjs.configManager.save();
```

After enabling, the plugin will automatically start capturing avatar IDs from VRCX.

### Configuration

(Optional) Set your Discord User ID in the plugin settings for attribution

### Manual Commands

Access the plugin via the browser console:

```javascript
// Get the plugin instance
const avatarLog = window.customjs.pluginManager.getPlugin("avatar-log");

// View statistics
console.log(avatarLog.getStats());

// Manually trigger a store scan
avatarLog.manualScan();

// Clear all processed avatars (useful for debugging)
avatarLog.clearProcessedAvatars();

// Check current queue status
console.log(`Queue size: ${avatarLog.pendingQueue.size}`);
console.log(`Processed: ${avatarLog.processedAvatars.size}`);
```

## How It Works

1. **Event Hooking**: The plugin hooks into VRCX's avatar-related functions and events
2. **Queue Management**: Avatar IDs are added to a processing queue
3. **Batch Processing**: The queue is processed in batches with delays between batches
4. **Provider Submission**: Each avatar ID is sent to all enabled providers
5. **Persistence**: Processed avatars are saved to localStorage to avoid resubmission

## Statistics Example

```javascript
{
  totalProcessed: 150,
  totalSent: 750,
  totalUnique: 45,
  byProvider: {
    avtrdb: { sent: 150, unique: 45, errors: 0 },
    nsvr: { sent: 150, unique: 43, errors: 2 },
    paw: { sent: 150, unique: 44, errors: 1 },
    vrcdb: { sent: 150, unique: 45, errors: 0 },
    vrcwb: { sent: 150, unique: 45, errors: 0 }
  },
  processedAvatars: 150,
  pendingQueue: 0
}
```

## Attribution

- **Anonymous**: Uses the VRC-LOG developer's Discord ID (default)
- **Custom**: Provide your own Discord User ID in settings

## Notes

- The plugin respects rate limits for each provider
- NSVR provider may go offline occasionally; errors are logged as warnings
- Avatar IDs are validated against the VRChat format before processing
- All data is stored locally in your browser's localStorage
- No avatar files are downloaded or ripped - only IDs are submitted

## Privacy

This plugin sends avatar IDs (not avatars themselves) to public avatar databases. If you don't want your avatars to be searchable, you can:

1. Disable the plugin
2. Request removal from individual providers (see their Discord servers)
3. Only enable specific providers you trust

## Troubleshooting

### Plugin not working

- Check browser console for errors
- Make sure VRCX is fully loaded before the plugin starts
- Verify the plugin is enabled in settings

### No avatars being processed

- Check if "Enable Avatar Logging" is turned on in settings
- Try manually triggering a scan: `avatarLog.manualScan()`
- Check the queue: `avatarLog.pendingQueue.size`

### Rate limiting issues

- Increase "Queue Delay" in advanced settings
- Reduce "Batch Size" to process fewer avatars simultaneously

### Clear and restart

```javascript
avatarLog.clearProcessedAvatars();
avatarLog.manualScan();
```

## Credits

Based on [VRC-LOG](https://github.com/shaybox/vrc-log) by ShayBox.

Avatar database providers:

- [avtrDB](https://avtrdb.com) - [Discord](https://discord.gg/ZxB6w2hGfU)
- [NSVR](https://avtr.nekosunevr.co.uk)
- [PAW](https://paw.amelia.fun) - [Discord](https://discord.gg/zHhs4nQYxX)
- [VRCDB](https://vrcdb.com) - [Discord](https://discord.gg/q427ecnUvj)
- [VRCWB](https://avatar.worldbalancer.com) - [Discord](https://discord.gg/Uw7aAShdsp)
