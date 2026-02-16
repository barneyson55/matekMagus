const LEVEL_TYPES = {
  FOTEMA: 'fotema',
  ALTEMA: 'altema',
  TEMAKOR: 'temakor',
};

const LEVEL_BASE_XP = 50;
const LEVEL_GROWTH = 1.07;
const MAX_LEVEL = 50;
const LEVEL_SEGMENTS = Array.from({ length: MAX_LEVEL }, (_, index) =>
  Math.round(LEVEL_BASE_XP * Math.pow(LEVEL_GROWTH, index))
);
const XP_CAP = LEVEL_SEGMENTS.reduce((sum, xp) => sum + xp, 0);

const DEFAULT_BASE_XP = {
  [LEVEL_TYPES.FOTEMA]: 300,
  [LEVEL_TYPES.ALTEMA]: 150,
};

const TOPIC_CONFIG = {
  // Fo temak
  alapozo_modulzaro: { levelType: LEVEL_TYPES.FOTEMA, topicWeight: 1.0 },
  algebra_modulzaro: { levelType: LEVEL_TYPES.FOTEMA, topicWeight: 1.2 },
  geometria_modulzaro: { levelType: LEVEL_TYPES.FOTEMA, topicWeight: 1.2 },
  valstat_modulzaro: { levelType: LEVEL_TYPES.FOTEMA, topicWeight: 1.3 },
  emelt_modulzaro: { levelType: LEVEL_TYPES.FOTEMA, topicWeight: 1.4 },

  // Altemak
  gondolkodas_temazaro: { levelType: LEVEL_TYPES.ALTEMA, topicWeight: 1.1 },
  szamelmelet_temazaro: { levelType: LEVEL_TYPES.ALTEMA, topicWeight: 1.1 },
  racionalis_szamok_temazaro: { levelType: LEVEL_TYPES.ALTEMA, topicWeight: 1.0 },
  hatvany_temazaro: { levelType: LEVEL_TYPES.ALTEMA, topicWeight: 1.2 },
  algebrai_kif_temazaro: { levelType: LEVEL_TYPES.ALTEMA, topicWeight: 1.1 },
  egyenletek_temazaro: { levelType: LEVEL_TYPES.ALTEMA, topicWeight: 1.2 },
  fuggvenyek_alt_temazaro: { levelType: LEVEL_TYPES.ALTEMA, topicWeight: 1.2 },
  nevezetes_fuggvenyek_temazaro: { levelType: LEVEL_TYPES.ALTEMA, topicWeight: 1.3 },
  haromszogek_temazaro: { levelType: LEVEL_TYPES.ALTEMA, topicWeight: 1.2 },
  sokszogek_temazaro: { levelType: LEVEL_TYPES.ALTEMA, topicWeight: 1.2 },
  kor_temazaro: { levelType: LEVEL_TYPES.ALTEMA, topicWeight: 1.3 },
  geo_transzform_temazaro: { levelType: LEVEL_TYPES.ALTEMA, topicWeight: 1.3 },
  koordinatageometria_temazaro: { levelType: LEVEL_TYPES.ALTEMA, topicWeight: 1.3 },
  tergeometria_temazaro: { levelType: LEVEL_TYPES.ALTEMA, topicWeight: 1.4 },
  kombinatorika_temazaro: { levelType: LEVEL_TYPES.ALTEMA, topicWeight: 1.3 },
  valszam_temazaro: { levelType: LEVEL_TYPES.ALTEMA, topicWeight: 1.3 },
  statisztika_temazaro: { levelType: LEVEL_TYPES.ALTEMA, topicWeight: 1.2 },
  sorozatok_temazaro: { levelType: LEVEL_TYPES.ALTEMA, topicWeight: 1.4 },
  differencial_temazaro: { levelType: LEVEL_TYPES.ALTEMA, topicWeight: 1.4 },
  integral_temazaro: { levelType: LEVEL_TYPES.ALTEMA, topicWeight: 1.4 },

  // Temakorok - Alapozo
  halmazmuveletek: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.1, baseXP: 55 },
  logikai_szita: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.1, baseXP: 55 },
  skatulya_elv: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.2, baseXP: 60 },
  oszthatosag: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.0, baseXP: 50 },
  lnko_lkkt: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.0, baseXP: 50 },
  primtenyezok: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.1, baseXP: 55 },
  szamrendszerek: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.1, baseXP: 55 },
  tortek: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.0, baseXP: 50 },
  tizedes_tortek: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.0, baseXP: 50 },
  szazalekszamitas: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.1, baseXP: 55 },
  hatvanyozas: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.2, baseXP: 60 },
  gyokvonas: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.2, baseXP: 60 },
  logaritmus: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },

  // Temakorok - Algebra es fuggvenyek
  polinomok: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.1, baseXP: 55 },
  nevezetes_azonossagok: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.1, baseXP: 55 },
  algebrai_tortek: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.1, baseXP: 55 },
  linearis_egyenletek: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.1, baseXP: 55 },
  masodfoku_egyenlet: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  viete_formulak: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.2, baseXP: 60 },
  parameteres_masodfoku: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  specialis_egyenletek: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  fuggveny_alapok: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.1, baseXP: 55 },
  fuggveny_jellemzes: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.2, baseXP: 60 },
  paritas: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.0, baseXP: 50 },
  fuggveny_transzformaciok: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.2, baseXP: 60 },
  linearis_fuggveny: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.1, baseXP: 55 },
  masodfoku_fuggveny: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  hatvanyfuggvenyek: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.2, baseXP: 60 },
  exp_log_fuggveny: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  trigonometrikus_fuggvenyek: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.4, baseXP: 70 },
  specialis_fuggvenyek: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.2, baseXP: 60 },
  abszolut_ertek_fuggveny: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.2, baseXP: 60 }, // legacy alias

  // Temakorok - Geometria
  nevezetes_vonalak: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.2, baseXP: 60 },
  haromszog_egyenlotlenseg: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.2, baseXP: 60 },
  szogtetelek: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.2, baseXP: 60 },
  szinusz_koszinusz_tetel: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  terulet_kerulet: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.2, baseXP: 60 },
  specialis_negyszogek: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.2, baseXP: 60 },
  keruleti_szogek: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  latokoriv: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  kor_helyzetek: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  tukrozes: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  eltolas_forgatas: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  hasonlosag: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  vektorok: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  egyenes_egyenlete: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  kor_egyenlete: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  alakzatok_metszespontja: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  hasabok_gulak: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.4, baseXP: 70 },
  forgastestek: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.4, baseXP: 70 },

  // Temakorok - Valoszinuseg es statisztika
  permutaciok: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  variaciok: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  kombinaciok: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  binomialis_tetel: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  klasszikus_valoszinuseg: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  geometriai_valoszinuseg: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  felteteles_valoszinuseg: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.3, baseXP: 65 },
  adatok_abrazolasa: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.2, baseXP: 60 },
  kozepertekek: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.2, baseXP: 60 },
  szorodas: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.2, baseXP: 60 },

  // Temakorok - Emelt modulok
  szamtani_mertani: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.4, baseXP: 70 },
  kamatoskamat: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.4, baseXP: 70 },
  konvergencia: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.4, baseXP: 70 },
  hatarertek: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.4, baseXP: 70 },
  derivalt_fogalma: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.4, baseXP: 70 },
  derivalasi_szabalyok: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.4, baseXP: 70 },
  fuggvenyvizsgalat: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.4, baseXP: 70 },
  hatarozatlan_integral: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.4, baseXP: 70 },
  hatarozott_integral: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.4, baseXP: 70 },
  newton_leibniz: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.4, baseXP: 70 },
  terfogatszamitas: { levelType: LEVEL_TYPES.TEMAKOR, topicWeight: 1.4, baseXP: 70 },
};

module.exports = {
  LEVEL_TYPES,
  LEVEL_BASE_XP,
  LEVEL_GROWTH,
  MAX_LEVEL,
  LEVEL_SEGMENTS,
  XP_CAP,
  DEFAULT_BASE_XP,
  TOPIC_CONFIG,
};
