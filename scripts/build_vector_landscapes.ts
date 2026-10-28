import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, '..', 'public', 'images', 'landscapes');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

interface SceneParams {
  id: string;
  title: string;
  moonPos: { cx: number; cy: number; r: number };
  amberGlow?: { cx: number; cy: number; r: number; opacity: number };
  customDefs?: string;
  farBackground: string;
  midMountains: string;
  forestLayers: string;
  focalFeature: string;
  foregroundDetails: string;
}

function generateSvg(scene: SceneParams, isDark = false): string {
  const skyDark1 = isDark ? '#030508' : '#070D18';
  const skyDark2 = isDark ? '#050912' : '#0D1728';
  const skyDark3 = isDark ? '#080E1C' : '#14223A';
  
  const moonOpacity = isDark ? '0.12' : '0.98';
  const moonGlowOpacity1 = isDark ? '0.04' : '0.45';
  const moonGlowOpacity2 = isDark ? '0.02' : '0.22';

  const mountainFarFill = isDark ? '#070B14' : '#121C2B';
  const mountainMidFill = isDark ? '#050810' : '#0E1724';
  const forestFarFill = isDark ? '#04070C' : '#0A121D';
  const forestMidFill = isDark ? '#030509' : '#070E17';
  const foregroundFill = isDark ? '#020306' : '#050A11';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
  <defs>
    <!-- Sky Gradient -->
    <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${skyDark1}" />
      <stop offset="55%" stop-color="${skyDark2}" />
      <stop offset="100%" stop-color="${skyDark3}" />
    </linearGradient>

    <!-- Moon Halos -->
    <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#E2EEF9" stop-opacity="${moonGlowOpacity1}" />
      <stop offset="45%" stop-color="#91B7CE" stop-opacity="${moonGlowOpacity2}" />
      <stop offset="100%" stop-color="#070D18" stop-opacity="0" />
    </radialGradient>

    <!-- Mist Band -->
    <linearGradient id="mistHaze" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#91B7CE" stop-opacity="0" />
      <stop offset="50%" stop-color="#91B7CE" stop-opacity="${isDark ? '0.05' : '0.18'}" />
      <stop offset="100%" stop-color="#91B7CE" stop-opacity="0" />
    </linearGradient>

    ${scene.customDefs || ''}
  </defs>

  <!-- 1. Deep Celestial Sky -->
  <rect width="1920" height="1080" fill="url(#skyGrad)" />

  <!-- Stars Field -->
  <g opacity="${isDark ? '0.3' : '0.8'}">
    <!-- Tiny star points -->
    <circle cx="120" cy="85" r="1.2" fill="#E2EEF9" />
    <circle cx="280" cy="140" r="1.5" fill="#E2EEF9" opacity="0.9" />
    <circle cx="430" cy="70" r="1" fill="#E2EEF9" opacity="0.7" />
    <circle cx="560" cy="190" r="1.4" fill="#E2EEF9" />
    <circle cx="710" cy="110" r="1.2" fill="#E2EEF9" />
    <circle cx="880" cy="65" r="1.8" fill="#E2EEF9" opacity="0.9" />
    <circle cx="1040" cy="130" r="1" fill="#E2EEF9" />
    <circle cx="1180" cy="80" r="1.5" fill="#E2EEF9" />
    <circle cx="1320" cy="160" r="1.3" fill="#E2EEF9" />
    <circle cx="1470" cy="95" r="1.7" fill="#E2EEF9" opacity="0.8" />
    <circle cx="1620" cy="140" r="1.1" fill="#E2EEF9" />
    <circle cx="1780" cy="75" r="1.6" fill="#E2EEF9" />
    <circle cx="1860" cy="180" r="1.2" fill="#E2EEF9" />
    <circle cx="340" cy="240" r="1.1" fill="#E2EEF9" opacity="0.6" />
    <circle cx="850" cy="220" r="1.3" fill="#E2EEF9" opacity="0.7" />
    <circle cx="1250" cy="240" r="1.2" fill="#E2EEF9" opacity="0.6" />
    <circle cx="1680" cy="230" r="1.4" fill="#E2EEF9" opacity="0.8" />
  </g>

  <!-- 2. Luminous Moon & Celestial Halo -->
  <circle cx="${scene.moonPos.cx}" cy="${scene.moonPos.cy}" r="${scene.moonPos.r * 4.5}" fill="url(#moonGlow)" />
  <circle cx="${scene.moonPos.cx}" cy="${scene.moonPos.cy}" r="${scene.moonPos.r * 2.2}" fill="url(#moonGlow)" opacity="0.8" />
  <circle cx="${scene.moonPos.cx}" cy="${scene.moonPos.cy}" r="${scene.moonPos.r}" fill="#EDF4FA" opacity="${moonOpacity}" />
  <!-- Subtle Moon texture / crater shadow -->
  <g opacity="${isDark ? '0.05' : '0.2'}">
    <circle cx="${scene.moonPos.cx - scene.moonPos.r * 0.2}" cy="${scene.moonPos.cy - scene.moonPos.r * 0.1}" r="${scene.moonPos.r * 0.25}" fill="#90A8C0" />
    <circle cx="${scene.moonPos.cx + scene.moonPos.r * 0.25}" cy="${scene.moonPos.cy + scene.moonPos.r * 0.15}" r="${scene.moonPos.r * 0.3}" fill="#90A8C0" />
    <circle cx="${scene.moonPos.cx - scene.moonPos.r * 0.05}" cy="${scene.moonPos.cy + scene.moonPos.r * 0.3}" r="${scene.moonPos.r * 0.22}" fill="#90A8C0" />
  </g>

  <!-- 3. Distant Horizon Mountain Silhouettes -->
  <g fill="${mountainFarFill}">
    ${scene.farBackground}
  </g>

  <!-- Atmospheric Haze Band -->
  <rect y="380" width="1920" height="220" fill="url(#mistHaze)" />

  <!-- 4. Midground Peaks and Ridges -->
  <g fill="${mountainMidFill}">
    ${scene.midMountains}
  </g>

  <!-- 5. Layered Pine Forests & Valleys -->
  <g fill="${forestFarFill}">
    ${scene.forestLayers}
  </g>

  <!-- 6. Focal Scenery / Feature (Waterfall, River, Great Tree, Plains, Trail) -->
  <g>
    ${scene.focalFeature}
  </g>

  <!-- 7. Close Foreground Silhouettes (Cliffs, Ancient Trees, Wildlife, Boulders) -->
  <g fill="${foregroundFill}">
    ${scene.foregroundDetails}
  </g>

  <!-- Warm Amber Accents (Lantern, Campfire, Spirit Wisps) if present -->
  ${scene.amberGlow ? `
  <circle cx="${scene.amberGlow.cx}" cy="${scene.amberGlow.cy}" r="${scene.amberGlow.r * 3.5}" fill="#D99A4E" opacity="${isDark ? '0.04' : scene.amberGlow.opacity * 0.35}" />
  <circle cx="${scene.amberGlow.cx}" cy="${scene.amberGlow.cy}" r="${scene.amberGlow.r * 1.8}" fill="#D99A4E" opacity="${isDark ? '0.08' : scene.amberGlow.opacity * 0.6}" />
  <circle cx="${scene.amberGlow.cx}" cy="${scene.amberGlow.cy}" r="${scene.amberGlow.r * 0.7}" fill="#FFF3D6" opacity="${isDark ? '0.15' : scene.amberGlow.opacity}" />
  ` : ''}

  <!-- Nocturnal Vignette Border -->
  <rect width="1920" height="1080" fill="none" stroke="#05080E" stroke-width="2" opacity="0.4" />
</svg>`;
}

// =========================================================================
// 10 UNIQUE HANDCRAFTED LANDSCAPE COMPOSITIONS FOR AFTERLIGHT
// =========================================================================

const SCENES: SceneParams[] = [
  // 1. LOGIN / HIDDEN WILDERNESS (Firewatch Night)
  {
    id: 'hidden-wilderness',
    title: 'The Hidden Wilderness',
    moonPos: { cx: 960, cy: 380, r: 48 },
    farBackground: `
      <polygon points="0,520 220,440 450,490 680,410 960,480 1240,400 1520,470 1780,430 1920,500 1920,1080 0,1080" />
    `,
    midMountains: `
      <polygon points="0,610 180,560 380,630 620,520 890,610 1150,540 1420,620 1680,550 1920,630 1920,1080 0,1080" />
      <!-- Distant Lookout tower on high ridge crag -->
      <path d="M1480,520 L1540,520 L1530,480 L1490,480 Z M1500,480 L1520,455 L1520,440" stroke="#0E1724" stroke-width="3" />
    `,
    forestLayers: `
      <!-- Dense Valley Pines -->
      <polygon points="0,720 120,670 280,730 460,680 720,740 980,690 1250,750 1580,680 1920,740 1920,1080 0,1080" />
      <path d="M 400,750 Q 700,790 960,820 T 1600,890 L 1650,920 Q 960,850 380,780 Z" fill="#91B7CE" opacity="0.45" />
    `,
    focalFeature: `
      <!-- Serpentine canyon river reflecting moonlight -->
      <path d="M 850,790 Q 940,840 910,880 T 1020,960 L 1080,970 Q 950,890 980,845 T 870,790 Z" fill="#B4D4EA" opacity="0.75" />
    `,
    foregroundDetails: `
      <!-- Left Promontory Overhang with silhouetted lone watcher -->
      <polygon points="0,380 340,430 420,610 380,720 280,890 0,980" />
      <!-- Lone Explorer Silhouette -->
      <circle cx="330" cy="405" r="9" />
      <path d="M 326,414 L 334,414 L 336,432 L 324,432 Z" />
      <path d="M 324,432 L 322,448 M 332,432 L 334,448" stroke="#050A11" stroke-width="4" stroke-linecap="round" />
      <rect x="317" y="416" width="6" height="12" rx="2" />
      <!-- Right Foreground Cliff and Pine silhouettes -->
      <polygon points="1920,480 1620,580 1540,750 1680,920 1920,1080" />
      <polygon points="1720,530 1740,480 1760,530" />
      <polygon points="1780,510 1800,450 1820,510" />
      <polygon points="1660,590 1680,530 1700,590" />
    `,
  },

  // 2. BOT GAME / THE WATERFALL
  {
    id: 'waterfall',
    title: 'The Waterfall',
    moonPos: { cx: 1280, cy: 190, r: 52 },
    farBackground: `
      <polygon points="0,480 320,380 640,490 960,350 1340,440 1680,360 1920,450 1920,1080 0,1080" />
    `,
    midMountains: `
      <polygon points="0,580 280,500 590,590 910,480 1220,570 1560,490 1920,600 1920,1080 0,1080" />
    `,
    forestLayers: `
      <!-- Cliff wall from which the waterfall drops -->
      <polygon points="0,680 750,650 900,640 1150,660 1920,690 1920,1080 0,1080" />
    `,
    focalFeature: `
      <!-- Grand Waterfall Plunge -->
      <path d="M 920,640 L 910,950 Q 980,980 1060,950 L 1040,640 Z" fill="#C9E1F2" opacity="0.85" />
      <!-- Water streams and spray highlights -->
      <path d="M 940,650 L 935,930 M 965,645 L 960,940 M 995,645 L 995,945 M 1020,650 L 1015,935" stroke="#FFFFFF" stroke-width="2.5" opacity="0.7" />
      <!-- Billowing Mist Cloud at Waterfall Base -->
      <ellipse cx="985" cy="950" rx="160" ry="45" fill="#E2EFF9" opacity="0.45" />
      <ellipse cx="985" cy="940" rx="220" ry="30" fill="#91B7CE" opacity="0.35" />
      <!-- Canyon River downstream reflection -->
      <polygon points="850,960 985,940 1120,960 1260,1080 720,1080" fill="#7FA9C6" opacity="0.6" />
    `,
    foregroundDetails: `
      <!-- Left Rocky Crag with Majestic Stag silhouette -->
      <polygon points="0,640 380,680 480,780 420,910 0,1080" />
      <!-- Stag Silhouette -->
      <ellipse cx="340" cy="655" rx="22" ry="14" />
      <circle cx="365" cy="640" r="8" />
      <path d="M 368,634 L 382,605 M 366,634 L 360,608" stroke="#050A11" stroke-width="3" stroke-linecap="round" />
      <path d="M 374,615 L 385,618 M 378,610 L 386,608 M 362,618 L 354,615" stroke="#050A11" stroke-width="2.5" stroke-linecap="round" />
      <path d="M 330,668 L 328,705 M 348,668 L 350,705 M 358,666 L 362,705 M 324,666 L 322,705" stroke="#050A11" stroke-width="3" stroke-linecap="round" />
      <!-- Right Foreground Cliff with Pines -->
      <polygon points="1920,610 1520,720 1480,880 1620,1080 1920,1080" />
      <polygon points="1560,690 1585,610 1610,690" />
      <polygon points="1630,670 1655,590 1680,670" />
      <polygon points="1710,650 1735,560 1760,650" />
    `,
    amberGlow: { cx: 480, cy: 780, r: 12, opacity: 0.6 },
  },

  // 3. MULTIPLAYER LOBBY / THE VAST PLAIN
  {
    id: 'vast-plain',
    title: 'The Vast Plain',
    moonPos: { cx: 1420, cy: 220, r: 64 },
    farBackground: `
      <polygon points="0,460 280,380 610,480 940,360 1280,440 1590,340 1920,460 1920,1080 0,1080" />
    `,
    midMountains: `
      <polygon points="0,570 340,490 720,580 1080,470 1450,560 1810,480 1920,550 1920,1080 0,1080" />
    `,
    forestLayers: `
      <!-- Broad Rolling Plains Horizons -->
      <polygon points="0,670 420,640 910,680 1420,630 1920,670 1920,1080 0,1080" />
      <polygon points="0,770 540,730 1120,780 1650,720 1920,760 1920,1080 0,1080" />
    `,
    focalFeature: `
      <!-- Serpentine Moonlit River winding through grasslands -->
      <path d="M 1280,650 Q 1150,720 1220,780 T 980,890 T 720,1010 L 850,1080 T 1120,930 T 1360,810 Q 1420,740 1310,650 Z" fill="#9DC2DD" opacity="0.75" />
      <path d="M 1250,680 Q 1190,730 1240,780 T 1020,890 T 780,1010" stroke="#FFFFFF" stroke-width="2" opacity="0.65" />
    `,
    foregroundDetails: `
      <!-- Wild prairie grasses and resting elk herd silhouettes -->
      <polygon points="0,890 320,840 780,920 1320,860 1920,930 1920,1080 0,1080" />
      <!-- Distant Elk Herd -->
      <ellipse cx="580" cy="760" rx="14" ry="9" />
      <ellipse cx="640" cy="765" rx="16" ry="10" />
      <circle cx="660" cy="752" r="5" />
      <ellipse cx="690" cy="770" rx="12" ry="8" />
      <!-- Foreground Tall Reeds -->
      <path d="M 140,890 Q 155,830 145,790 M 155,890 Q 170,820 185,780 M 175,890 Q 195,840 210,810" stroke="#050A11" stroke-width="3" stroke-linecap="round" />
      <path d="M 1720,930 Q 1740,860 1730,810 M 1745,930 Q 1765,850 1780,800 M 1770,930 Q 1790,870 1810,830" stroke="#050A11" stroke-width="3" stroke-linecap="round" />
    `,
  },

  // 4. MULTIPLAYER CREATE/JOIN / THE ANCIENT TREE
  {
    id: 'ancient-tree',
    title: 'The Ancient Tree',
    moonPos: { cx: 480, cy: 320, r: 46 },
    farBackground: `
      <polygon points="0,520 380,440 760,530 1140,430 1560,510 1920,460 1920,1080 0,1080" />
    `,
    midMountains: `
      <polygon points="0,630 450,560 910,640 1380,550 1920,640 1920,1080 0,1080" />
    `,
    forestLayers: `
      <polygon points="0,750 490,710 1020,770 1540,710 1920,760 1920,1080 0,1080" />
    `,
    focalFeature: `
      <!-- Colossal Ancient Banyan/Oak Trunk in Center -->
      <path d="M 760,1080 Q 860,850 890,620 Q 960,380 960,250 Q 960,380 1030,620 Q 1060,850 1160,1080 Z" fill="#070E17" />
      <!-- Massive Sprawling Boughs -->
      <path d="M 890,620 Q 720,540 520,520 Q 320,510 140,560" stroke="#070E17" stroke-width="58" stroke-linecap="round" fill="none" />
      <path d="M 1030,620 Q 1200,540 1400,520 Q 1600,510 1820,560" stroke="#070E17" stroke-width="56" stroke-linecap="round" fill="none" />
      <path d="M 930,480 Q 820,380 680,320 Q 540,280 420,310" stroke="#070E17" stroke-width="42" stroke-linecap="round" fill="none" />
      <path d="M 990,480 Q 1100,380 1240,320 Q 1380,280 1520,310" stroke="#070E17" stroke-width="42" stroke-linecap="round" fill="none" />
      <!-- Giant Spreading Canopy Clouds -->
      <ellipse cx="960" cy="220" rx="420" ry="120" fill="#0A1420" opacity="0.9" />
      <ellipse cx="480" cy="380" rx="340" ry="110" fill="#0A1420" opacity="0.9" />
      <ellipse cx="1440" cy="380" rx="340" ry="110" fill="#0A1420" opacity="0.9" />
    `,
    foregroundDetails: `
      <!-- Above-ground giant root arches -->
      <path d="M 760,940 Q 640,990 480,1080 M 1160,940 Q 1280,990 1440,1080" stroke="#050A11" stroke-width="48" stroke-linecap="round" fill="none" />
      <!-- Left Rock with Lone Wolf Silhouette -->
      <polygon points="0,840 280,810 380,920 290,1080 0,1080" />
      <ellipse cx="280" cy="790" rx="18" ry="11" />
      <circle cx="265" cy="780" r="6" />
      <path d="M 262,776 L 258,768 M 268,776 L 272,768" stroke="#050A11" stroke-width="2" />
      <path d="M 298,790 Q 312,805 310,820" stroke="#050A11" stroke-width="4" stroke-linecap="round" fill="none" />
    `,
    amberGlow: { cx: 960, cy: 780, r: 35, opacity: 0.9 },
  },

  // 5. MULTIPLAYER ROOM / THE RIVER PASSAGE
  {
    id: 'river-passage',
    title: 'The River Passage',
    moonPos: { cx: 1060, cy: 180, r: 50 },
    farBackground: `
      <polygon points="0,480 320,400 680,510 1060,370 1440,490 1760,410 1920,490 1920,1080 0,1080" />
    `,
    midMountains: `
      <polygon points="0,610 390,530 820,620 1260,510 1680,610 1920,560 1920,1080 0,1080" />
    `,
    forestLayers: `
      <!-- Misty riverbanks flanking the water -->
      <polygon points="0,720 480,690 740,730 0,840" />
      <polygon points="1920,720 1440,690 1180,730 1920,840" />
    `,
    focalFeature: `
      <!-- Still Glassy Lake / River reflecting moonlight -->
      <polygon points="480,690 1440,690 1920,1080 0,1080" fill="#0C1B2E" />
      <path d="M 1060,690 L 1060,1080" stroke="#C5E0F4" stroke-width="80" stroke-opacity="0.35" filter="blur(20px)" />
      <!-- Water ripple lines -->
      <line x1="840" y1="740" x2="1280" y2="740" stroke="#FFFFFF" stroke-width="1.5" opacity="0.4" />
      <line x1="720" y1="810" x2="1400" y2="810" stroke="#FFFFFF" stroke-width="2" opacity="0.5" />
      <line x1="580" y1="910" x2="1540" y2="910" stroke="#FFFFFF" stroke-width="2.5" opacity="0.6" />
    `,
    foregroundDetails: `
      <!-- Wooden Skiff / Rowing Boat in Foreground Water -->
      <path d="M 780,940 Q 980,910 1180,940 L 1120,1020 Q 980,1040 840,1020 Z" fill="#050A11" />
      <polygon points="970,890 990,890 985,940 975,940" fill="#050A11" />
      <!-- Moored wooden post and reeds -->
      <rect x="740" y="860" width="16" height="150" fill="#050A11" rx="4" />
      <!-- Distant crocodile/log silhouettes in water -->
      <ellipse cx="1280" cy="850" rx="60" ry="10" fill="#050A11" />
      <circle cx="1235" cy="845" r="5" fill="#050A11" />
    `,
    amberGlow: { cx: 980, cy: 915, r: 18, opacity: 0.95 },
  },

  // 6. COMMUNITY / THE WILDLIFE TRAIL
  {
    id: 'wildlife-trail',
    title: 'The Wildlife Trail',
    moonPos: { cx: 1540, cy: 210, r: 56 },
    farBackground: `
      <polygon points="0,470 290,390 620,490 980,370 1380,480 1720,380 1920,470 1920,1080 0,1080" />
    `,
    midMountains: `
      <polygon points="0,580 380,510 790,600 1220,500 1620,590 1920,530 1920,1080 0,1080" />
    `,
    forestLayers: `
      <polygon points="0,710 440,660 920,730 1480,670 1920,720 1920,1080 0,1080" />
    `,
    focalFeature: `
      <!-- Winding Mountain Trail path cutting through pine forest -->
      <path d="M 960,670 Q 880,750 990,840 T 820,960 L 980,1080 T 1160,940 T 1040,820 Q 1120,740 1020,670 Z" fill="#14243A" opacity="0.8" />
      <!-- Giant Eagle / Raven soaring in front of the moon -->
      <path d="M 1540,210 Q 1500,185 1460,200 Q 1510,215 1540,210 Q 1570,215 1620,200 Q 1580,185 1540,210 Z" fill="#050A11" />
      <circle cx="1540" cy="207" r="4" fill="#050A11" />
    `,
    foregroundDetails: `
      <!-- Giant Redwoods flanking left and right -->
      <rect x="180" y="240" width="85" height="840" fill="#050A11" />
      <path d="M 180,420 L 60,400 M 265,490 L 390,470 M 180,620 L 70,610 M 265,710 L 410,700" stroke="#050A11" stroke-width="18" stroke-linecap="round" />
      <rect x="1680" y="280" width="95" height="800" fill="#050A11" />
      <path d="M 1680,450 L 1550,430 M 1775,540 L 1890,520 M 1680,680 L 1540,670" stroke="#050A11" stroke-width="18" stroke-linecap="round" />
      <polygon points="0,960 480,910 920,1080 0,1080" />
      <polygon points="1920,960 1440,910 1080,1080 1920,1080" />
    `,
    amberGlow: { cx: 860, cy: 740, r: 14, opacity: 0.8 },
  },

  // 7. FRIENDS / THE QUIET RIVERBANK
  {
    id: 'quiet-riverbank',
    title: 'The Quiet Riverbank',
    moonPos: { cx: 880, cy: 260, r: 50 },
    farBackground: `
      <polygon points="0,510 340,430 720,530 1110,420 1520,520 1920,450 1920,1080 0,1080" />
    `,
    midMountains: `
      <polygon points="0,620 410,550 860,640 1340,540 1810,630 1920,580 1920,1080 0,1080" />
    `,
    forestLayers: `
      <polygon points="0,730 480,680 980,740 1510,690 1920,730 1920,1080 0,1080" />
    `,
    focalFeature: `
      <!-- Calm lake reflecting the moon and mountains -->
      <polygon points="0,750 1920,750 1920,1080 0,1080" fill="#0A1828" />
      <ellipse cx="880" cy="880" rx="180" ry="120" fill="#9CC5E2" opacity="0.4" />
      <!-- Water mirror lines -->
      <ellipse cx="880" cy="880" rx="120" ry="80" fill="#EDF6FC" opacity="0.3" />
    `,
    foregroundDetails: `
      <!-- Foreground bank with Resting Deer on left -->
      <polygon points="0,790 520,830 640,960 510,1080 0,1080" />
      <!-- Resting Deer silhouette -->
      <ellipse cx="360" cy="855" rx="26" ry="16" />
      <circle cx="390" cy="840" r="10" />
      <path d="M 392,832 L 398,818 M 386,832 L 382,820" stroke="#050A11" stroke-width="2.5" stroke-linecap="round" />
      <!-- Weeping branches draping from top-left and top-right -->
      <path d="M 0,0 Q 240,180 320,380 M 0,60 Q 180,240 220,440" stroke="#050A11" stroke-width="14" stroke-linecap="round" fill="none" />
      <path d="M 1920,0 Q 1680,180 1600,380 M 1920,60 Q 1740,240 1700,440" stroke="#050A11" stroke-width="14" stroke-linecap="round" fill="none" />
    `,
    amberGlow: { cx: 620, cy: 840, r: 16, opacity: 0.75 },
  },

  // 8. HISTORY / THE MOONLIT RIVER
  {
    id: 'moonlit-river',
    title: 'The Moonlit River',
    moonPos: { cx: 1140, cy: 210, r: 54 },
    farBackground: `
      <polygon points="0,470 310,380 660,490 1020,360 1410,470 1740,380 1920,460 1920,1080 0,1080" />
    `,
    midMountains: `
      <polygon points="0,580 360,500 790,600 1240,490 1680,590 1920,530 1920,1080 0,1080" />
    `,
    forestLayers: `
      <!-- Steep gorge slopes -->
      <polygon points="0,670 560,630 840,710 0,860" />
      <polygon points="1920,670 1360,630 1080,710 1920,860" />
    `,
    focalFeature: `
      <!-- Roaring Mountain River Rapids with cascading tiers -->
      <path d="M 840,710 L 1080,710 L 1320,1080 L 600,1080 Z" fill="#7FA9C6" opacity="0.85" />
      <!-- Water cascades / foam shelves -->
      <path d="M 820,760 Q 960,740 1100,760" stroke="#FFFFFF" stroke-width="4" opacity="0.8" />
      <path d="M 760,840 Q 960,810 1160,840" stroke="#FFFFFF" stroke-width="5" opacity="0.85" />
      <path d="M 680,940 Q 960,900 1240,940" stroke="#FFFFFF" stroke-width="6" opacity="0.9" />
    `,
    foregroundDetails: `
      <!-- River Boulders and Canyon Cliffs -->
      <ellipse cx="780" cy="870" rx="65" ry="35" fill="#050A11" />
      <ellipse cx="1140" cy="890" rx="80" ry="40" fill="#050A11" />
      <ellipse cx="940" cy="990" rx="110" ry="50" fill="#050A11" />
      <polygon points="0,840 380,880 440,1080 0,1080" />
      <polygon points="1920,840 1540,880 1480,1080 1920,1080" />
    `,
  },

  // 9. OOP LAB / THE FOREST CANOPY
  {
    id: 'forest-canopy',
    title: 'The Forest Canopy',
    moonPos: { cx: 960, cy: 260, r: 60 },
    customDefs: `
      <!-- Celestial Constellation Rings -->
      <circle id="celestialRing" cx="960" cy="260" r="160" fill="none" stroke="#91B7CE" stroke-width="0.75" stroke-dasharray="4 6" opacity="0.4" />
      <circle id="celestialRing2" cx="960" cy="260" r="280" fill="none" stroke="#91B7CE" stroke-width="0.5" stroke-dasharray="2 8" opacity="0.3" />
    `,
    farBackground: `
      <!-- Distant night horizons seen through crown silhouettes -->
      <polygon points="0,560 380,490 780,580 1180,480 1580,570 1920,510 1920,1080 0,1080" />
      <use href="#celestialRing" />
      <use href="#celestialRing2" />
    `,
    midMountains: `
      <polygon points="0,670 420,610 880,690 1360,600 1840,680 1920,630 1920,1080 0,1080" />
    `,
    forestLayers: `
      <polygon points="0,780 480,730 990,800 1520,720 1920,780 1920,1080 0,1080" />
    `,
    focalFeature: `
      <!-- Monumental Ancient Pine Crowns framing the heavens -->
      <path d="M 0,0 L 480,0 L 320,440 L 0,380 Z" fill="#08101C" />
      <path d="M 1920,0 L 1440,0 L 1600,440 L 1920,380 Z" fill="#08101C" />
      <!-- Intricate Pine Needle Branches reaching toward the moon -->
      <path d="M 320,240 Q 560,260 740,240 M 280,360 Q 520,380 680,360 M 340,480 Q 580,500 780,480" stroke="#060C16" stroke-width="12" stroke-linecap="round" />
      <path d="M 1600,240 Q 1360,260 1180,240 M 1640,360 Q 1400,380 1240,360 M 1580,480 Q 1340,500 1140,480" stroke="#060C16" stroke-width="12" stroke-linecap="round" />
    `,
    foregroundDetails: `
      <!-- Massive twisted foreground branch on right with perched Great Owl -->
      <path d="M 1920,480 Q 1640,510 1420,530 L 1420,570 Q 1660,550 1920,520 Z" fill="#04070D" />
      <!-- Perched Owl Silhouette on branch -->
      <ellipse cx="1520" cy="485" rx="18" ry="26" />
      <circle cx="1520" cy="450" r="14" />
      <!-- Horned ear tufts -->
      <polygon points="1510,444 1504,430 1515,440" />
      <polygon points="1530,444 1536,430 1525,440" />
      <!-- Bottom forest floor -->
      <polygon points="0,920 480,880 960,940 1440,880 1920,930 1920,1080 0,1080" />
    `,
  },

  // 10. PROFILE / THE MOUNTAIN RIDGE
  {
    id: 'mountain-ridge',
    title: 'The Mountain Ridge',
    moonPos: { cx: 720, cy: 220, r: 58 },
    farBackground: `
      <!-- High Alpine Knife-edge peaks bathed in moonlight -->
      <polygon points="0,420 260,310 540,440 820,280 1140,410 1460,260 1780,390 1920,320 1920,1080 0,1080" />
    `,
    midMountains: `
      <polygon points="0,540 320,430 680,560 1020,410 1380,530 1720,420 1920,520 1920,1080 0,1080" />
      <!-- Glacial Snowfields catching silver moonlight -->
      <polygon points="260,310 320,430 220,410" fill="#BED9EE" opacity="0.6" />
      <polygon points="820,280 890,390 770,380" fill="#BED9EE" opacity="0.65" />
      <polygon points="1460,260 1530,370 1410,360" fill="#BED9EE" opacity="0.65" />
    `,
    forestLayers: `
      <!-- Sea of drifting clouds below high mountain peaks -->
      <ellipse cx="480" cy="620" rx="380" ry="60" fill="#E2EFF9" opacity="0.25" />
      <ellipse cx="1240" cy="610" rx="420" ry="70" fill="#E2EFF9" opacity="0.25" />
      <polygon points="0,690 480,640 1020,710 1540,630 1920,680 1920,1080 0,1080" />
    `,
    focalFeature: `
      <!-- Sharp foreground ridge crest descending across view -->
      <polygon points="0,640 580,720 1180,820 1920,940 1920,1080 0,1080" fill="#0A1422" />
    `,
    foregroundDetails: `
      <!-- Summit Rocky Outcrop with Explorer Stone Cairn -->
      <polygon points="0,780 440,730 680,890 320,1080 0,1080" />
      <!-- Stone Cairn (stacked stones beacon) -->
      <ellipse cx="380" cy="728" rx="22" ry="7" />
      <ellipse cx="380" cy="718" rx="17" ry="6" />
      <ellipse cx="380" cy="709" rx="13" ry="5" />
      <ellipse cx="380" cy="701" rx="9" ry="4" />
      <ellipse cx="380" cy="695" rx="5" ry="3" />
      <!-- Distant pine silhouetted on ridge -->
      <polygon points="1170,820 1180,760 1190,820" />
      <polygon points="1320,840 1330,780 1340,840" />
    `,
    amberGlow: { cx: 380, cy: 692, r: 12, opacity: 0.8 },
  },
];

console.log('Generating 10 custom illuminated & 10 dark vector landscapes for AFTERLIGHT...');

for (const scene of SCENES) {
  // 1. Revealed Moonlit Scene
  const svgContent = generateSvg(scene, false);
  const svgPath = path.join(outputDir, `${scene.id}.svg`);
  fs.writeFileSync(svgPath, svgContent, 'utf-8');

  // 2. Nocturnal Dark Base Scene
  const darkSvgContent = generateSvg(scene, true);
  const darkSvgPath = path.join(outputDir, `${scene.id}-dark.svg`);
  fs.writeFileSync(darkSvgPath, darkSvgContent, 'utf-8');

  console.log(`✓ Generated ${scene.id}.svg and ${scene.id}-dark.svg (${scene.title})`);
}

console.log('All 20 landscape vector assets successfully created in public/images/landscapes/!');
