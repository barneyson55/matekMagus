# XP Progress Plan (titkos terv)

> Ez a fájl csak a fejlesztőknek szól.  
> A benne lévő értékek alapján fogjuk később beállítani a tényleges XP-számítást és a maximális szintet.

Az alábbi táblákban minden **főtéma / altéma / témakör** szerepel a hozzá tartozó:

- `topicId` – technikai azonosító (index.html-ben is ez fut),
- `szint` – főtéma / altéma / témakör,
- `tierMult` – struktúra-szint súly,
- `topicWeight` – relatív nehézség,
- `baseXP` – közepes nehézség, 4‑es jegy esetén járó XP (a nehézség és jegy szorzók nélküli „alap”).

A ténylegesen kiosztott XP számítását a dokumentum végén foglaljuk össze.

---

## 1. Alapozó modulok (foundation) – topicWeight ≈ 1.0

**Globális beállítások ennél a főtémánál**

- `domainWeight = 1.0`
- `tierMult`:  
  - főtéma = 1.5  
  - altéma = 1.2  
  - témakör = 1.0
- Kérdésszám (terv):  
  - főtéma modulzáró = 20 kérdés  
  - altéma témazáró = 15 kérdés  
  - egyes témakörök = 10 kérdés
- Ebből következik (közepes, jegy = 4 esetén):  
  - főtéma baseXP ≈ 150  
  - altéma baseXP ≈ 90  
  - témakör baseXP ≈ 50

### 1.1 Főtéma

| topicId              | Név                 | Szint   | tierMult | topicWeight | baseXP |
|----------------------|--------------------|--------|----------|-------------|--------|
| `alapozo_modulzaro`  | Alapozó modulok    | főtéma | 1.5      | 1.0         | 150    |

### 1.2 Altémák

| topicId                     | Név                                   | Szint   | tierMult | topicWeight | baseXP |
|-----------------------------|---------------------------------------|--------|----------|-------------|--------|
| `gondolkodas_temazaro`      | Gondolkodási módszerek, Halmazok     | altéma | 1.2      | 1.1         | 100    |
| `szamelmelet_temazaro`      | Számelmélet és Számrendszerek        | altéma | 1.2      | 1.1         | 100    |
| `racionalis_szamok_temazaro`| Racionális számok                    | altéma | 1.2      | 1.0         | 90     |
| `hatvany_temazaro`          | Hatvány, Gyök, Logaritmus            | altéma | 1.2      | 1.2         | 110    |

### 1.3 Témakörök

| topicId          | Név                               | Tartozik ide                         | topicWeight | baseXP |
|------------------|-----------------------------------|--------------------------------------|------------|--------|
| `halmazmuveletek`| Halmazműveletek                  | Gondolkodási módszerek, Halmazok    | 1.1        | 55     |
| `logikai_szita`  | Logikai szita formula            | Gondolkodási módszerek, Halmazok    | 1.1        | 55     |
| `skatulya_elv`   | Skatulya-elv, párosítások        | Gondolkodási módszerek, Halmazok    | 1.2        | 60     |
| `oszthatosag`    | Oszthatósági szabályok           | Számelmélet és Számrendszerek       | 1.0        | 50     |
| `lnko_lkkt`      | LNKO, LKKT                       | Számelmélet és Számrendszerek       | 1.0        | 50     |
| `primtenyezok`   | Prímtényezős felbontás           | Számelmélet és Számrendszerek       | 1.1        | 55     |
| `szamrendszerek` | Számrendszerek                   | Számelmélet és Számrendszerek       | 1.1        | 55     |
| `tortek`         | Törtek és műveletek              | Racionális számok                   | 1.0        | 50     |
| `tizedes_tortek` | Tizedes törtek, átváltások       | Racionális számok                   | 1.0        | 50     |
| `szazalekszamitas`| Százalékszámítás                | Racionális számok                   | 1.1        | 55     |
| `hatvanyozas`    | Hatványozás azonosságai          | Hatvány, Gyök, Logaritmus           | 1.2        | 60     |
| `gyokvonas`      | Négyzetgyök, n-edik gyök         | Hatvány, Gyök, Logaritmus           | 1.2        | 60     |
| `logaritmus`     | A logaritmus fogalma             | Hatvány, Gyök, Logaritmus           | 1.3        | 65     |

