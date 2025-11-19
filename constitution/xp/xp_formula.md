# XP Progress Plan (titkos terv)

> Ez a fájl **csak fejlesztőknek** szól.  
> A benne lévő táblák és képletek alapján számoljuk ki:
> - egy-egy teszt (modulzáró / témazáró / témakör-teszt) XP-jét,
> - a teljes tananyagból kinyerhető összes XP-t,
> - és erre építve a szintlépési görbét.

---

## Globális koncepció

A rendszer három szinten ad XP-t:

1. **Főtéma (modulzáró)** – nagyobb blokk (pl. Algebra és függvények).  
2. **Altéma (témazáró)** – a főtéma egyik nagyobb fejezete.  
3. **Témakör** – konkrét, fókuszált tananyagegység.

Minden entitásnak van:

- `topicId` – technikai azonosító,
- `szint` – főtéma / altéma / témakör,
- `tierMult` – struktúraszint szorzó (modulzáró 1.5, témazáró 1.2, témakör 1.0),
- `topicWeight` – relatív nehézség (1.0–1.4),
- `baseXP` – alap XP (2-es jegy esetén, témaköröknél közepes nehézség mellett).

A tényleges XP-t ezek módosítják:

- **gradeMultiplier** – jegy szorzó,
- **difficultyMultiplier** (csak témakörnél),
- **tierMult** – vizsgaszint,
- **topicWeight** – valódi nehézség.

---

## Nehézség skála (topicWeight)

- **1.0** – alap / átlagos nehézség  
- **1.1** – kicsit nehezebb  
- **1.2** – közepesen nehéz  
- **1.3** – nehéz  
- **1.4** – nagyon nehéz  

---

## Jegy szorzók (gradeMultiplier)

| Jegy | Megnevezés  | gradeMultiplier |
|------|-------------|-----------------|
| 1    | elégtelen   | 0.0             |
| 2    | elégséges   | 1.0             |
| 3    | közepes     | 1.1             |
| 4    | jó          | 1.2             |
| 5    | jeles       | 1.3             |

---

## Teszt nehézség szorzók (difficultyMultiplier – csak témakör)

| difficulty | multiplier |
|-----------|------------|
| konnyu    | 0.7        |
| kozepes   | 1.0        |
| nehez     | 1.4        |

---

## Struktúraszint szorzók (tierMult)

- főtéma (modulzáró): `1.5`
- altéma (témazáró): `1.2`
- témakör teszt: `1.0`

---

# 1. Alapozó modulok

## 1.1 Főtéma

| topicId             | Név              | Szint   | tierMult | topicWeight | baseXP |
|---------------------|------------------|--------|----------|-------------|--------|
| alapozo_modulzaro   | Alapozó modulok  | főtéma | 1.5      | 1.0         | 300    |

## 1.2 Altémák

| topicId                      | Név                               | Szint   | tierMult | topicWeight | baseXP |
|------------------------------|-----------------------------------|--------|----------|-------------|--------|
| gondolkodas_temazaro         | Gondolkodási módszerek, Halmazok | altéma | 1.2      | 1.1         | 150    |
| szamelmelet_temazaro         | Számelmélet és Számrendszerek    | altéma | 1.2      | 1.1         | 150    |
| racionalis_szamok_temazaro   | Racionális számok                | altéma | 1.2      | 1.0         | 150    |
| hatvany_temazaro             | Hatvány, Gyök, Logaritmus        | altéma | 1.2      | 1.2         | 150    |

## 1.3 Témakörök

