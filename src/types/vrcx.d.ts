/**
 * VRCX Native API Type Declarations
 * Updated to match VRCX rewrite (Vue 3 + Pinia + Vite)
 * Generated from runtime window object inspection and globals.d.ts
 */

declare global {
  interface Window {
    // VRCX Pinia stores (replaces legacy $app Vue instance)
    $pinia: any;

    // VRCX VR overlay reference
    $vr: any;

    // VRCX Debug settings
    $debug: {
      debug: boolean;
      debugWebSocket: boolean;
      debugUserDiff: boolean;
      debugPhotonLogging: boolean;
      debugGameLog: boolean;
      debugWebRequests: boolean;
      debugFriendState: boolean;
      debugRecompute: boolean;
      debugIPC: boolean;
      debugVrcPlus: boolean;
      errorNoty: any;
      dontLogMeOut: boolean;
      endpointDomain: string;
      endpointDomainVrchat: string;
      websocketDomain: string;
      websocketDomainVrchat: string;
    };

    // VRCX Utils (exposed from src/shared/utils via src/services/appConfig.js)
    utils: {
      parseLocation(location: string): ParsedLocation;
      displayLocation(location: string, fallback: string, extra?: string): string;
      isRealInstance(location: string): boolean;
      getWorldName(location: string): Promise<string>;
      getGroupName(groupIdOrLocation: string): Promise<string>;
      copyToClipboard(text: string, message?: string): void;
      openExternalLink(url: string): void;
      replaceBioSymbols(text: string): string;
      timeToText(milliseconds: number, short?: boolean): string;
      commaNumber(num: number | string): string;
      formatDateFilter(date: string, format?: string): string;
      escapeTag(text: string): string;
      removeEmojis(text: string): string;
      userImage(user: any, fallback?: boolean, size?: string, useIcon?: boolean): string;
      checkCanInvite(location: string): boolean;
      checkCanInviteSelf(location: string): boolean;
      [key: string]: any;
    };

    // Day.js instance
    dayjs: any;

    // Config repository
    configRepository: any;

    // Database service
    database: any;

    // Game log service
    gameLogService: any;

    // SQLite service
    sqliteService: any;

    // VRCX Request API
    request: {
      request(endpoint: string, options?: any): Promise<any>;
      
      userRequest: {
        getUser(params: { userId: string }): Promise<{ json: any; params: any; ref: any }>;
        getCachedUser(params: { userId: string }): Promise<{ json: any; params: any; ref: any }>;
        getUsers(params: any): Promise<{ json: any; params: any }>;
        saveCurrentUser(params: any): Promise<{ json: any; params: any }>;
        addUserTags(params: { tags: string[] }): Promise<{ json: any; params: any }>;
        removeUserTags(params: { tags: string[] }): Promise<{ json: any; params: any }>;
        getUserFeedback(params: { userId: string }): Promise<{ json: any; params: any }>;
        getUserNotes(params: any): Promise<{ json: any; params: any }>;
      };

      worldRequest: {
        getWorld(params: { worldId: string }): Promise<{ json: any; params: any; ref: any }>;
        getCachedWorld(params: { worldId: string }): Promise<{ json: any; params: any; ref: any }>;
        getWorlds(params: any, worldId?: string): Promise<{ json: any; params: any }>;
        saveWorld(params: any): Promise<{ json: any; params: any }>;
        deleteWorld(params: { worldId: string }): Promise<{ json: any; params: any }>;
        publishWorld(params: { worldId: string }): Promise<{ json: any; params: any }>;
        unpublishWorld(params: { worldId: string }): Promise<{ json: any; params: any }>;
        uploadWorldImage(params: any): Promise<{ json: any; params: any }>;
      };

      instanceRequest: {
        getInstance(params: { worldId: string; instanceId: string }): Promise<{ json: any; params: any; ref: any }>;
        getCachedInstance(params: { worldId: string; instanceId: string }): Promise<{ json: any; params: any; ref: any }>;
        createInstance(params: any): Promise<{ json: any; params: any }>;
        selfInvite(params: { instanceId: string; worldId: string; shortName?: string }): Promise<{ json: any; params: any }>;
        getInstanceShortName(params: { worldId: string; instanceId: string; shortName?: string }): Promise<{ json: any; params: any }>;
        getInstanceFromShortName(params: { shortName: string }): Promise<{ json: any; params: any }>;
      };

      friendRequest: {
        getFriends(params: any): Promise<{ json: any; params: any }>;
        sendFriendRequest(params: { userId: string }): Promise<{ json: any; params: any }>;
        cancelFriendRequest(params: { userId: string }): Promise<{ json: any; params: any }>;
        deleteFriend(params: { userId: string }): Promise<{ json: any; params: any }>;
        getFriendStatus(params: { userId: string }): Promise<{ json: any; params: any }>;
        deleteHiddenFriendRequest(params: any, userId: string): Promise<{ json: any; params: any }>;
      };

      avatarRequest: {
        getAvatar(params: { avatarId: string }): Promise<{ json: any; params: any }>;
        getAvatars(params: any): Promise<{ json: any; params: any }>;
        saveAvatar(params: any): Promise<{ json: any; params: any }>;
        selectAvatar(params: { avatarId: string }): Promise<{ json: any; params: any }>;
        selectFallbackAvatar(params: { avatarId: string }): Promise<{ json: any; params: any }>;
        deleteAvatar(params: { avatarId: string }): Promise<{ json: any; params: any }>;
        createImposter(params: { avatarId: string }): Promise<{ json: any; params: any }>;
        deleteImposter(params: { avatarId: string }): Promise<{ json: any; params: any }>;
        uploadAvatarImage(params: any): Promise<{ json: any; params: any }>;
      };

      notificationRequest: {
        getNotifications(params: any): Promise<{ json: any; params: any }>;
        getNotificationsV2(params: any): Promise<{ json: any; params: any }>;
        sendInvite(params: { 
          instanceId: string; 
          worldId: string; 
          worldName?: string;
          message?: string;
          messageSlot?: number;
        }, receiverUserId: string): Promise<{ json: any; params: any; receiverUserId: string }>;
        sendInvitePhoto(params: any, receiverUserId: string): Promise<{ json: any; params: any }>;
        sendRequestInvite(params: { 
          instanceId: string; 
          worldId: string; 
          worldName?: string;
          message?: string;
          messageSlot?: number;
        }, receiverUserId: string): Promise<{ json: any; params: any; receiverUserId: string }>;
        sendRequestInvitePhoto(params: any, receiverUserId: string): Promise<{ json: any; params: any }>;
        sendInviteResponse(params: any, inviteId: string): Promise<{ json: any; params: any }>;
        sendInviteResponsePhoto(params: any, inviteId: string): Promise<{ json: any; params: any }>;
        acceptFriendRequestNotification(params: { notificationId: string }): Promise<{ json: any; params: any }>;
        hideNotification(params: { notificationId: string }): Promise<{ json: any; params: any }>;
        hideNotificationV2(notificationId: string): Promise<{ json: any; params: any }>;
        sendNotificationResponse(params: { notificationId: string }): Promise<{ json: any; params: any }>;
      };

      groupRequest: {
        getGroup(params: { groupId: string }): Promise<{ json: any; params: any; ref: any }>;
        getCachedGroup(params: { groupId: string }): Promise<{ json: any; params: any }>;
        getGroups(params: { userId: string }): Promise<{ json: any; params: any }>;
        getRepresentedGroup(params: { userId: string }): Promise<{ json: any; params: any }>;
        getGroupMember(params: { groupId: string; userId: string }): Promise<{ json: any; params: any }>;
        joinGroup(params: { groupId: string }): Promise<{ json: { membershipStatus: 'member' | 'requested' | string }; params: any }>;
        leaveGroup(params: { groupId: string }): Promise<{ json: any; params: any }>;
        sendGroupInvite(params: { groupId: string; userId: string }): Promise<{ json: any; params: any }>;
        [key: string]: any;
      };

      inviteMessagesRequest: {
        refreshInviteMessageTableData(messageType: 'message' | 'response' | 'request' | 'requestResponse'): Promise<{ json: any; messageType: string }>;
        editInviteMessage(
          params: { message: string }, 
          messageType: 'message' | 'response' | 'request' | 'requestResponse',
          slot: number
        ): Promise<{ json: any; params: any; messageType: string; slot: number }>;
      };

      [key: string]: any;
    };

    // VRCX Native API (CefSharp / Electron IPC bridge)
    AppApi?: {
      // Basic App Functions
      ShowDevTools(): Promise<void>;
      SetVR(active: boolean, hmdOverlay: boolean, wristOverlay: boolean, menuButton: boolean, overlayHand: number): Promise<void>;
      SetZoom(zoomLevel: number): Promise<void>;
      GetZoom(): Promise<number>;
      DesktopNotification(boldText: string, text?: string, image?: string): Promise<void>;
      RestartApplication(isUpgrade: boolean): Promise<void>;
      CheckForUpdateExe(): Promise<boolean>;
      ExecuteVrOverlayFunction(key: string, json: string): Promise<void>;
      FocusWindow(): Promise<void>;
      ChangeTheme(value: number): Promise<void>;
      DoFunny(): Promise<void>;
      GetClipboard(): Promise<string>;
      SetStartup(enabled: boolean): Promise<void>;
      CopyImageToClipboard(path: string): Promise<void>;
      FlashWindow(): Promise<void>;
      SetUserAgent(): Promise<void>;
      SetTrayIconNotification(notify: boolean): Promise<void>;
      OpenCalendarFile(icsContent: string): Promise<void>;

      // Common Functions
      GetColourFromUserID(userId: string): Promise<number>;
      GetColourBulk(userIds: string[]): Promise<Record<string, number>>;
      OpenLink(url: string): Promise<void>;
      OpenDiscordProfile(discordId: string): Promise<void>;
      GetLaunchCommand(): Promise<string>;
      IPCAnnounceStart(): Promise<void>;
      SendIpc(type: string, data: string): Promise<void>;
      CustomCss(): Promise<string>;
      CustomScript(): Promise<string>;
      CurrentCulture(): Promise<string>;
      CurrentLanguage(): Promise<string>;
      GetVersion(): Promise<string>;
      VrcClosedGracefully(): Promise<boolean>;
      SetAppLauncherSettings(enabled: boolean, killOnExit: boolean, runProcessOnce: boolean): Promise<void>;
      GetFileBase64(path: string): Promise<string | null>;
      TryOpenInstanceInVrc(launchUrl: string): Promise<boolean>;

      // Folders
      GetVRChatAppDataLocation(): Promise<string>;
      GetVRChatPhotosLocation(): Promise<string>;
      GetUGCPhotoLocation(path?: string): Promise<string>;
      GetVRChatScreenshotsLocation(): Promise<string>;
      GetVRChatCacheLocation(): Promise<string>;
      OpenVrcxAppDataFolder(): Promise<boolean>;
      OpenVrcAppDataFolder(): Promise<boolean>;
      OpenVrcPhotosFolder(): Promise<boolean>;
      OpenUGCPhotosFolder(ugcPath?: string): Promise<boolean>;
      OpenVrcScreenshotsFolder(): Promise<boolean>;
      OpenCrashVrcCrashDumps(): Promise<boolean>;
      OpenShortcutFolder(): Promise<void>;
      OpenFolderAndSelectItem(path: string, isFolder?: boolean): Promise<void>;
      OpenFolderSelectorDialog(defaultPath?: string): Promise<string>;
      OpenFileSelectorDialog(defaultPath?: string, defaultExt?: string, defaultFilter?: string): Promise<string>;

      // Game Handler
      OnProcessStateChanged(monitoredProcess: any): Promise<void>;
      CheckGameRunning(): Promise<void>;
      IsGameRunning(): Promise<boolean>;
      IsSteamVRRunning(): Promise<boolean>;
      QuitGame(): Promise<number>;
      StartGame(args: string): Promise<boolean>;
      StartGameFromPath(path: string, args: string): Promise<boolean>;

      // Registry
      GetVRChatRegistryKey(key: string): Promise<any>;
      GetVRChatRegistryKeyString(key: string): Promise<string>;
      SetVRChatRegistryKey(key: string, value: any, typeInt: number): Promise<boolean>;
      GetVRChatRegistry(): Promise<Record<string, Record<string, any>>>;
      SetVRChatRegistry(json: string): Promise<void>;
      HasVRChatRegistryFolder(): Promise<boolean>;
      DeleteVRChatRegistryFolder(): Promise<void>;
      ReadVrcRegJsonFile(filepath: string): Promise<string>;
      GetVRChatRegistryJson: () => Promise<string>;

      // Image Functions
      PopulateImageHosts(json: string): Promise<void>;
      GetImage(url: string, fileId: string, version: string): Promise<string>;
      ResizeImageToFitLimits(base64data: string): Promise<string>;
      CropAllPrints(ugcFolderPath: string): Promise<void>;
      CropPrintImage(path: string): Promise<boolean>;
      SavePrintToFile(url: string, ugcFolderPath: string, monthFolder: string, fileName: string): Promise<string>;
      SaveStickerToFile(url: string, ugcFolderPath: string, monthFolder: string, fileName: string): Promise<string>;
      SaveEmojiToFile(url: string, ugcFolderPath: string, monthFolder: string, fileName: string): Promise<string>;

      // Image Upload (Cef Only)
      MD5File(blob: string): Promise<string>;
      SignFile(blob: string): Promise<string>;
      FileLength(blob: string): Promise<string>;

      // Screenshot
      AddScreenshotMetadata(path: string, metadataString: string, worldId: string, changeFilename?: boolean): Promise<string>;
      GetExtraScreenshotData(path: string, carouselCache: boolean): Promise<string>;
      GetScreenshotMetadata(path: string): Promise<string>;
      FindScreenshotsBySearch(searchQuery: string, searchType?: number): Promise<string>;
      GetLastScreenshot(): Promise<string>;
      DeleteScreenshotMetadata(path: string): Promise<boolean>;
      DeleteAllScreenshotMetadata(): Promise<void>;

      // Moderations
      GetVRChatModerations(currentUserId: string): Promise<Record<string, number> | null>;
      GetVRChatUserModeration(currentUserId: string, userId: string): Promise<number>;
      SetVRChatUserModeration(currentUserId: string, userId: string, type: number): Promise<boolean>;

      // VRC Config
      ReadConfigFile(): Promise<string>;
      ReadConfigFileSafe(): Promise<string>;
      WriteConfigFile(json: string): Promise<void>;

      // Update
      DownloadUpdate(fileUrl: string, hashString: string, downloadSize: number): Promise<void>;
      CancelUpdate(): Promise<void>;
      CheckUpdateProgress(): Promise<number>;

      // Notifications
      XSNotification(title: string, content: string, timeout: number, opacity: number, image?: string): Promise<void>;
      OVRTNotification(hudNotification: boolean, wristNotification: boolean, title: string, body: string, timeout: number, opacity: number, image?: string): Promise<void>;

      [key: string]: any;
    };

    // VRCX VR API
    AppApiVr?: {
      Init(): Promise<void>;
      VrInit(): Promise<void>;
      ToggleSystemMonitor(enabled: boolean): Promise<void>;
      CpuUsage(): Promise<number>;
      GetVRDevices(): Promise<string[][]>;
      GetUptime(): Promise<number>;
      CurrentCulture(): Promise<string>;
      CustomVrScript(): Promise<string>;
      GetExecuteVrOverlayFunctionQueue(): Promise<Map<string, string>>;
    };

    // VRCX Storage API
    VRCXStorage: {
      Get(key: string): Promise<string>;
      Set(key: string, value: string): Promise<void>;
      Remove(key: string): Promise<void>;
      GetAll(): Promise<string>;
      Flush(): Promise<void>;
      Save(): Promise<void>;
      Load(): Promise<void>;
      GetArray(key: string): Promise<any[]>;
      SetArray(key: string, value: any[]): Promise<void>;
      GetObject(key: string): Promise<object>;
      SetObject(key: string, value: object): Promise<void>;
    };

    // SQLite API
    SQLite: {
      Execute(sql: string, args: string): Promise<any[]>;
      ExecuteJson(sql: string, args: string): Promise<string>;
      ExecuteNonQuery(sql: string, args: string): Promise<number>;
    };

    // Log Watcher
    LogWatcher: {
      Get(): Promise<Array<[string, string, string, ...any[]]>>;
      SetDateTill(date: string): Promise<void>;
      GetLogLines(): Array<any>;
      Reset(): Promise<void>;
    };

    // Web API Service (Electron)
    webApiService?: {
      clearCookies(): Promise<void>;
      getCookies(): Promise<string>;
      setCookies(cookie: string): Promise<void>;
      execute(options: {
        url: string;
        method?: string;
        uploadFilePUT?: boolean;
        fileData?: string;
        fileMIME?: string;
        fileMD5?: string;
        headers?: Record<string, string>;
        data?: any;
      }): Promise<{ status: number; data: string }>;
    };
  }

  // Helper Types
  interface ParsedLocation {
    tag: string;
    isOffline: boolean;
    isPrivate: boolean;
    isTraveling: boolean;
    isRealInstance: boolean;
    worldId: string;
    instanceId: string;
    instanceName: string;
    accessType: 'public' | 'friends' | 'friends+' | 'invite' | 'invite+' | 'group' | 'groupPublic' | 'groupPlus' | string;
    region: string;
    ownerId: string;
    groupId: string;
    groupAccessType: string;
    nonce: string;
    canRequestInvite: boolean;
    shortName: string;
    userId: string;
    hiddenId: string;
    privateId: string;
    friendsId: string;
    canRequestInv: boolean;
    strict: boolean;
  }
}

export {};