---

## 2. Algebra és Függvények – domainWeight ≈ 1.2

Algebrai kifejezések, egyenletek, általános függvényelmélet és nevezetes függvények. Ezek már érezhetően nehezebbek, ezért magasabb súlyok.

### 2.1 Főtéma

| topicId             | Név                     | Szint   | tierMult | topicWeight | baseXP |
|---------------------|------------------------|--------|----------|-------------|--------|
| `algebra_modulzaro` | Algebra és Függvények  | főtéma | 1.5      | 1.2         | 180    |

### 2.2 Altémák

| topicId                  | Név                           | Szint   | tierMult | topicWeight | baseXP |
|--------------------------|------------------------------|--------|----------|-------------|--------|
| `algebrai_kif_temazaro`  | Algebrai kifejezések         | altéma | 1.2      | 1.1         | 108    |
| `egyenletek_temazaro`    | Egyenletek, egyenlőtlenségek | altéma | 1.2      | 1.2         | 115    |
| `fuggvenyek_alt_temazaro`| Függvények általános tulajd. | altéma | 1.2      | 1.2         | 115    |
| `nevezetes_fuggvenyek_temazaro`| Nevezetes függvények   | altéma | 1.2      | 1.3         | 125    |

### 2.3 Témakörök (példák)

| topicId                | Név                         | Altéma                        | topicWeight | baseXP |
|------------------------|-----------------------------|-------------------------------|------------|--------|
| `polinomok`            | Műveletek polinomokkal      | Algebrai kifejezések         | 1.1        | 55     |
| `nevezetes_azonossagok`| Nevezetes azonosságok       | Algebrai kifejezések         | 1.1        | 55     |
| `algebrai_tortek`      | Algebrai törtek             | Algebrai kifejezések         | 1.1        | 55     |
| `linearis_egyenletek`  | Lineáris egyenletek         | Egyenletek, egyenlőtlenségek | 1.1        | 60     |
| `masodfoku_egyenlet`   | Másodfokú egyenlet          | Egyenletek, egyenlőtlenségek | 1.3        | 70     |
| `viete_formulak`       | Viète-formulák              | Egyenletek, egyenlőtlenségek | 1.2        | 65     |
| `parameteres_masodfoku`| Paraméteres másodfokú egyenl.| Egyenletek, egyenlőtlenségek| 1.3        | 70     |
| `specialis_egyenletek` | Abszolútértékes, gyökös, stb.| Egyenletek, egyenlőtlenségek| 1.3        | 70     |
| `fuggveny_alapok`      | Értelmezési tartomány, értékkészlet | Függvények ált. | 1.1 | 55 |
| `fuggveny_jellemzes`   | Monotonitás, szélsőérték    | Függvények ált.              | 1.2        | 60     |
| `paritas`              | Paritás (páros/páratlan)    | Függvények ált.              | 1.0        | 50     |
| `fuggveny_transzformaciok`| Függvénytranszformációk | Függvények ált.              | 1.2        | 60     |
| `linearis_fuggveny`    | Lineáris függvény           | Nevezetes függvények         | 1.1        | 60     |
| `masodfoku_fuggveny`   | Másodfokú függvény          | Nevezetes függvények         | 1.3        | 70     |
| `hatvanyfuggvenyek`    | Hatványfüggvények           | Nevezetes függvények         | 1.2        | 65     |
| `exp_log_fuggveny`     | Exponenciális és logaritmus | Nevezetes függvények         | 1.3        | 70     |
| `trigonometrikus_fuggvenyek`| Trigonometrikus fv.    | Nevezetes függvények         | 1.4        | 75     |
| `abszolut_ertek_fuggveny` | Abszolútérték-függvény   | Nevezetes függvények         | 1.2        | 65     |