| topicId            | Név                           | Altéma                           | topicWeight | baseXP |
|--------------------|-------------------------------|----------------------------------|------------|--------|
| halmazmuveletek    | Halmazműveletek              | Gondolkodási módszerek, Halmazok| 1.1        | 55     |
| logikai_szita      | Logikai szita formula        | Gondolkodási módszerek, Halmazok| 1.1        | 55     |
| skatulya_elv       | Skatulya-elv                 | Gondolkodási módszerek, Halmazok| 1.2        | 60     |
| oszthatosag        | Oszthatósági szabályok       | Számelmélet és Számrendszerek   | 1.0        | 50     |
| lnko_lkkt          | LNKO, LKKT                   | Számelmélet és Számrendszerek   | 1.0        | 50     |
| primtenyezok       | Prímtényezők                 | Számelmélet és Számrendszerek   | 1.1        | 55     |
| szamrendszerek     | Számrendszerek               | Számelmélet és Számrendszerek   | 1.1        | 55     |
| tortek             | Törtek és műveletek          | Racionális számok               | 1.0        | 50     |
| tizedes_tortek     | Tizedes törtek               | Racionális számok               | 1.0        | 50     |
| szazalekszamitas   | Százalékszámítás             | Racionális számok               | 1.1        | 55     |
| hatvanyozas        | Hatványozás azonosságai      | Hatvány, Gyök, Logaritmus       | 1.2        | 60     |
| gyokvonas          | Négyzetgyök, n-edik gyök     | Hatvány, Gyök, Logaritmus       | 1.2        | 60     |
| logaritmus         | A logaritmus fogalma         | Hatvány, Gyök, Logaritmus       | 1.3        | 65     |

---

# 2. Algebra és Függvények

## 2.1 Főtéma

| topicId             | Név                    | Szint   | tierMult | topicWeight | baseXP |
|---------------------|-----------------------|--------|----------|-------------|--------|
| algebra_modulzaro   | Algebra és Függvények | főtéma | 1.5      | 1.2         | 300    |

## 2.2 Altémák

| topicId                          | Név                           | Szint   | tierMult | topicWeight | baseXP |
|----------------------------------|------------------------------|--------|----------|-------------|--------|
| algebrai_kif_temazaro           | Algebrai kifejezések         | altéma | 1.2      | 1.1         | 150    |
| egyenletek_temazaro             | Egyenletek, egyenlőtlenségek | altéma | 1.2      | 1.2         | 150    |
| fuggvenyek_alt_temazaro         | Függvények általános tulajd. | altéma | 1.2      | 1.2         | 150    |
| nevezetes_fuggvenyek_temazaro   | Nevezetes függvények         | altéma | 1.2      | 1.3         | 150    |

## 2.3 Témakörök

| topicId                  | Név                           | Altéma                        | topicWeight | baseXP |
|--------------------------|-------------------------------|-------------------------------|------------|--------|
| polinomok                | Műveletek polinomokkal        | Algebrai kifejezések         | 1.1        | 55     |
| nevezetes_azonossagok    | Nevezetes azonosságok         | Algebrai kifejezések         | 1.1        | 55     |
| algebrai_tortek          | Algebrai törtek               | Algebrai kifejezések         | 1.1        | 55     |
| linearis_egyenletek      | Lineáris egyenletek           | Egyenletek, egyenlőtlenségek | 1.1        | 55     |
| masodfoku_egyenlet       | Másodfokú egyenlet            | Egyenletek, egyenlőtlenségek | 1.3        | 65     |
| viete_formulak           | Viète-formulák                | Egyenletek, egyenlőtlenségek | 1.2        | 60     |
| parameteres_masodfoku    | Paraméteres másodfokú egyenlet| Egyenletek, egyenlőtlenségek | 1.3        | 65     |
| specialis_egyenletek     | Abszolútértékes, gyökös, stb. | Egyenletek, egyenlőtlenségek | 1.3        | 65     |
| fuggveny_alapok          | Értelmezési tart., értékkészl.| Függvények általános          | 1.1        | 55     |
| fuggveny_jellemzes       | Monotonitás, szélsőérték      | Függvények általános          | 1.2        | 60     |
| paritas                  | Paritás                       | Függvények általános          | 1.0        | 50     |
| fuggveny_transzformaciok | Függvénytranszformációk       | Függvények általános          | 1.2        | 60     |
| linearis_fuggveny        | Lineáris függvény             | Nevezetes függvények          | 1.1        | 55     |
| masodfoku_fuggveny       | Másodfokú függvény            | Nevezetes függvények          | 1.3        | 65     |
| hatvanyfuggvenyek        | Hatványfüggvények             | Nevezetes függvények          | 1.2        | 60     |
| exp_log_fuggveny         | Exponenciális & logaritmus    | Nevezetes függvények          | 1.3        | 65     |
| trigonometrikus_fuggvenyek | Trigonometrikus fv.         | Nevezetes függvények          | 1.4        | 70     |
| abszolut_ertek_fuggveny  | Abszolútérték-függvény        | Nevezetes függvények          | 1.2        | 60     |

