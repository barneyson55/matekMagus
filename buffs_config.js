const BUFF_CATALOG = [
  {
    id: 'focus',
    nameHu: 'Fókusz',
    description: 'Rövid ideig élesebb koncentráció a gyakorlásban.',
    iconToken: 'focus',
    unlockRule: '5 egymást követő helyes gyakorló válasz.',
  },
  {
    id: 'kitartas',
    nameHu: 'Kitartás',
    description: 'Hosszabb gyakorlásnál segít tartani a tempót.',
    iconToken: 'stamina',
    unlockRule: '30 helyes gyakorló válasz összesen.',
  },
];

const BUFF_BY_ID = Object.fromEntries(
  BUFF_CATALOG.map((buff) => [buff.id, buff])
);

module.exports = {
  BUFF_CATALOG,
  BUFF_BY_ID,
};
