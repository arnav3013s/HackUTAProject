export const games = ['Counter-Strike 2', 'Call of Duty: Warzone', 'Rainbow Six Siege', 'Valorant', 'Apex Legends', 'Fortnite'];

export const rewardRules = { daily: 15, checkIn: 5, trivia: 10, watch: 5, completion: 10, weekly: 20, weeklyChest: 50, archive: 20, days: 21, expiryDays: 365, referral: 40, referralWelcome: 20, referralCap: 5, minAge: 7, referralTasks: 3, review: 25, reviewCap: 10, returning: 30, creator: 5, merchCap: 2, demoBalance: 200 };
export const matchRules = { minutesPerPoint: 5, timeCap: 10, placementCap: 20, dailyCap: 60, recentDays: 30, rankedMatches: 3, minimumMinutes: 5, rewardWindowDays: 7 };

export const creators = [
  { id: 'VANTA', name: 'Vanta', tag: '@vantaplays', game: 'Valorant', specialty: 'Tactical MVP', description: 'Reads rotations early. Wins the late round. Breaks down the calls that make it happen.', score: 2840, league: 'Clutch Circuit', color: 'lime' },
  { id: 'GHOST', name: 'Ghostline', tag: '@ghostlinegg', game: 'Apex Legends', specialty: 'Best Gunplay', description: 'Makes every burst count. Finds the cleanest angles. Turns scrims into practical aim drills.', score: 2520, league: 'Clutch Circuit', color: 'pink' },
  { id: 'NOVA', name: 'Nova', tag: '@novabuilds', game: 'Fortnite', specialty: 'Trickshotter', description: 'Finds the shot nobody expects. Makes the replay worth watching. Explains the setup frame by frame.', score: 2320, league: 'Skyline Invitational', color: 'blue' },
  { id: 'HEX', name: 'Hex', tag: '@hexintel', game: 'Valorant', specialty: 'Best Strategist', description: 'Maps the next move. Saves utility for the swing. Shows how a team wins the round together.', score: 2160, league: 'Clutch Circuit', color: 'blue' }
];

export const ogQuizzes = [
  { id: 'montage', name: 'Guess the montage', prompt: 'Which early series brought FaZe trickshots together?', options: ['ILLCAMS', 'Final Round', 'Match Point'], correct: 'ILLCAMS' },
  { id: 'clip', name: 'Name that clip', prompt: 'What is the series in FaZe’s first featured archive clip?', options: ['ILLCAMS', 'The Flank', 'Road to the World Cup'], correct: 'ILLCAMS', clip: '3o65zAETqPQ' },
  { id: 'era', name: 'Which-era quiz', prompt: 'Which era brought FaZe to a new battle royale audience?', options: ['Trickshot', 'Vlog/House', 'Fortnite'], correct: 'Fortnite' }
];

export const products = [
  { id: 'sample-discount', name: 'FaZe merch discount sample', price: 50, cost: 0, stock: 20, type: 'Demo discount', demoOnly: true },
  { id: 'sample-cap', name: 'FaZe Snapback reservation', price: 180, cost: 1800, stock: 6, type: 'Demo reward', merch: 'cap', demoOnly: true },
  { id: 'sample-jersey', name: 'FaZe Team Jersey reservation', price: 240, cost: 3200, stock: 4, type: 'Demo reward', merch: 'jersey', demoOnly: true },
  { id: 'sample-gift-card', name: 'FaZe gift card sample', price: 350, cost: 1000, stock: 4, type: 'Demo gift card', demoOnly: true },
  { id: 'pass', name: 'Intel Pass', price: 80, cost: 0, stock: 100, type: 'Member access', mark: '⌁' }
];

export const samplePatch = {
  id: 'cs2-demo', game: 'Counter-Strike 2', version: 'Sample analysis', sample: true,
  url: 'https://www.counter-strike.net/news/updates',
  notes: 'This four-weapon sample illustrates how a draft tier list becomes a creator-reviewed list. Tiers are qualitative demo data.',
  summary: 'A four-weapon sample for comparing full buys, force buys, and the cost of an AWP.',
  rankings: [
    { name: 'AK-47', tier: 'S', delta: 'flat', reason: 'A full-buy rifle for the attacking side.' },
    { name: 'M4A1-S', tier: 'S', delta: 'flat', reason: 'A silenced rifle for defending rounds.' },
    { name: 'AWP', tier: 'A', delta: 'flat', reason: 'High impact on long sightlines, with a steep economy cost.' },
    { name: 'MP9', tier: 'B', delta: 'flat', reason: 'A low-cost option for close-range defense.' }
  ],
  reviews: [], source: 'Illustrative demo', created: '2026-11-14T12:00:00.000Z'
};

export const news = [
  { name: 'Counter-Strike 2', title: 'Release notes', url: 'https://www.counter-strike.net/news/updates', kind: 'Valve' },
  { name: 'Call of Duty: Warzone', title: 'Patch notes', url: 'https://www.callofduty.com/patchnotes', kind: 'Call of Duty' },
  { name: 'Rainbow Six Siege', title: 'Game updates', url: 'https://www.ubisoft.com/en-us/game/rainbow-six/siege/news-updates', kind: 'Ubisoft' },
  { name: 'Valorant', title: 'Game updates', url: 'https://playvalorant.com/en-us/news/game-updates/', kind: 'Publisher' },
  { name: 'Apex Legends', title: 'Latest news', url: 'https://www.ea.com/games/apex-legends/news', kind: 'Publisher' },
  { name: 'Fortnite', title: 'News and updates', url: 'https://www.fortnite.com/news', kind: 'Publisher' }
];
