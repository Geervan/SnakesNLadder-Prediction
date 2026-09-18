/**
 * Snakes & Ladders Lab: Board Configurations
 * Modular, data-driven board specifications with historical/standard configurations.
 */

export const BOARDS = [
  {
    id: "classic-100",
    name: "Classic Tabletop (100)",
    subtitle: "Traditional 10×10 Standard Layout",
    size: 100,
    rows: 10,
    cols: 10,
    description: "The universally recognized 100-square layout with balanced hazards and ascents.",
    source: "Traditional Milton Bradley / Tabletop Standard",
    snakes: {
      98: 78,
      95: 56,
      92: 73,
      87: 24,
      64: 60,
      62: 19,
      54: 34,
      17: 7
    },
    ladders: {
      1: 38,
      4: 14,
      9: 31,
      21: 42,
      28: 84,
      51: 67,
      71: 91,
      80: 100
    },
    difficulty: "Balanced",
    tags: ["Standard", "100 Squares", "8 Snakes", "8 Ladders"]
  },
  {
    id: "pastel-adventure",
    name: "Pastel Adventure (100)",
    subtitle: "Custom 10×10 Illustrated Edition",
    size: 100,
    rows: 10,
    cols: 10,
    description: "Illustrated edition featuring long diagonal ascents and prominent coiled serpents across central corridors.",
    source: "User Provided Board Configuration #1",
    snakes: {
      98: 65,
      92: 74,
      82: 42,
      73: 51,
      56: 19,
      47: 15,
      30: 8
    },
    ladders: {
      4: 25,
      21: 40,
      29: 75,
      43: 77,
      61: 80,
      72: 90
    },
    difficulty: "Dynamic",
    tags: ["Illustrated", "100 Squares", "7 Snakes", "6 Ladders"]
  },
  {
    id: "vibrant-carnival",
    name: "Rainbow Carnival (100)",
    subtitle: "Vibrant Illustrated 10×10 Edition",
    size: 100,
    rows: 10,
    cols: 10,
    description: "Features a dramatic central ladder ascending through 5 rows and a long red serpent dropping from square 77.",
    source: "User Provided Board Configuration #2",
    snakes: {
      97: 65,
      91: 68,
      77: 26,
      60: 23,
      32: 13
    },
    ladders: {
      8: 27,
      19: 39,
      37: 86,
      47: 67,
      79: 100
    },
    difficulty: "High Ascent",
    tags: ["Illustrated", "100 Squares", "5 Snakes", "5 Ladders"]
  },
  {
    id: "classroom-primary",
    name: "Classroom Primary (100)",
    subtitle: "Educational Color-Block 10×10 Edition",
    size: 100,
    rows: 10,
    cols: 10,
    gridType: "left-to-right",
    description: "Features straight left-to-right numbered rows, a winding black cobra dropping from 90 to 66, and central diagonal ladders.",
    source: "User Provided Board Configuration #3",
    snakes: {
      98: 87,
      90: 66,
      81: 72,
      75: 54,
      61: 36,
      24: 12,
      19: 7
    },
    ladders: {
      5: 37,
      20: 40,
      22: 42,
      49: 86,
      74: 95
    },
    difficulty: "Balanced",
    tags: ["Educational", "100 Squares", "7 Snakes", "5 Ladders"]
  },
  {
    id: "board-04",
    name: "The Grand Ascent (100)",
    subtitle: "Classical Serpentine Edition",
    size: 100,
    rows: 10,
    cols: 10,
    gridType: "boustrophedon",
    description: "Features 10 directional ladders and 6 punishment snakes with long vertical and diagonal transitions.",
    source: "Board Configuration Reference 04",
    snakes: {
      98: 79,
      95: 75,
      92: 73,
      87: 45,
      63: 18,
      53: 34
    },
    ladders: {
      4: 15,
      9: 31,
      19: 41,
      21: 42,
      22: 38,
      34: 47,
      46: 85,
      51: 68,
      72: 91,
      81: 99
    },
    difficulty: "Balanced",
    tags: ["Standard", "100 Squares", "6 Snakes", "10 Ladders"]
  },
  {
    id: "mypartygames-classic",
    name: "Classic MyPartyGames Board",
    subtitle: "Traditional Vintage Print Edition",
    size: 100,
    rows: 10,
    cols: 10,
    gridType: "boustrophedon",
    description: "Features classic punishing drops from 96 to 64 and 61 to 16, with an extraordinary super-ladder climbing from square 16 to 82.",
    source: "MyPartyGames Traditional Print Reference",
    snakes: {
      18: 6,
      29: 7,
      61: 16,
      72: 47,
      96: 64
    },
    ladders: {
      2: 23,
      8: 14,
      16: 82,
      25: 54,
      50: 91,
      74: 87
    },
    difficulty: "High Ascent",
    tags: ["Traditional", "100 Squares", "5 Snakes", "6 Ladders"]
  },
  {
    id: "victorian-1892",
    name: "Victorian Heritage (1892)",
    subtitle: "Historical British 19th Century Edition",
    size: 100,
    rows: 10,
    cols: 10,
    description: "Based on the 1892 Jaques of London release with punishing long-drop serpents near the finish.",
    source: "Jaques of London Historical Archive (1892)",
    snakes: {
      99: 10,
      93: 68,
      88: 24,
      76: 41,
      61: 18,
      47: 15,
      36: 6
    },
    ladders: {
      3: 20,
      12: 50,
      23: 44,
      37: 63,
      55: 75,
      66: 86,
      78: 97
    },
    difficulty: "High Volatility",
    tags: ["Historical", "100 Squares", "7 Snakes", "7 Ladders"]
  },
  {
    id: "chutes-classic",
    name: "Chutes & Climbers (100)",
    subtitle: "American 20th Century Standard",
    size: 100,
    rows: 10,
    cols: 10,
    description: "A popular mid-century variant featuring distinct ladder ramps and slide curves.",
    source: "American Tabletop Standard (1943)",
    snakes: {
      98: 78,
      93: 73,
      87: 24,
      64: 60,
      56: 53,
      49: 11,
      48: 26,
      16: 6
    },
    ladders: {
      1: 38,
      4: 14,
      9: 31,
      21: 42,
      28: 84,
      36: 44,
      51: 67,
      71: 91,
      80: 100
    },
    difficulty: "Balanced",
    tags: ["Classic", "100 Squares", "8 Snakes", "9 Ladders"]
  },
  {
    id: "snake-pit-100",
    name: "The Serpent's Lair (100)",
    subtitle: "High Density Hazard Configuration",
    size: 100,
    rows: 10,
    cols: 10,
    description: "An intense layout loaded with 12 treacherous snakes, creating dramatic late-game reversals.",
    source: "Experimental Calibration Set A",
    snakes: {
      99: 41,
      97: 65,
      94: 70,
      89: 53,
      83: 22,
      75: 32,
      67: 45,
      59: 17,
      52: 29,
      43: 18,
      38: 15,
      27: 5
    },
    ladders: {
      2: 23,
      8: 34,
      14: 48,
      25: 68,
      36: 77,
      49: 88,
      61: 82
    },
    difficulty: "Punishing",
    tags: ["Experimental", "100 Squares", "12 Snakes", "7 Ladders"]
  },
  {
    id: "ladder-rush-100",
    name: "Golden Ascents (100)",
    subtitle: "Fast Acceleration Layout",
    size: 100,
    rows: 10,
    cols: 10,
    description: "Abundant soaring ladders accelerate player trajectories, shortening the game and testing early predictability.",
    source: "Experimental Calibration Set B",
    snakes: {
      96: 69,
      91: 61,
      82: 44,
      68: 33,
      46: 25
    },
    ladders: {
      3: 39,
      7: 29,
      15: 55,
      22: 60,
      30: 72,
      42: 81,
      57: 94,
      73: 98
    },
    difficulty: "Fast Pace",
    tags: ["Experimental", "100 Squares", "5 Snakes", "8 Ladders"]
  }
];

export function getBoardById(id) {
  return BOARDS.find(b => b.id === id) || BOARDS[0];
}
