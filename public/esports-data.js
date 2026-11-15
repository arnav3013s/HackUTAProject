const team = 'https://fazeclan.com/pages/team';
const gameArt = {
  "cs": "https://cdn.akamai.steamstatic.com/steam/apps/730/ss_60b4f959497899515f46012df805b0006ef21af6.1920x1080.jpg?t=1668125812",
  "cod": "https://imgs.callofduty.com/content/dam/atvi/callofduty/cod-touchui/mw4/meta/MW4_LP_Meta.webp",
  "r6": "https://cdn.wccftech.com/wp-content/uploads/2025/03/Rainbow-Six-Siege-X-scaled.jpg",
  "pubg": "https://image.api.playstation.com/vulcan/ap/rnd/202405/1408/38d76731861cb22eda6417471d0f60fd4ae56d418fbeb840.png",
  "halo": "https://cdn.akamai.steamstatic.com/steam/apps/1240440/library_hero.jpg",
  "smash": "https://bfasset.costco-static.com/U447IH35/as/5mxjvxmmf37bgp55x664k76/4000380676-847__1?auto=webp&canvas=1024%2C1024&fit=bounds&format=jpg&height=1024&width=1024",
  "apex": "https://cdn.akamai.steamstatic.com/steam/apps/1172470/library_hero.jpg",
  "rocket": "https://image.api.playstation.com/vulcan/ap/rnd/202009/0323/7Cwm55w1Sf7UgZwARdoi6eQC.png",
  "valorant": "https://media.altchar.com/prod/images/original/gm-529b584b-80b1-423f-8125-fd35b39f9651-valorant-key-art-final.jpg",
  "fortnite": "https://butcherblockbuffet.com/images/uploads/post/c9707e3f-590b-4e25-9680-65ec4af20d69.jpg",
  "fc": "https://www.purepc.pl/image/news/2026/07/22_ea_sports_fc_27_oficjalnie_zapowiedziana_bedzie_to_pierwsza_gra_w_serii_ze_znacznie_wyzszym_oznaczeniem_od_pegi_0_b.jpg",
  "mobile": "https://pbs.twimg.com/media/EZrVgJ_XkAQX9jX.jpg",
  "overwatch": "https://assets1.ignimgs.com/2018/02/23/overwatch-button-v2-1519416414955.jpg",
  "other": "https://xboxwire.thesourcemediaassets.com/sites/2/2023/11/CODWZ_S1-X1_-1920x1080-enUS_JPG-7bfcc41943e5c8cfdb37.jpg"
};
const section =(key, name, caption, lead, rosterGame, results, source = team) => ({ key, name, caption, lead, rosterGame, results, source, art: gameArt[key] });
const result = (year, event, place, detail) => ({year,event,place,detail});

