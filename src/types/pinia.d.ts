/**
 * Pinia Store Type Declarations for VRCX
 * Matches createGlobalStores() in src/stores/index.js
 */

declare global {
  interface Window {
    $pinia?: {
      // Settings stores
      advancedSettings?: any;
      appearanceSettings?: any;
      discordPresenceSettings?: any;
      generalSettings?: any;
      notificationsSettings?: any;
      wristOverlaySettings?: any;

      // Core data stores
      activity?: any;
      auth?: any;
      avatar?: any;
      avatarProvider?: any;
      charts?: any;
      dashboard?: any;
      favorite?: any;
      feed?: any;
      friend?: any;
      gallery?: any;
      game?: any;
      gameLog?: any;
      group?: any;
      instance?: any;
      invite?: any;
      launch?: any;
      location?: any;
      modal?: any;
      moderation?: any;
      notification?: any;
      photon?: any;
      quickSearch?: any;
      search?: any;
      sharedFeed?: any;
      tools?: any;
      ui?: any;
      updateLoop?: any;
      user?: any;
      vr?: any;
      vrcStatus?: any;
      vrcx?: any;
      vrcxUpdater?: any;
      world?: any;

      [key: string]: any;
    };
  }
}

export {};
