/**
 * VRCX Native API Type Declarations
 * Generated from runtime window object inspection
 */

declare global {
  interface Window {
    // VRCX Vue App
    $app?: any;

    // VRCX Utils
    utils: {
      getWorldName(location: string): Promise<string>;
      parseLocation(location: string): ParsedLocation;
      displayLocation(location: string, fallback: string, extra?: string): string;
      isRealInstance(location: string): boolean;
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
        joinGroup(params: { groupId: string }): Promise<{ json: any; params: any }>;
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

    // VRCX Native API
    AppApi?: {
      SendIpc(channel: string, ...args: any[]): void;
      OpenFolderAndSelectItem(path: string, selectItem?: boolean): void;
      GetColourFromUserID(userId: string): Promise<string>;
      [key: string]: any;
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