*(A tényleges topicId-ket az index.html alapján pontosítjuk, itt a logika a fontos.)*

---

## 3. Geometria – domainWeight ≈ 1.2–1.3

Nagyjából az algebra szintje, de a térgeometria és trigonometria részekre kicsit nagyobb súly mehet.

*(Részletezés ugyanígy: főtéma `geometria_modulzaro`, altémák: alapfogalmak, kör, transzformációk, koordinátageometria, térgeometria; mindegyikre baseXP és topicWeight.)*

---

## 4. Valószínűségszámítás és statisztika – domainWeight ≈ 1.3

Itt általánosan magasabb `topicWeight` értékeket használunk (1.2–1.4), mivel sok diáknak ez okozza a legtöbb nehézséget (kombinatorika, valószínűség).

---

## 5. Emelt szintű kiegészítések – domainWeight ≈ 1.4

Sorozatok, analízis elemek (deriválás, integrálás). Ezekhez a témákhoz magasabb `topicWeight` (1.3–1.4) és a későbbiekben akár extra emelt-szint szorzó (pl. 1.2) társítható.

---

## 6. Jegy-alapú XP szorzók

Az eddig táblázott `baseXP` értékek **közepes nehézségű tesztre és 4‑es jegyre** vonatkoznak. A valós XP a jegytől is függ:

| Jegy | Megnevezés  | gradeMultiplier | Megjegyzés                            |
|------|-------------|-----------------|---------------------------------------|
| 1    | elégtelen   | 0.0             | nincs XP, sikertelen teljesítés      |
| 2    | elégséges   | 0.5             | „alap” teljesítés                    |
| 3    | közepes     | 0.75            | jobb, de még nem stabil              |
| 4    | jó          | 1.0             | a táblákban szereplő `baseXP`        |
| 5    | jeles       | 1.25            | jutalom a kimaxolt teljesítményért   |

---

## 7. Nehézségi szint szorzók

| difficulty | difficultyMultiplier | Megjegyzés                     |
|-----------|----------------------|--------------------------------|
| konnyu    | 0.7                  | Belépő szint, bemelegítés     |
| kozepes   | 1.0                  | Standard érettségi szint      |
| nehez     | 1.4                  | Emelt / trükkösebb példák     |

---

## 8. Összesített XP képlet (teszt szinten)

Paraméterek:

- `baseXP(topicId)` – a táblákból (kozepes, 4‑es jegy),
- `gradeMultiplier(grade)` – lásd fenti táblázatot,
- `difficultyMultiplier(diff)` – lásd fenti táblázatot.

```text
XP_run = round( baseXP(topicId) * gradeMultiplier(grade) * difficultyMultiplier(diff) )
```

Korlátok:

- Egy adott `(topicId, difficulty)` kombinációra **csak az első sikeres (jegy ≥ 2) teljesítés** ad XP-t.  
- Később opcionálisan engedhetünk „upgrade” XP-t jobb jegy esetén (pl. 3→5), de az első verzióban fixen csak az első sikeres lefutás számít.

---

## 9. Max szint kalibrálása (előzetes)

Jelenleg a szintlépés XP igénye (terv):

```text
XP_needed(level → level+1) = 200 + 80 * (level - 1)
```

Össz- XP 60‑as szintig ≈ 148 680 XP.  
Később, amikor minden `baseXP(topicId)` értéket véglegesítettünk, a teljes tananyag elvégzésekor szerzett maximális XP-t ehhez a görbéhez igazítjuk (vagy módosítjuk a görbét), hogy a diák a teljes „kimaxolásnál” épp a kívánt max. szintet érje el.  
Most a cél a logikus arányok kialakítása; a finomhangolást a végén végezzük el. ***!
