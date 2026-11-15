const team = 'https://fazeclan.com/pages/team';
const people = 'https://fazeclan.com/pages/people';
const r6 = 'https://www.ubisoft.com/en-us/esports/rainbow-six/siege/team/5/roster';
const six = 'https://www.ubisoft.com/en-us/esports/rainbow-six/siege/news-updates/uDngXbDiSp1qVCShKhhju/tournament-format';
const halo = 'https://www.halowaypoint.com/news/halowc2023';
const cdl = 'https://www.callofdutyleague.com/en-us/news/team-preview-altanta-faze-poised-to-take-championship-step';
const youtube = (id, title, channel, year, game) => ({
  id, title, channel, year, game, url: `https://www.youtube.com/watch?v=${id}`,
  image: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
});

export const videos = [
  youtube('3o65zAETqPQ', 'FaZe ILLCAMS · Episode 1', 'FaZe Clan', 2010),
  youtube('oYiMzAoGx1Y', 'Introducing FaZe Temperrr', 'FaZe Clan', 2010),
  youtube('2YIq90C5IPg', 'FaZe Top 5 Trickshots · Episode 1', 'FaZe Clan', 2011),
  youtube('rACwtbTSqwE', 'How FaZe Clan became PGL Major Champions', 'FaZe Esports', 2022, 'Counter-Strike'),
  youtube('tzIPoiZwPYo', 'LIKE THAT · Call of Duty Montage', 'Scope', 2025, 'Call of Duty'),
  youtube('cCc6j-iULMg', 'Team BDS vs. FaZe Clan · Six Invitational Grand Final', 'Rainbow Six Esports', 2025, 'Rainbow Six Siege'),
  youtube('OlgENlalVEM', 'Road to the World Cup · FaZe Clan', 'G FUEL', 2019, 'Fortnite')
];

export const eras = [
  { period: '2010–11', title: 'FaZe Sniping', text: 'ClipZ, House Cat and Resistance start a Call of Duty trickshot crew on YouTube. ILLCAMS gives fans a format to come back for.', video: videos[0].id, page: 1 },
  { period: '2012–13', title: 'The montage years', text: 'FaZe turns individual montages and team edits into events. Pamaj’s The Catalyst becomes a standout from the era.', page: 4 },
  { period: '2014–17', title: 'From the house to the arena', text: 'The creator house brings fans behind the scenes. FaZe enters Counter-Strike and builds an international roster.', page: 9 },
  { period: '2018–20', title: 'The crossover', text: 'Fortnite reaches a new generation of fans as FaZe expands into apparel collaborations and city-based Call of Duty competition.', page: 14 },
  { period: '2021–23', title: 'Championship years', text: 'Atlanta FaZe wins CDL Champs, then FaZe wins the Antwerp Major and the Halo World Championship.', video: videos[3].id, page: 22 },
  { period: '2024–25', title: 'A return to trickshots', text: 'Scope’s LIKE THAT montage returns to the format that built the channel. The Rainbow Six squad wins the 2025 Six Invitational.', video: videos[4].id, page: 31 },
  { period: '2026', title: 'Back-to-back in Siege', text: 'FaZe wins its second straight Six Invitational and adds the Rainbow Six Esports World Cup title.', source: six, page: 37 }
];

export const peopleArchive = [
  { name: 'FaZe Temperrr', role: 'Early FaZe creator', era: '2010–11', source: people, video: videos[1].url, label: 'FaZe introduction' },
  { name: 'FaZe Apex', role: 'Early FaZe creator', era: '2010–11', source: people, video: 'https://www.youtube.com/channel/UCa7507M549AiDKN8J89tn5A', label: 'YouTube channel' },
  { name: 'FaZe Rain', role: 'FaZe history', era: '2012–13', source: people, video: 'https://www.youtube.com/watch?v=lTaGUuovrgY', label: 'Creator upload' },
  { name: 'FaZe Banks', role: 'FaZe history', era: '2012–13', source: people, video: 'https://www.youtube.com/watch?v=CoI8VT0RCJs', label: 'Creator upload' },
  { name: 'Scope', role: 'Sniping and montages', era: '2024–25', source: 'https://www.youtube.com/watch?v=tzIPoiZwPYo', video: videos[4].url, label: 'Watch LIKE THAT' }
];

export const lineups = [
  { name: 'Rainbow Six Siege', period: 'Publisher roster', players: ['Handyy', 'cyber', 'soulz1', 'Kds', 'Vitaking'], coach: 'RafaDeLL', source: r6 },
  { name: 'Halo Infinite', period: '2023 world champions', players: ['Frosty', 'Renegade', 'Royal 2', 'SnakeBite'], coach: 'Royal 1', source: halo },
  { name: 'Counter-Strike', period: '2022 Antwerp Major champions', players: ['karrigan', 'rain', 'broky', 'Twistzz', 'ropz'], source: videos[3].url },
  { name: 'Call of Duty', period: '2021 Atlanta FaZe lineup', players: ['Simp', 'aBeZy', 'Cellium', 'Arcitys'], source: cdl }
];

export const results = [
  { year: 2026, game: 'Call of Duty', event: 'CDL Championship · FaZe Vegas', place: '1st', source: 'https://fazevegas.com/pages/latest' },
  { year: 2026, game: 'Rainbow Six Siege', event: 'Esports World Cup', place: '1st', source: six },
  { year: 2026, game: 'Rainbow Six Siege', event: 'Six Invitational', place: '1st', source: six },
  { year: 2025, game: 'Rainbow Six Siege', event: 'Six Invitational', place: '1st', source: six },
  { year: 2024, game: 'Halo Infinite', event: 'HCS London Major', place: '1st', source: 'https://www.halowaypoint.com/news/quadrant2024' },
  { year: 2023, game: 'Halo Infinite', event: 'Halo World Championship', place: '1st', source: halo },
  { year: 2022, game: 'Counter-Strike', event: 'PGL Major Antwerp', place: '1st', source: videos[3].url },
  { year: 2021, game: 'Call of Duty', event: 'CDL Championship', place: '1st', source: team }
];

export const merch = [
  { id: 'jersey', name: 'FaZe Clan 2025 Official Team Jersey', url: 'https://fazeclan.com/products/faze-clan-2025-official-team-jersey', image: 'https://fazeclan.com/cdn/shop/files/FaZe-2025-JERSEY-FRONT.png?v=1771355933&width=800' },
  { id: 'cap', name: 'Four Star 3D Snapback Hat (Black)', url: 'https://fazeclan.com/products/four-star-3d-snapback-hat-black', image: 'https://fazeclan.com/cdn/shop/files/FaZe_May25_Web_Mockups_WIP1_0000_GreyFrontcopy_0006_VectorSmartObject_0008_GAMESQUARE_017.jpg?v=1771355932&width=800' },
  { id: 'finger', name: 'FaZe F Foam Finger', url: 'https://fazeclan.com/products/faze-f-foam-finger', image: 'https://fazeclan.com/cdn/shop/files/FaZe_Foam_finger.png?v=1771355924&width=800' }
];

export const faze = { videos, eras, peopleArchive, lineups, results, merch, team, people, channel: 'https://www.youtube.com/user/FaZeClan', shop: 'https://fazeclan.com/collections/all' };
