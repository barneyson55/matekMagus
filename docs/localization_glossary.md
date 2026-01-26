# Lokalizációs glosszárium (HU)

Ez a dokumentum a felület **kötelezően használandó** magyar szövegeit és irányelveit rögzíti, hogy a gombfeliratok, állapotüzenetek és hibaszövegek következetesek legyenek.

## Alapelvek
- Tegező, rövid és egyértelmű megfogalmazás.
- Állapot- és hibaszövegek végén pont, kivéve a rövid visszajelzéseket (pl. „Helyes!”).
- Rendszer-visszajelzésekben ne használj emojit.
- Felhasználói instrukciókban **„nehézségi szint”** szerepeljen (nem „nehézség”).
- Az app neve: **MatekMester** (egybeírt, nagy M betűvel).
- Modulfülek fix címei: **Elmélet**, **Vizuális modell**, **Teszt**, **Gyakorlás**.
- Quest Log megnevezése: **Küldetésnapló**.

## Kulcsfogalmak és UI-címkék
| Fogalom | Kötelező forma | Megjegyzés |
| --- | --- | --- |
| App név | MatekMester | Egybeírt, nagy M betűkkel. |
| Quest Log | Küldetésnapló | Kerüld a „Quest log” formát. |
| Quest | Küldetés | Küldetés elfogadása / aktív küldetés / kimaxolt küldetés. |
| Character Sheet | Karakterlap | Avatarra kattintásnál ezt a címet használd. |
| Settings | Beállítások | Settings overlay címe + gomb. |
| Results | Eredményeim | Bal oldali gyorslink. |
| Achievements | Achievementek | A többes szám így szerepel a UI-ban. |
| Buffs | Buffok | Maradjon angol „buff”, magyar többessel. |
| XP bar | XP sáv | „XP” mindig nagybetűvel. |

## Modulhierarchia
| Szint | Kötelező forma | Megjegyzés |
| --- | --- | --- |
| Main topic | Főtéma | Példa: „Geometria”. |
| Subtopic | Altéma | Példa: „Alapfogalmak és Háromszögek”. |
| Topic | Témakör | Egy konkrét modul címe. |
| Modulzáró | Modulzáró | Főtéma záró tesztje. |
| Témazáró | Témazáró | Altéma záró tesztje. |

## Modulfülek
| Fül | Kötelező forma | Megjegyzés |
| --- | --- | --- |
| Theory tab | Elmélet | Nem „Kulcsfogalmak”, nem „Miért”. |
| Visual model tab | Vizuális modell | Diakritikával. |
| Test tab | Teszt | Egységes felirat. |
| Practice tab | Gyakorlás | Egységes felirat. |

## Nehézségi szintek
| Szint | Kötelező forma | Megjegyzés |
| --- | --- | --- |
| Easy | Könnyű | Kisbetűs változat állapotokban is ok. |
| Normal | Normál | Magyar ékezet nélkül. |
| Hard | Nehéz | Magyar ékezetekkel. |
| Label | Nehézségi szint | Mindig így hivatkozz rá. |

## Gombfeliratok
| Kulcs | Felirat | Megjegyzés |
| --- | --- | --- |
| quest_accept | Küldetés elfogadása | Quest felvétele. |
| test_start | Teszt indítása | Teszt kezdése. |
| test_restart | Új teszt | Új teszt indítása. |
| test_finish | Teszt befejezése és értékelés | Teszt lezárása + értékelés. |
| practice_start | Gyakorlás indítása | Gyakorló mód indítása. |
| answer_submit | Válasz elküldése | Ellenőrzés/elküldés gomb minden gyakorló feladatnál. |
| save | Mentés | Beállítások mentése. |
| cancel | Mégse | Módosítások elvetése. |
| close | Bezárás | Overlay bezárása. |
| settings | Beállítások | Settings gomb/overlay. |

## Állapotüzenetek
- Helyes! (+{xp} XP)
- Próbáld újra!
- Sikeres teszt!
- Nincs megoldás.
- Még nincsenek eredmények.
- Még nincs aktív küldetés.
- Még nincs kimaxolt modul.
- Még nem elfogadott küldetés.
- Aktív küldetés.
- Kimaxolt küldetés.
- Még nincsenek mentett teszteredmények.
- Még nincsenek achievementek.
- Nincs avatar kiválasztva.
- Nincs háttérkép kiválasztva.
- Nincs kiválasztott nehézségi szint.
- Következő szint: {xp} XP / Következő szint: Max

## Hibák / validáció
**Minta:** `Adj meg érvényes {adatot}.`

Példák:
- Adj meg érvényes számot.
- Adj meg érvényes számokat.
- Adj meg érvényes törtet.
- Adj meg érvényes százalékot.
- Válassz legalább egy nehézségi szintet.