---

# 3. Geometria

## 3.1 Főtéma

| topicId               | Név       | Szint   | tierMult | topicWeight | baseXP |
|-----------------------|-----------|--------|----------|-------------|--------|
| geometria_modulzaro   | Geometria | főtéma | 1.5      | 1.2         | 300    |

## 3.2 Altémák

| topicId                        | Név                         | Szint   | tierMult | topicWeight | baseXP |
|--------------------------------|-----------------------------|--------|----------|-------------|--------|
| haromszogek_temazaro          | Alapfogalmak és háromszögek | altéma | 1.2      | 1.2         | 150    |
| sokszogek_temazaro            | Négyzetek és sokszögek      | altéma | 1.2      | 1.2         | 150    |
| kor_temazaro                  | A kör                       | altéma | 1.2      | 1.3         | 150    |
| geo_transzform_temazaro       | Geometriai transzformációk  | altéma | 1.2      | 1.3         | 150    |
| koordinatageometria_temazaro  | Koordinátageometria         | altéma | 1.2      | 1.3         | 150    |
| tergeometria_temazaro         | Térgeometria                | altéma | 1.2      | 1.4         | 150    |

## 3.3 Témakörök

| topicId                    | Név                                 | Altéma                         | topicWeight | baseXP |
|----------------------------|--------------------------------------|--------------------------------|------------|--------|
| nevezetes_vonalak          | Nevezetes vonalak                   | Alapfogalmak és háromszögek   | 1.2        | 60     |
| haromszog_egyenlotlenseg   | Háromszög-egyenlőtlenség            | Alapfogalmak és háromszögek   | 1.2        | 60     |
| szogtetelek                | Pitagorasz, befogó, magasság        | Alapfogalmak és háromszögek   | 1.2        | 60     |
| szinusz_koszinusz_tetel    | Szinusz- és koszinusz-tétel         | Alapfogalmak és háromszögek   | 1.3        | 65     |
| terulet_kerulet            | Terület- és kerületszámítás         | Négyzetek és sokszögek        | 1.2        | 60     |
| specialis_negyszogek       | Húr- és érintőnégyszögek            | Négyzetek és sokszögek        | 1.2        | 60     |
| keruleti_szogek            | Kerületi és középponti szögek       | A kör                         | 1.3        | 65     |
| latokoriv                  | Látókörív                           | A kör                         | 1.3        | 65     |
| kor_helyzetek             | Kör és egyenes / kör és kör         | A kör                         | 1.3        | 65     |
| tukrozes                   | Tükörzések                          | Geometriai transzformációk    | 1.3        | 65     |
| eltolas_forgatas          | Eltolás, elforgatás                 | Geometriai transzformációk    | 1.3        | 65     |
| hasonlosag                | Középpontos hasonlóság              | Geometriai transzformációk    | 1.3        | 65     |
| vektorok                  | Vektorok                            | Koordinátageometria           | 1.3        | 65     |
| egyenes_egyenlete         | Egyenes egyenlete                   | Koordinátageometria           | 1.3        | 65     |
| kor_egyenlete             | Kör egyenlete                       | Koordinátageometria           | 1.3        | 65     |
| alakzatok_metszespontja   | Metszéspontok                       | Koordinátageometria           | 1.3        | 65     |
| hasabok_gulak             | Hasábok, gúlák                      | Térgeometria                  | 1.4        | 70     |
| forgastestek              | Forgástestek                         | Térgeometria                  | 1.4        | 70     |

---

# 4. Valószínűségszámítás és Statisztika

## 4.1 Főtéma

| topicId             | Név                          | Szint   | tierMult | topicWeight | baseXP |
|---------------------|------------------------------|--------|----------|-------------|--------|
| valstat_modulzaro   | Valószínűség és statisztika | főtéma | 1.5      | 1.3         | 300    |

