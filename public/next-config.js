
export const nextConfig = {
  sample: true, defaultSeason: 'season-1', maxEntries: 3, dailyVotes: 5, ogVotes: 1,
  earlyHours: 24, finalistCount: 3, minAge: 18, allowGuardianConsent: false, termsVersion: 'next-terms-preview-1',
  categories: ['Gaming Montage', 'Trickshot', 'Competitive Gameplay', 'Entertaining Gaming Video', 'Unique Gaming Personality', 'Creator Introduction'],
  rubric: [['Creativity',25],['Skill and Execution',25],['Entertainment Value',20],['Personality and Presence',15],['Community Vote',15]],
  tieBreak: 'Highest creativity score, then highest skill score, then earliest eligible submission.',
  hosts: ['youtube.com','youtu.be','tiktok.com','twitch.tv','clips.twitch.tv','instagram.com'],
  appeals: '[ADD APPEALS CONTACT]', judge: '[ADD JUDGE]', prize: '[ADD PRIZE]',
  opportunity: '[ADD OPPORTUNITY: sponsorship / collaboration / content feature]',
  stream: '[ADD STREAM LINK]',
  sponsorPlaceholder: '[ADD SPONSOR]',
  sponsors: [
    { type: 'Title Sponsor', name: '[ADD SPONSOR]', logo: '', url: '', slot: 'season' },
    { type: 'Category Sponsor', name: '[ADD SPONSOR]', logo: '', url: '', slot: 'Gaming Montage' },
    { type: 'Prize Sponsor', name: '[ADD SPONSOR]', logo: '', url: '', slot: '[ADD PRIZE]' }
  ],
  seasons: [{
    id: 'season-1', name: 'Season 1', sample: true,
    phases: [
      ['submissions','Applications and Submissions','2026-11-01T00:00:00Z','2026-12-01T00:00:00Z'],
      ['voting','Community Voting','2026-12-01T00:00:00Z','2026-12-08T00:00:00Z'],
      ['judging','Judging','2026-12-08T00:00:00Z','2026-12-15T00:00:00Z'],
      ['finalists','Finalists announced','2026-12-15T00:00:00Z','2026-12-20T00:00:00Z'],
      ['finale','Live Finale','2026-12-20T00:00:00Z','2026-12-21T00:00:00Z'],
      ['winners','Winners and recognition','2026-12-21T00:00:00Z','2027-01-01T00:00:00Z']
    ]
  }],
  samples: [
    ['Sample Montage','Practice edit',12],['Sample Trickshot','Practice timing',9],
    ['Sample Match','Practice competitive recap',16],['Sample Gaming Video','Practice storytelling',7],
    ['Sample Personality','Practice channel concept',5],['Sample Introduction','Practice creator intro',4]
  ]
};
