const shop = 'https://fazeclan.com/collections/faze-esports';
const cdn = 'https://cdn.shopify.com/s/files/1/0897/9110/3271/files/';
const sizes = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const item = (id, name, kind, price, file, detail, options = sizes, soldOut = false, original = null) =>
  ({ id, name, kind, price, image: cdn + file, detail, sizes: options, url: shop, soldOut, original });

export const products = [
  item('redline', 'Redline Track Suit', 'Outerwear', 150, 'REDLINETRACKSUITSET_1_550x825.png?v=1793127079', 'Matching track jacket and pants with redline detailing.'),
  item('esports-jersey', '2027 Official FaZe Clan Esports Team Jersey', 'Jerseys', 90, '2027_JERSEY_0001_MZI05625_550x825.jpg?v=1793299839', 'The official 2027 FaZe Clan Esports team jersey.'),
  item('cs-jersey', '2027 Official FaZe Clan Counter Strike Team Jersey', 'Jerseys', 90, '2027_JERSEY_0002_MZI05620_550x825.jpg?v=1793299921', 'The 2027 jersey for FaZe Clan’s Counter-Strike division.'),
  item('varsity-black', 'Varsity Tee (Black)', 'Tees', 40, 'BlackVarsityTeeFront_550x825.png?v=1794415641', 'Black tee with a FaZe varsity graphic.'),
  item('varsity-blue', 'Varsity Tee (Vintage Slate Blue)', 'Tees', 40, 'BlueVarsityTeeFront_550x825.png?v=1794415733', 'The FaZe varsity tee in vintage slate blue.'),
  item('nvg', 'NVG Tee (Dark Forrest Green)', 'Tees', 40, 'GreenNVGBack_550x825.png?v=1794415769', 'Dark forest green tee with an NVG back graphic.'),
  item('radio', 'Radio Hoodie (Black)', 'Outerwear', 90, 'BlackRadioHoodie_550x825.png?v=1794415797', 'Black FaZe pullover hoodie with Radio artwork.'),
  item('mouse-pad', 'Cybear XL Mouse Pad', 'Accessories', 30, 'Cybear_Mousepad_15.5x17.5_550x825.png?v=1789167331', 'XL mouse pad with the Cybear illustration.', ['One size']),
  item('cybear-tee', 'Cybear Tee (Black)', 'Tees', 40, 'PREVIEW-BEARLIGHTNING-TEE_550x825.jpg?v=1789166730', 'Black tee with the Cybear lightning artwork.'),
  item('cybear-hoodie', 'Cybear Hoodie (Vintage Black)', 'Outerwear', 90, 'Cybear_Hoodie_Front_550x825.png?v=1794593749', 'Vintage black pullover from the Cybear collection.'),
  item('tour-black', 'World Tour Tee (Black)', 'Tees', 40, 'World-Tour-Back_550x825.png?v=1794593806', 'FaZe World Tour graphic tee in black.'),
  item('tour-white', 'World Tour Tee (White)', 'Tees', 40, 'World-Tour-White-Back_550x825.png?v=1794593856', 'FaZe World Tour graphic tee in white.'),
  item('cafe', 'Café Flanqué Tee (Charcoal Oil Wash)', 'Tees', 42, 'cafe-back_720_550x825.png?v=1794593920', 'Charcoal oil-wash tee from the Café Flanqué drop.', sizes, true),
  item('tricolor-suit', 'Tri Color Limited Edition Track Suit', 'Outerwear', 120, 'TRICOLORTRACKSUIT_550x825.png?v=1779916199', 'Limited-edition three-color track set.', sizes, false, 150),
  item('tricolor-jersey', 'Tri Color Limited Edition Jersey', 'Jerseys', 68, 'TRICOLORJERSEY_550x825.png?v=1779915886', 'Limited-edition jersey with FaZe’s three-color design.', sizes, false, 85),
  item('night-mode', 'Night Mode 3M Track Suit', 'Outerwear', 150, 'NIGHTMODE_TRACKSUIT_550x825.png?v=1777330419', 'The Night Mode track set with 3M detailing.'),
  item('stallions-jersey', '2026 Official Stallions Jersey', 'Jerseys', 80, 'STALLIONS-FRONT_550x825.webp?v=1774393244', 'The official 2026 Stallions team jersey.', [...sizes, '4XL']),
  item('flank', 'Flank Tee (Vintage Black)', 'Tees', 40, 'FLANK-TEE-FRONT_b3726491-2fb5-4a3b-b854-4906bc8deaee_550x825.webp?v=1774385936', 'Vintage black tee featuring The Flank.'),
  item('crest', 'Stallions Logo Crest Tee (Vintage Grey)', 'Tees', 40, 'VINTA-Grey-TEE_d270881a-c3d7-49a5-b2af-991307a6e45b_550x825.webp?v=1794594578', 'Vintage grey tee with the Stallions crest.', sizes, true),
  item('college', 'Stallions College Tee (Off White)', 'Tees', 40, 'OFFWHITE-TEE_f06b6878-d0c7-459d-ac3f-c03fa1e54c01_550x825.webp?v=1794595287', 'Off-white tee with Stallions college lettering.')
];