## 4.2 Altémák

| topicId                  | Név                 | Szint   | tierMult | topicWeight | baseXP |
|--------------------------|---------------------|--------|----------|-------------|--------|
| kombinatorika_temazaro   | Kombinatorika       | altéma | 1.2      | 1.3         | 150    |
| valszam_temazaro         | Valószínűségszámítás| altéma | 1.2      | 1.3         | 150    |
| statisztika_temazaro     | Statisztika         | altéma | 1.2      | 1.2         | 150    |

## 4.3 Témakörök

| topicId                   | Név                     | Altéma             | topicWeight | baseXP |
|---------------------------|-------------------------|--------------------|------------|--------|
| permutaciok               | Permutációk             | Kombinatorika      | 1.3        | 65     |
| variaciok                 | Variációk               | Kombinatorika      | 1.3        | 65     |
| kombinaciok               | Kombinációk             | Kombinatorika      | 1.3        | 65     |
| binomialis_tetel          | Binomiális tétel        | Kombinatorika      | 1.3        | 65     |
| klasszikus_valoszinuseg   | Klasszikus modell       | Valószínűségszámítás | 1.3      | 65     |
| geometriai_valoszinuseg   | Geometriai valószínűség | Valószínűségszámítás | 1.3      | 65     |
| felteteles_valoszinuseg   | Feltételes valószínűség | Valószínűségszámítás | 1.3      | 65     |
| adatok_abrazolasa         | Adatok ábrázolása       | Statisztika        | 1.2        | 60     |
| kozepertekek              | Középértékek           | Statisztika        | 1.2        | 60     |
| szorodas                  | Szóródási mutatók       | Statisztika        | 1.2        | 60     |

---

# 5. Emelt szintű modulok

## 5.1 Főtéma

| topicId           | Név           | Szint   | tierMult | topicWeight | baseXP |
|-------------------|--------------|--------|----------|-------------|--------|
| emelt_modulzaro   | Emelt modulok| főtéma | 1.5      | 1.4         | 300    |

## 5.2 Altémák

| topicId                | Név                  | Szint   | tierMult | topicWeight | baseXP |
|------------------------|----------------------|--------|----------|-------------|--------|
| sorozatok_temazaro     | Sorozatok            | altéma | 1.2      | 1.4         | 150    |
| differencial_temazaro  | Differenciálszámítás | altéma | 1.2      | 1.4         | 150    |
| integral_temazaro      | Integrálszámítás     | altéma | 1.2      | 1.4         | 150    |

## 5.3 Témakörök

| topicId                 | Név                          | Altéma                | topicWeight | baseXP |
|-------------------------|------------------------------|-----------------------|------------|--------|
| szamtani_mertani        | Számtani & mértani sorozatok| Sorozatok             | 1.4        | 70     |
| kamatoskamat            | Kamatoskamat                | Sorozatok             | 1.4        | 70     |
| konvergencia            | Konvergencia                | Sorozatok             | 1.4        | 70     |
| hatarertek              | Határértékek                | Differenciálszámítás  | 1.4        | 70     |
| derivalt_fogalma        | Derivált fogalma            | Differenciálszámítás  | 1.4        | 70     |
| derivalasi_szabalyok    | Deriválási szabályok        | Differenciálszámítás  | 1.4        | 70     |
| fuggvenyvizsgalat       | Függvényvizsgálat deriválttal| Differenciálszámítás | 1.4        | 70     |
| hatarozatlan_integral   | Határozatlan integrál       | Integrálszámítás      | 1.4        | 70     |
| hatarozott_integral     | Határozott integrál         | Integrálszámítás      | 1.4        | 70     |
| newton_leibniz          | Newton–Leibniz formula      | Integrálszámítás      | 1.4        | 70     |
| terfogatszamitas        | Térfogatszámítás integrállal| Integrálszámítás      | 1.4        | 70     |

---

# 6. Összesített XP képlet (teszt szinten)