export const divisions = [
  section('cs','Counter-Strike','CS2 / CS:GO','From the 2016 international lineup to the first Major win at Antwerp, then the last available Intel Grand Slam.','Counter-Strike 2',[
    result(2023,'Intel Grand Slam · Season 4','1st','$1 million Grand Slam bonus'),
    result(2022,'PGL Major Antwerp','1st','2–0 over NAVI · rain named MVP'),
    result(2022,'IEM Cologne','1st','3–2 over NAVI'),
    result(2022,'IEM Katowice','1st','3–0 over G2')
  ],'https://www.hltv.org/team/6667/faze'),
  section('cod','Call of Duty','ATLANTA / VEGAS','The game that launched FaZe also gave the organization two CDL championships under two city banners.','Call of Duty',[
    result(2026,'CDL Championship · FaZe Vegas','1st','FaZe Vegas defeated OpTic Texas'),
    result(2024,'Esports World Cup · Atlanta FaZe','1st','Riyadh · beat 100 Thieves in the final'),
    result(2021,'CDL Championship · Atlanta FaZe','1st','5–3 over Toronto Ultra · aBeZy MVP')
  ],'https://fazevegas.com/pages/latest'),
  section('r6','Rainbow Six Siege','SIEGE X','FaZe’s Brazilian squad won consecutive Six Invitationals in 2025 and 2026, then added the Esports World Cup title.','Rainbow Six Siege',[
    result(2026,'Esports World Cup','1st','Riyadh'),
    result(2026,'Six Invitational','1st','Second consecutive Invitational title'),
    result(2025,'Six Invitational','1st','3–1 over Team BDS'),
    result(2024,'Six Invitational','2nd','São Paulo')
  ],'https://www.ubisoft.com/en-us/esports/rainbow-six/siege/team/5/timeline'),
  section('pubg','PUBG','BATTLEGROUNDS','A Nordic lineup made FaZe a European powerhouse and pushed for a world title in 2019.','PUBG',[
    result(2019,'PUBG Global Championship','2nd','FaZe finished runner-up'),
    result(2019,'PUBG Europe League · Phase 3','1st','Second straight league phase title'),
    result(2019,'PUBG Europe League · Phase 2','1st','First league phase title')
  ],'https://pubgesports.com/en/news/7413'),
  section('halo','Halo','HALO INFINITE','The 2023 championship lineup of Frosty, Renegade, Royal 2 and SnakeBite brought FaZe a world title in Seattle.','Halo Infinite',[
    result(2024,'HCS London Major','1st','London'),
    result(2023,'Halo World Championship','1st','Seattle · over OpTic Gaming'),
    result(2023,'HCS Dallas Global Invitational','1st','Dallas')
  ],'https://www.halowaypoint.com/news/halowc2023'),
  section('smash','Super Smash Bros.','ULTIMATE','FaZe entered Ultimate with Mexican standout Sparg0, known for his Cloud and Pyra/Mythra play.','Super Smash Bros. Ultimate',[
    result(2023,'Kagaribi #10','1st','Sparg0 · Ultimate Singles'),
    result(2023,'Battle of BC 5','1st','Sparg0 · Ultimate Singles')
  ],'https://liquipedia.net/smash/Sparg0'),
  section('apex','Apex Legends','ALGS','FaZe’s ALGS archive includes multiple North American lineups and LAN appearances.','Apex Legends',[
    result(2023,'ALGS Championship','5th','FaZe Clan at Birmingham')
  ],'https://liquipedia.net/apexlegends/FaZe_Clan'),
  section('rocket','Rocket League','RLCS','Firstkiller and FaZe reached the final of the 2022–23 Winter Major during the organization’s RLCS run.','Rocket League',[
    result(2023,'RLCS Winter Major','2nd','San Diego · runners-up to Karmine Corp')
  ],'https://liquipedia.net/rocketleague/FaZe_Clan'),
  section('valorant','VALORANT','VCT / CHALLENGERS','The early FaZe lineup reached a Masters grand final. The organization later competed in Challengers and Game Changers.','Valorant',[
    result(2021,'VCT Stage 1 Masters · North America','2nd','FaZe reached the grand final'),
    result(2020,'FaZe Clan Invitational','Host','The org’s own VALORANT tournament')
  ],'https://liquipedia.net/valorant/FaZe_Clan'),
  section('fortnite','Fortnite','BATTLE ROYALE','Fortnite introduced FaZe to a new audience through names like Tfue, Cloakzy, Mongraal and Nate Hill.','Fortnite',[
    result(2019,'Fortnite World Cup · Duos','6th','Mongraal & Mitr0'),
    result(2018,'Fall Skirmish Grand Finals','1st','Tfue & Cloakzy')
  ],'https://liquipedia.net/fortnite/FaZe_Clan'),
  section('fc','EA Sports FC','FIFA / FC ONLINE','The FIFA and FC Online archive brings together FaZe players from Europe and Southeast Asia.','EA Sports FC and FIFA Online',[
    result(2023,'FIFAe Continental Cup','1st','FaZe Clan · JUBJUB')
  ],'https://www.oneesports.co.th/ea-sports-fc/jubjub-fifae-continental/'),
  section('mobile','PUBG Mobile','THAILAND','FaZe entered PUBG Mobile in 2020 with an all-Thai roster.','PUBG Mobile',[
    result(2023,'PMPL Thailand Spring','Entered','Historical season · Thailand'),
    result(2020,'FaZe PUBG Mobile launch','Debut','All-Thai roster signed in January')
  ],'https://liquipedia.net/pubgmobile/FaZe_Clan'),
  section('overwatch','Overwatch','2016–17 ARCHIVE','Before the franchised league, FaZe fielded a roster featuring players such as Rawkus and ShaDowBurn.','Overwatch',[
    result(2016,'Overwatch Open','Competed','FaZe Clan at the inaugural event'),
    result(2017,'Contenders Season 1 · North America','2nd','Runner-up to EnVyUs')
  ],'https://liquipedia.net/overwatch/FaZe_Clan'),
  section('other','Other divisions','WARZONE / DELTA FORCE','Explore the players who represented FaZe in Warzone, Delta Force and other competitive games.','Warzone, Delta Force and other divisions',[
    result(2021,'Nuke Squad joins FaZe','Debut','Swagg, Booya, JSmooth and Santana')
  ])
];

export const galleryFilters = [['all','All'],['cs','Counter-Strike'],['cod','Call of Duty'],['r6','Rainbow Six'],['pubg','PUBG'],['halo','Halo'],['fortnite','Fortnite'],['other-games','Other games']];
export const primaryGalleryGames = new Set(galleryFilters.slice(1,-1).map(([id])=>id));

const ytVideo = (id,title,label,summary) => ({id,title,label,summary,type:'video',image:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg',url:'https://www.youtube.com/watch?v='+id});
export const updates = [
  ytVideo('H7S0SPJj-Ew','$100K Flank Invitational','NOV 12, 2026 · ZOOMAA LIVE','Catch the FaZe x The Flank Invitational and the Modern Warfare 4 action.'),
  {type:'tournament',title:'PGL Major Singapore',label:'NOV 24–DEC 13, 2026 · COUNTER-STRIKE',summary:'Follow FaZe at the 32-team Counter-Strike Major in Singapore.',url:'https://cs2tracker.gg/events'},
  {type:'tournament',title:'CDL Kickoff Tournament',label:'DEC 4–13, 2026 · CALL OF DUTY',summary:'The 2027 season opens on Modern Warfare 4. See the official schedule for Vegas FaZe fixtures.',url:'https://www.callofdutyleague.com/en-us/schedule'},
  {type:'stream',title:'CDL Kickoff broadcasts',label:'DEC 4–13, 2026 · OFFICIAL CDL STREAM',summary:'The league opens on December 4. See the CDL schedule for match times and tune in to its official live broadcasts.',url:'https://www.youtube.com/@CODLeague/streams'},
  {type:'stream',title:'FaZe on Twitch',label:'OFFICIAL STREAM CHANNEL',summary:'Follow the channel for alerts and browse recent broadcasts. Check Twitch for the current live status.',url:'https://www.twitch.tv/faze'},
  {type:'stream',title:'ZooMaa Live',label:'THE FLANK · TWITCH',summary:'Follow ZooMaa for tournament co-streams, Call of Duty and The Flank.',url:'https://www.twitch.tv/zoomaa'},
  ytVideo('rACwtbTSqwE','How FaZe won Antwerp','ARCHIVE · FAZE ESPORTS','The story behind the Counter-Strike Major trophy.')
];
