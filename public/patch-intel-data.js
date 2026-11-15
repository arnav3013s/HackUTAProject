
const categories = ['Weapons', 'Maps', 'Characters / Operators', 'Modes', 'Economy', 'Bug Fixes', 'Anti-Cheat', 'Ranked / Competitive'];

const games = [
  ['cs2', 'Counter-Strike 2', 'CS2', [
    ['Rifle recovery', 'Weapons', 'Adjustment', '180 ms', '165 ms'],
    ['Mid sightline', 'Maps', 'Fix'], ['Utility cost', 'Economy', 'Nerf', '200 credits', '300 credits'],
    ['Overtime format', 'Ranked / Competitive', 'New']
  ], 'Trade timing and utility budgets may matter more in early defaults.'],
  ['cod', 'Call of Duty', 'COD', [
    ['SMG sprint-to-fire', 'Weapons', 'Buff', '220 ms', '200 ms'],
    ['Hardpoint spawn preview', 'Modes', 'New'], ['Control rotation', 'Ranked / Competitive', 'Adjustment'],
    ['Spectator markers', 'Bug Fixes', 'Fix']
  ], 'Rehearse aggressive break routes and watch how the new rotations affect map vetoes.'],
  ['r6', 'Rainbow Six Siege', 'R6', [
    ['Defender gadget loadout', 'Characters / Operators', 'Nerf', '3 charges', '2 charges'],
    ['Camera switching', 'Bug Fixes', 'Fix'], ['Basement entry route', 'Maps', 'Adjustment'],
    ['Replay review marker', 'Anti-Cheat', 'New']
  ], 'Rebalance the defense setup and save a gadget for the late execute.'],
  ['pubg', 'PUBG: Battlegrounds', 'PUBG', [
    ['Marksman recoil recovery', 'Weapons', 'Buff', '260 ms', '235 ms'],
    ['Circle timing', 'Modes', 'Adjustment', '75 sec', '70 sec'], ['Inventory sync', 'Bug Fixes', 'Fix'],
    ['Tournament rotation', 'Ranked / Competitive', 'New']
  ], 'Practice earlier vehicle rotations and test longer-range cover fire.'],
  ['halo', 'Halo', 'HALO', [
    ['Shield recovery delay', 'Modes', 'Adjustment', '4.5 sec', '4.2 sec'],
    ['Objective equipment spawn', 'Maps', 'New'], ['Grenade radius', 'Weapons', 'Nerf', '4 m', '3.5 m'],
    ['Ranked reconnect', 'Bug Fixes', 'Fix']
  ], 'Review objective setups around the new resource timing and defensive routes.'],
  ['smash', 'Super Smash Bros. Ultimate', 'SSBU', [
    ['Landing recovery', 'Characters / Operators', 'Buff', '13 frames', '11 frames'],
    ['Training input display', 'Modes', 'New'], ['Edge interaction', 'Bug Fixes', 'Fix'],
    ['Stage selection preset', 'Ranked / Competitive', 'Adjustment']
  ], 'Recheck punish windows in practice before changing matchup plans.']
];

export const changeTypes = ['Buff', 'Nerf', 'Adjustment', 'New', 'Fix'];
export const patchCategories = categories;
export const patchGames = games.map(([id, name, icon, subjects, note], gameIndex) => ({
  id, name, icon, updated: '2026-11-15T12:00:00Z',
  patches: [0, 1, 2, 3].map(i => {
    const [subject, category, type, before, after] = subjects[i];
    const day = new Date(Date.UTC(2026, 10, 14 - i * 16 - gameIndex)).toISOString().slice(0, 10);
    return {
      id: id + '-sample-' + (4-i), version: 'Preview ' + (4-i) + '.0', sample: true, date: day,
      summary: 'Illustrative scenario for ' + subject.toLowerCase() + '.',
      tags: [category, i === 0 ? 'Meta watch' : 'Archive'],
      impact: [5, 3, 4, 2][i], faze: note,
      meta: i === 0 ? 'Monitor the interaction in practice before changing the team’s playbook.' : 'A small example of a situational shift.',
      official: '[ADD OFFICIAL LINK]',
      changes: [
        { category, type, text: subject + (before ? ' changes from ' + before + ' to ' + after + '.' : ' gets a sample update.'), before, after },
        ...subjects.filter((_, j) => j !== i).slice(0, 2).map(([label, group, kind]) => ({ category: group, type: kind, text: 'Illustrative update to ' + label.toLowerCase() + '.' }))
      ]
    };
  })
}));
