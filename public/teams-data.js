// Current roster supplied by the project owner. Replace portraits only with approved FaZe photos.
const player = (name, fullName, country, role = 'Player', flags = {}) => ({
  name, fullName, country, role, ...flags,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
});
export const teams = [
  { slug: 'counter-strike', name: 'Counter-Strike', description: 'CS:GO and CS2 · precision under pressure.', joined: 'January 2016', players: [
    player('frozen', 'David Cernansky', 'Slovakia', 'Rifler'),
    player('Twistzz', 'Russel Van Dulken', 'Canada', 'Rifler'),
    player('jcobbb', 'Jakub Pietruszewski', 'Poland', 'Rifler'),
    player('Neityu', 'Ryan Aubry', 'France', 'Rifler'),
    player('JBOEN', 'Jason Boe Nielsen', 'Denmark'),
    player('broky', 'Helvijs Saukants', 'Latvia', 'AWPer', { inactive: true }),
    player('NEO', 'Filip Kubski', 'Poland', 'Head Coach', { coach: true })
  ] },
  { slug: 'call-of-duty', name: 'Call of Duty', description: 'FaZe Vegas · the next Call of Duty era.', joined: null, players: [
    player('Simp', 'Chris Lehr', 'USA', 'SMG'),
    player('Scrap', 'Thomas Ernst', 'USA', 'AR'),
    player('HyDra', 'Paco Rusiewiez', 'France', 'SMG'),
    player('Alluka', 'Mohammed Bindal', 'Germany', 'Flex/AR'),
    player('Crowder', 'James Crowder', 'USA', 'Head Coach', { coach: true }),
    player('RJ', 'Richard Simoncelli', 'USA', 'Assistant Coach', { coach: true })
  ] },
  { slug: 'rainbow-six-siege', name: 'Rainbow Six Siege', description: 'The Siege squad, built to make every round count.', joined: 'January 2018', players: [
    player('Cyber', 'Jaime Pereira Ramos', 'Brazil'),
    player('soulz1', 'Lucas Romero Schinke', 'Brazil'),
    player('VITAKING', 'Victor Augusto dos Santos', 'Brazil', 'Team Captain'),
    player('Handyy', 'Thiago Sa Ferreira', 'Brazil'),
    player('KDS', 'Eduardo Chiste Fontes Santos', 'Brazil'),
    player('RafadeLL', 'Rafael Batista de Oliveira', 'Brazil', 'Coach', { coach: true })
  ] },
  { slug: 'pubg', name: 'PUBG: Battlegrounds', description: 'Four players, one battleground.', joined: null, players: [
    player('Fexx', 'Christopher Wheddon', 'UK'),
    player('Jeemzz', 'Jim Eliassen', 'Norway'),
    player('Gustav', 'Gustav Blond', 'Denmark'),
    player('curexi', 'Tomi Kumpulainen', 'Finland')
  ] },
  { slug: 'halo', name: 'Halo', description: 'Halo Infinite and HCS · a championship legacy.', joined: null, players: [
    player('SnakeBite', 'Paul Duarte', 'USA'),
    player('Royal2', 'Mathew Fiorante', 'Canada'),
    player('Frosty', 'Bradley Bergstrom', 'USA'),
    player('Renegade', 'Jonathan Willette', 'USA')
  ] },
  { slug: 'super-smash-bros-ultimate', name: 'Super Smash Bros. Ultimate', description: 'One competitor. Every stock counts.', joined: '2022', players: [
    player('Sparg0', 'Edgar Valdez', 'Mexico')
  ] }
];
export const pastDivisions = ['Valorant', 'Fortnite', 'Apex Legends', 'Rocket League', 'Overwatch', 'EA Sports FC', 'PUBG Mobile'];
export const photoPath = (team, member) => `/images/players/${team.slug}/${member.slug}.webp`;
export const allPlayers = teams.flatMap(team => team.players.map(member => ({ ...member, team })));
