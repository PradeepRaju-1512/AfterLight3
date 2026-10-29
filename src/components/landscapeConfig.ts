export type LandscapeKey =
  | 'login'
  | 'bot-game'
  | 'multiplayer-lobby'
  | 'multiplayer-create-join'
  | 'multiplayer-room'
  | 'community'
  | 'friends'
  | 'history'
  | 'oop-lab'
  | 'profile';

export interface LandscapeConfig {
  key: LandscapeKey;
  sceneName: string;
  tagline: string;
  imageWebp: string;
  imageFallback: string;
  nearblackWebp?: string;
  enablePointerReveal?: boolean;
  revealIntensity?: number; // max reveal opacity
  darknessOverlay: string; // Tailwind/CSS overlay class or gradient
  ambientMistColor?: string;
  contentScrim?: string;
  mobileFocusY?: string; // Center crop target for mobile
}

export const LANDSCAPE_CONFIGS: Record<LandscapeKey, LandscapeConfig> = {
  // Login / Registration: Mountain Ridge (Photographic asset with near-black base & subtle reveal)
  login: {
    key: 'login',
    sceneName: 'The Mountain Ridge',
    tagline: 'Darkness first. Discovery second.',
    imageWebp: '/images/landscapes/mountain-ridge.webp',
    imageFallback: '/images/landscapes/mountain-ridge.jpeg',
    nearblackWebp: '/images/landscapes/mountain-ridge-nearblack.webp',
    enablePointerReveal: true,
    revealIntensity: 1.0, // Vivid moonlit radial beam following cursor
    darknessOverlay: 'bg-[#080D16]/30',
    ambientMistColor: '#91B7CE',
    mobileFocusY: '30%',
  },

  // Bot Mode: Mountain Ridge (Clear contrast for board composition)
  'bot-game': {
    key: 'bot-game',
    sceneName: 'The Mountain Ridge',
    tagline: 'Silent alpine summits and tactical solitude',
    imageWebp: '/images/landscapes/mountain-ridge.webp',
    imageFallback: '/images/landscapes/mountain-ridge.jpeg',
    enablePointerReveal: false,
    darknessOverlay: 'bg-gradient-to-b from-[#080D16]/70 via-[#080D16]/38 to-[#080D16]/80',
    ambientMistColor: '#91B7CE',
    contentScrim: 'bg-[#0B101B]/80 backdrop-blur-md',
    mobileFocusY: '30%',
  },

  // Main Lobby / Multiplayer Landing: Vast Plain
  'multiplayer-lobby': {
    key: 'multiplayer-lobby',
    sceneName: 'The Vast Plain',
    tagline: 'Expansive moonlit valley and distant peaks',
    imageWebp: '/images/landscapes/vast-plain.webp',
    imageFallback: '/images/landscapes/vast-plain.jpeg',
    enablePointerReveal: false,
    darknessOverlay: 'bg-gradient-to-b from-[#080D16]/65 via-[#080D16]/32 to-[#080D16]/78',
    ambientMistColor: '#DCE8F5',
    mobileFocusY: '40%',
  },

  // Create / Join Room: Crocodile River
  'multiplayer-create-join': {
    key: 'multiplayer-create-join',
    sceneName: 'The Crocodile River',
    tagline: 'Still water, lantern-lit boat, and watchful banks',
    imageWebp: '/images/landscapes/crocodile-river.webp',
    imageFallback: '/images/landscapes/crocodile-river.jpeg',
    enablePointerReveal: false,
    darknessOverlay: 'bg-gradient-to-b from-[#080D16]/65 via-[#080D16]/35 to-[#080D16]/82',
    ambientMistColor: '#D99A4E',
    mobileFocusY: '45%',
  },

  // Active Multiplayer Match: Crocodile River
  'multiplayer-room': {
    key: 'multiplayer-room',
    sceneName: 'The Crocodile River',
    tagline: 'A shared chamber upon the moonlit waters',
    imageWebp: '/images/landscapes/crocodile-river.webp',
    imageFallback: '/images/landscapes/crocodile-river.jpeg',
    enablePointerReveal: false,
    darknessOverlay: 'bg-gradient-to-b from-[#080D16]/68 via-[#080D16]/38 to-[#080D16]/85',
    ambientMistColor: '#91A3B5',
    contentScrim: 'bg-[#0B101B]/85 backdrop-blur-md',
    mobileFocusY: '45%',
  },

  // Community / Player Discovery: Ancient Tree
  community: {
    key: 'community',
    sceneName: 'The Ancient Tree',
    tagline: 'The gathering place of midnight explorers',
    imageWebp: '/images/landscapes/ancient-tree.webp',
    imageFallback: '/images/landscapes/ancient-tree.jpeg',
    enablePointerReveal: false,
    darknessOverlay: 'bg-gradient-to-b from-[#080D16]/68 via-[#080D16]/38 to-[#080D16]/78',
    ambientMistColor: '#91B7CE',
    mobileFocusY: '35%',
  },

  // Friends / Social Roster: Ancient Tree
  friends: {
    key: 'friends',
    sceneName: 'The Ancient Tree',
    tagline: 'Kindred wanderers united beneath ancient roots',
    imageWebp: '/images/landscapes/ancient-tree.webp',
    imageFallback: '/images/landscapes/ancient-tree.jpeg',
    enablePointerReveal: false,
    darknessOverlay: 'bg-gradient-to-b from-[#080D16]/68 via-[#080D16]/38 to-[#080D16]/78',
    ambientMistColor: '#91A3B5',
    mobileFocusY: '35%',
  },

  // Match History / Chronicles: Moonlit River
  history: {
    key: 'history',
    sceneName: 'The Moonlit River',
    tagline: 'A journal of past encounters upon flowing waters',
    imageWebp: '/images/landscapes/moonlit-river.webp',
    imageFallback: '/images/landscapes/moonlit-river.jpeg',
    enablePointerReveal: false,
    darknessOverlay: 'bg-gradient-to-b from-[#080D16]/68 via-[#080D16]/38 to-[#080D16]/82',
    ambientMistColor: '#DCE8F5',
    mobileFocusY: '35%',
  },


  // OOP Lab: Ancient Tree
  'oop-lab': {
    key: 'oop-lab',
    sceneName: 'The Ancient Tree',
    tagline: 'Deep roots of C++ object-oriented architecture and templates',
    imageWebp: '/images/landscapes/ancient-tree.webp',
    imageFallback: '/images/landscapes/ancient-tree.jpeg',
    enablePointerReveal: false,
    darknessOverlay: 'bg-[#080D16]/82 backdrop-blur-sm',
    ambientMistColor: '#91B7CE',
    contentScrim: 'bg-[#0B101B]/92 backdrop-blur-md',
    mobileFocusY: '30%',
  },

  // Player Profile: Ancient Tree
  profile: {
    key: 'profile',
    sceneName: 'The Ancient Tree',
    tagline: 'Your mark on the wilderness',
    imageWebp: '/images/landscapes/ancient-tree.webp',
    imageFallback: '/images/landscapes/ancient-tree.jpeg',
    enablePointerReveal: false,
    darknessOverlay: 'bg-gradient-to-b from-[#080D16]/68 via-[#080D16]/38 to-[#080D16]/78',
    ambientMistColor: '#DCE8F5',
    mobileFocusY: '35%',
  },
};

export function getLandscapeForRoute(route: string, subState?: string): LandscapeConfig {
  if (route === 'multiplayer') {
    if (subState === 'in-room') {
      return LANDSCAPE_CONFIGS['multiplayer-room'];
    }
    return LANDSCAPE_CONFIGS['multiplayer-create-join'];
  }

  const match = LANDSCAPE_CONFIGS[route as LandscapeKey];
  return match || LANDSCAPE_CONFIGS['bot-game'];
}
