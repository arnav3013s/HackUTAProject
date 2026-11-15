const directory = 'https://fazeclan.com/pages/team';
const roster = (game, status, players, alumni, source = directory) => ({
  game, status, players: players ? players.split('|') : [], alumni: alumni.split('|'), source
});

export const rosters = [
  roster('Counter-Strike 2', 'November 2026 lineup', 'frozen|Twistzz|jcobbb|Neityu|JBOEN', 'broky (inactive)|rain|karrigan|ropz|olofmeister|NiKo|coldzera|GuardiaN|Kjaerbye|Bymas|s1mple (loan)|jks|USTILO|es3tag|kioShiMa|allu|aizy|jkaem|fox|Maikelele', 'https://www.hltv.org/team/6667/faze'),
  roster('Call of Duty', 'FaZe Vegas · announced 2027 lineup', 'Simp|Scrap|HyDra|Alluka', 'aBeZy|Cellium|Drazah|Abuzah|04|SlasheR|Arcitys|Priestahh|MajorManiak|Classic|Prestinni|Sib|GRVTY|JurNii|ZooMaa|Attach|Clayster|Enable|Censor|Aches|Karma|JKap|Parasite|Replays / Crowder|Methodz|Skrapz|Zer0|Jurd|Asim|MBoZe|Theory|Dedo|Saints|FormaL|Slacked|Loony|Gunless|Huke|Temp|Heist|Sham|Folsom|Secretly|Vengeance|Huhdle|SpaceLy|John|Proofy|Study|Ricky|Accuracy|FeLo|Naga|CouRage|RanbOw|Toto|Malls|Vortex|Zayrox|Riskin', 'https://fazevegas.com/pages/latest'),
  roster('Rainbow Six Siege', 'Publisher roster', 'cyber|soulz1|Vitaking|Handyy|Kds', 'Astro|cameram4n|Bullet1|mav|yoona|ion|gohaN|Muringa|Nino|Sn4rFx|Twister', 'https://www.ubisoft.com/en-us/esports/rainbow-six/siege/team/5/roster'),
  roster('PUBG', 'Supplied January 2026 snapshot', 'Fexx|Jeemzz|Gustav|curexi|vard', 'fuzzface|mxey|ubah|Aitzy|D1gg3r1|Smeef|Haxete|Jembty|rawryy|Mista|Baldy|Simms|MeToR'),
  roster('Halo Infinite', 'Historical 2023 championship lineup', 'SnakeBite|Royal 2|Frosty|Renegade', 'Snip3down|Bound|Falcated|Bubu dubu|Spartan|King Nick|Commonly|Tripppey', 'https://www.halowaypoint.com/news/halowc2023'),
  roster('Super Smash Bros. Ultimate', 'FaZe team directory', 'Sparg0', ''),
  roster('Apex Legends', 'Historical lineups', '', 'Snip3down|Phony|Frexs|SlurpeeG|Albralelie|ImMadness|Pandxrz|Xera|Naghz|Zaine|Sinetic|Dan|Arctic'),
  roster('Rocket League', 'Historical lineups', '', 'Firstkiller|AYYJAYY|mist|Sypical|Allushin|Gyro|Roll Dizz'),
  roster('Valorant', 'Historical lineups', '', 'babybay|corey|ZachaREEE|Marved|Rawkus|jasonR|dicey|supamen|poised|flyuh|shoT_UP|TiGG|mummAy|LarryBanks|Rossy|panini|Emy|di^|maddiesuun|refinnej|Trippy'),
  roster('Fortnite', 'Historical players and creators', '', 'Mongraal|Bizzle|Megga|Dubs|Cented|Edgey|Mitr0|Tfue|Cloakzy|Nate Hill|Funk|72hrs|Jaomock|Tennp0|SpaceLyon|Thiefs|Avery|Martoz|Tilt|Diggy|VorwenN|K1nG|Sway|Jarvis|H1ghSky1|Kay|Ewok'),
  roster('EA Sports FC and FIFA Online', 'Historical lineups', '', 'Tass|HugeGorilla|Jas|LycaN|TDKeane|JUBJUB|Michael04'),
  roster('PUBG Mobile', 'Historical lineups', '', 'TonyK|MELA|Vintorez|Onzenxs|BulShark|Echo|MR5|Maroon5|MaFia'),
  roster('Overwatch', '2016–17 archive', '', 'ShaDowBurn|FCTFCTN|Rawkus|zombs|Carpe|Spree|Joemeister|TwoEasy|Forsak3n|Mendokusaii|Lui|Mikeya'),
  roster('Warzone, Delta Force and other divisions', 'Supplied player archive', '', 'Swagg|Booya|Biffle|Repullze|JSmooth|Nio|Santana|Kalei|Rated|dizi|KingMatii|GoatClamp|DiogoAlmeida|Sydoka|Snows|ttony|Joey Fury|Gianmarco Fiduci|sOup77|Mental|Xplosive|SuMuNs|Praized')
];
