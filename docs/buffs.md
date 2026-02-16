# Buffs rendszer (spec + asset lista)

## Viselkedés
- A buffok a felső HUD bal oldalán, az XP-sáv elején jelennek meg.
- A buffok feloldása permanens; a feloldott buff ikonja mindig látszik.
- Aktív buff: teljes opacitás; inaktív buff: halványított ikon.
- Időzített aktiválás (V1): a Fókusz buff 15 percig aktív az utolsó helyes gyakorló válasz után.
- Minden egyéb buff passzív (folyamatosan aktív, ha feloldott).

## Feloldási szabályok (V1)
| ID | Név | Feloldás | Aktív állapot |
| --- | --- | --- | --- |
| focus | Fókusz | 5 helyes gyakorló válasz összesen | 15 percig aktív az utolsó helyes gyakorlás után |
| kitartas | Kitartás | 30 helyes gyakorló válasz összesen | Passzív, állandó |
| precizitas | Precizitás | Legalább 3 teszt 4-es vagy 5-ös jeggyel | Passzív, állandó |
| kihivas | Kihívás | Legalább 1 nehéz teszt 3-as vagy jobb jeggyel | Passzív, állandó |
| felfedezo | Felfedező | Gyakorlás legalább 4 különböző témában | Passzív, állandó |
| bajnok | Bajnok | Legalább 1 kimaxolt témakör/altéma/főtéma | Passzív, állandó |

## Asset lista (ikon tokenek)
A buff ikonok inline SVG-ként vannak definiálva a `buffs_icons.js` fájlban.

- focus (Fókusz) — célkereszt
- stamina (Kitartás) — villám
- precision (Precizitás) — pontosság/célkereszt
- challenge (Kihívás) — csúcsmászás/flag
- explorer (Felfedező) — iránytű
- crown (Bajnok) — korona