A játék motorja minden vizsgát egységes XP-szabály szerint számol, csak a paraméterek térnek el (baseXP, topicWeight, tierMult, difficultyMultiplier, gradeMultiplier).

## 6.1 Paraméterek

- **baseXP(topicId)**  
  - főtéma: 300  
  - altéma: 150  
  - témakörök: 50–70 (táblákban)

- **topicWeight(topicId)**  
  - 1.0–1.4 közti nehézségsúly

- **tierMult(levelType)**  
  - főtéma: 1.5  
  - altéma: 1.2  
  - témakör: 1.0

- **gradeMultiplier(grade)**  
  - 1 → 0.0  
  - 2 → 1.0  
  - 3 → 1.1  
  - 4 → 1.2  
  - 5 → 1.3

- **difficultyMultiplier(diff)** (csak témaköröknél)  
  - konnyu → 0.7  
  - kozepes → 1.0  
  - nehez → 1.4

---

## 6.2 Főtéma XP képlet
`XP_fotema(topicId, grade) = round( baseXP(topicId) * topicWeight(topicId) * 1.5 * gradeMultiplier(grade) )`

## 6.3 Altéma XP képlet
`XP_altema(topicId, grade) = round( baseXP(topicId) * topicWeight(topicId) * 1.2 * gradeMultiplier(grade) )`

## 6.4 Témakör XP képlet
`XP_temakor(topicId, grade, diff) = round( baseXP(topicId) * topicWeight(topicId) * 1.0 * difficultyMultiplier(diff) * gradeMultiplier(grade) )`

## 6.5 Egységesített „run” képlet
`XP_run(topicId, levelType, grade, diff) = round( baseXP(topicId) * topicWeight(topicId) * tierMult(levelType) * gradeMultiplier(grade) * ( levelType == "temakor" ? difficultyMultiplier(diff) : 1.0 ) )`

**Szabályok:**

- Minden `(topicId, difficulty)` kombináció **első sikeres lefutása** (jegy ≥ 2) ad XP-t.  
- Későbbi jegyjavítás („upgrade XP”) az 1. verzióban nem létezik.  
- A teljes tananyagból maximum kinyerhető XP (mindenre 5-ös és „nehez” témaköri teszt): **~19 400 XP**.

---

# 7. Szintlépés (exponenciális modell)

## 7.1 Célok

- Az első 10–15 szint gyorsan teljesüljenek.  
- A felsőbb szintek egyre nagyobb XP-t igényeljenek.  
- A teljes tananyag (≈19 400 XP) kb. **47–49. szintig** vigye a diákot.  
- A plafon 50-es szint legyen.  
- Full clear + néhány extra jutalom XP → éppen elérhesse a 50-et, de ne legyen garantált.

## 7.2 Választott paraméterek

- **MAX_LEVEL = 50**  
- **XP_base_per_level = 50**  
- **XP_growth = 1.07**

## 7.3 XP képlet szintlépéshez

Példák:

- 1 → 2: `50 * 1.07^0 = 50`
- 2 → 3: `50 * 1.07^1 = 54`
- 10 → 11: `50 * 1.07^9 ≈ 98`
- 50 → max: összeadva ≈ **20 325 XP**

## 7.4 Teljes összeg
TotalXP_to_50 ≈ 20 325 XP

Ez **ideális**: a tartalomból kinyerhető ~19 400 XP → kb. 96% teljesítés → 47–49. szint.

---

# 8. Várható XP tartományok főtémánként

| Főtéma                        | Modulzáró XP | Altéma XP | Témakör XP (kb.) | Megjegyzés |
|------------------------------|--------------|-----------|------------------|------------|
| Alapozó                      | 450–585      | 180–280   | 35–165           | Belépő szint |
| Algebra és függvények       | 540–702      | 200–300   | 35–180           | Absztraktabb |
| Geometria                    | 560–730      | 215–330   | 40–180           | Vizualitás, térgeometria |
| Valószínűség & statisztika | 585–760       | 215–300   | 40–165           | Kombinatorika miatt nehéz |
| Emelt modulok                | 630–820      | 250–330   | 50–180           | Emelt szintű tartalom |