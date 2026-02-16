const BUFF_CATALOG = [
  {
    id: 'focus',
    nameHu: 'Fókusz',
    description: 'Rövid ideig élesebb koncentráció a gyakorlásban.',
    iconToken: 'focus',
    unlockRule: '5 helyes gyakorló válasz összesen.',
    activeRule: 'Aktív 15 percig az utolsó helyes gyakorlás után.',
  },
  {
    id: 'kitartas',
    nameHu: 'Kitartás',
    description: 'Hosszabb gyakorlásnál segít tartani a tempót.',
    iconToken: 'stamina',
    unlockRule: '30 helyes gyakorló válasz összesen.',
    activeRule: 'Passzív, állandó bónusz.',
  },
  {
    id: 'precizitas',
    nameHu: 'Precizitás',
    description: 'Pontos tesztmegoldásokért járó elismerés.',
    iconToken: 'precision',
    unlockRule: 'Legalább 3 teszt 4-es vagy 5-ös jeggyel.',
    activeRule: 'Passzív, állandó bónusz.',
  },
  {
    id: 'kihivas',
    nameHu: 'Kihívás',
    description: 'A nehezebb feladatok vállalásáért jár.',
    iconToken: 'challenge',
    unlockRule: 'Legalább 1 nehéz teszt 3-as vagy jobb jeggyel.',
    activeRule: 'Passzív, állandó bónusz.',
  },
  {
    id: 'felfedezo',
    nameHu: 'Felfedező',
    description: 'Több témában végzett gyakorlásért jutalmaz.',
    iconToken: 'explorer',
    unlockRule: 'Gyakorlás legalább 4 különböző témában.',
    activeRule: 'Passzív, állandó bónusz.',
  },
  {
    id: 'bajnok',
    nameHu: 'Bajnok',
    description: 'Kimaxolt küldetés teljesítéséért járó jelvény.',
    iconToken: 'crown',
    unlockRule: 'Legalább 1 kimaxolt témakör/altéma/főtéma.',
    activeRule: 'Passzív, állandó bónusz.',
  },
];

const BUFF_BY_ID = Object.fromEntries(
  BUFF_CATALOG.map((buff) => [buff.id, buff])
);

module.exports = {
  BUFF_CATALOG,
  BUFF_BY_ID,
};
