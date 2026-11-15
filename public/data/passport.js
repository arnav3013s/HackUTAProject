export const OG_XP_BONUS = 0.15;
export const RANK_XP_INCLUDE_OG_BONUS = true;
export const OG_XP_BONUS_LABEL = new Intl.NumberFormat('en-US', {style:'percent',maximumFractionDigits:2}).format(OG_XP_BONUS);


export const passportConfig = {
  sample: true,
  xpPerLevel: 100,
  tiers: [
    { name: 'Rookie', level: 1, perk: 'Passport and community rankings' },
    { name: 'Challenger', level: 11, perk: 'Level-gated drop access' },
    { name: 'Elite', level: 21, perk: '5% sample drop discount' },
    { name: 'Legend', level: 31, perk: '8% sample drop discount' },
    { name: 'OG', level: 41, perk: '10% sample drop discount and OG-tier profile flair' }
  ],
  actions: {
    watch: { xp: 20, cap: 3, cooldown: 60 },
    daily: { xp: 15, cap: 4, cooldown: 0 },
    weekly: { xp: 45, cap: 4, cooldown: 0 },
    chest: { xp: 65, cap: 1, cooldown: 0 },
    poll: { xp: 10, cap: 1, cooldown: 0 },
    event: { xp: 35, cap: 2, cooldown: 0 },
    competition: { xp: 25, cap: 3, cooldown: 30 },
    submit: { xp: 40, cap: 3, cooldown: 30 },
    vote: { xp: 5, cap: 5, cooldown: 3 },
    referral: { xp: 80, cap: 3, cooldown: 0 },
    purchase: { xp: 100, cap: 2, cooldown: 0 },
    member: { xp: 120, cap: 1, cooldown: 86400 },
    finalist: { xp: 150, cap: 3, cooldown: 0 },
    throwback: { xp: 25, cap: 4, cooldown: 0 }
  },
  achievements: [
    { id: 'first-watch', icon: 'play', category: 'Watch', name: 'First replay', description: 'Complete a highlight watch task.', rarity: 'Common', action: 'watch', goal: 1 },
    { id: 'next-entry', icon: 'diagonal', category: 'Compete', name: 'On the bracket', description: 'Enter FaZe NEXT.', rarity: 'Rare', action: 'submit', goal: 1 },
    { id: 'next-alumni', icon: 'diagonal', category: 'Compete', name: 'FaZe NEXT Alumni', description: 'Reach the finals of FaZe NEXT.', rarity: 'Legendary', action: 'finalist', goal: 1 },
    { id: 'daily-five', icon: 'person', category: 'Community', name: 'A regular', description: 'Complete five daily tasks.', rarity: 'Rare', action: 'daily', goal: 5 },
    { id: 'first-drop', icon: 'cart', category: 'Collector', name: 'Numbered', description: 'Collect a numbered FaZe drop.', rarity: 'Epic', action: 'purchase', goal: 1 },
    { id: 'archive', icon: 'left', category: 'Throwback', name: 'Archive diver', description: 'Finish a throwback quiz.', rarity: 'Rare', action: 'throwback', goal: 1 },
    { id: 'referral', icon: 'plus', category: 'Referrals', name: 'Squad up', description: 'Refer a friend who becomes verified and active.', rarity: 'Epic', action: 'referral', goal: 1 }
  ],
  watchSeconds: 30,
  watchTokenMinutes: 12,
  streakFreezes: 1,
  monthlyGoal: 5,
  poll: { id: 'legacy-preview', prompt: 'Which archive era would you revisit?', options: ['Trickshot', 'Montage', 'Vlog/House', 'Fortnite'] },
  events: [],
  sponsor: { name: '[ADD SPONSOR]', reward: '[ADD SPONSORED REWARD]', challenge: '[ADD SPONSORED CHALLENGE]' }
};

export function passportLevel(xp) {
  const level = Math.min(50, 1 + Math.floor(xp / passportConfig.xpPerLevel));
  return {
    xp, level, tier: passportConfig.tiers.findLast(tier => level >= tier.level).name,
    progress: level === 50 ? 100 : (xp % passportConfig.xpPerLevel) * 100 / passportConfig.xpPerLevel,
    next: level === 50 ? 0 : passportConfig.xpPerLevel - xp % passportConfig.xpPerLevel
  };
}
