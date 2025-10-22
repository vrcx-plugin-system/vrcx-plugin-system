/**
 * Pinia Store Type Declarations for VRCX
 */

declare global {
  interface Window {
    $pinia?: {
      location?: any;
      user?: any;
      game?: any;
      gameLog?: any;
      friends?: any;
      ui?: any;
      world?: any;
      avatar?: any;
      group?: any;
      launch?: any;
      gallery?: any;
      favorite?: any;
      instance?: any;
      vrcx?: any;
      vrcxUpdater?: any;
      invite?: any;
      avatarProvider?: any;
      vrcStatus?: any;
      [key: string]: any;
    };
  }
}

export {};
