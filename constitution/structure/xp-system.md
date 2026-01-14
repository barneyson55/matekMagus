---

title: "XP- és szintrendszer szerkezeti leírás"
description: "A MatekMester XP- és szintrendszerének stílusfüggetlen, szerkezeti terve"
---------------------------------------------------------------------------------------

# XP- és szintrendszer – szerkezeti leírás (`structure/xp-system.md`)

Ez a dokumentum a MatekMester **XP- (tapasztalati pont) és szintrendszerének**
szerkezetét írja le **stílusfüggetlen, szerkezeti szinten**.

Nem célja a konkrét számok, képletek részletes rögzítése (ez külön XP-formula leírásban történik),
hanem az, hogy:

* milyen **XP-források** vannak a rendszerben,
* hogyan kapcsolódik az XP a **tesztekhez** és a **gyakorláshoz**,
* hogyan épül fel a **szintlépési logika**, és
* hogyan kapcsolódik mindez a modulok, questek és a karakterlap szerkezetéhez.

---

## 1. Alapfogalmak

### 1.1. XP (tapasztalati pont)

Az XP egy globális mennyiség, amely:

* **felhasználóhoz kötötten** tárolódik,
* minden modulban végzett releváns tevékenység (teszt, gyakorlás, achievement) növelheti,
* a tanuló **aktuális szintjének** és **előrehaladásának** alapja.

### 1.2. Szint (Level)

A szint egy diszkrét érték (`Lv. 1`, `Lv. 2`, ...), amelyet:

* a tanuló **összegyűjtött XP mennyisége** határoz meg,
* minden szinthez tartozik egy **XP-tartomány** (pl. `0–199 XP` → Lv.1),
* a szinthez tartozik egy **szintnév** (pl. `Tanonc`, `Adeptus`, `Mester`),
* a felső fejlécben és a karakterlapon is megjelenik.

A szintek **küszöbértékeit** és **elnevezéseit** külön konfiguráció (XP-formula dokumentum / JSON / config) tartalmazza.

### 1.3. XP és jegyek szétválasztása

Fontos koncepció:

* a **jegy** (osztályzat) a tanuló **tudásszintjét** jelzi az adott teszten / témakörben / modulban,
* az **XP** a tanuló **befektetett munkáját** és aktivitását jutalmazza.

A két fogalom kapcsolódik egymáshoz (jó jegyek gyakran több XP-vel járnak), de **nem azonosak**.

---

## 2. XP-források áttekintése

A MatekMesterben az XP az alábbi fő forrásokból származhat:

1. **Gyakorlás fül – egyedi feladatok helyes megoldása**
2. **Teszt fül – tesztek sikeres teljesítése** (témakör / altéma / főtéma)
3. **Achievementek** – speciális mérföldkövek elérése

A pontos pontozási képleteket külön XP-formula dokumentum tartalmazza;
itt csak a **szerkezeti szerepüket** rögzítjük.

---

## 3. XP a Gyakorlás fülön

A Gyakorlás fülön a tanuló **folyamatos, randomizált feladatfolyamon** dolgozik,
nehézségi szintek szerint.

### 3.1. Nehézségi szinthez kötött XP

Minden helyes megoldás után XP jár, a kérdés **nehézségi szintjétől függően**:

* `könnyű` kérdés → **1 XP**
* `normál` kérdés → **2 XP**
* `nehéz` kérdés → **3 XP**

Ez az érték skálázható a későbbiekben, de szerkezeti szinten:

* a **nehézségi szint** mindig **explicit módon ismert a rendszer számára**, és
* a gyakorlás XP mindig az adott nehézséghez tartozó **fix XP-értékkel** nő.

### 3.2. XP-hozzáadás folyamata (Gyakorlás)

1. A tanuló kiválasztja, mely nehézségi szintekről szeretne gyakorló feladatokat.
2. A rendszer random módon generál kérdést az adott témakörből.
3. A tanuló választ ad és elküldi (gomb vagy Enter billentyű).
4. A rendszer kiértékeli:

   * ha **helyes** a válasz:

     * jóváírja a kérdés nehézségéhez tartozó XP-t,
     * frissíti a felhasználó globális XP-jét,
     * a felső fejléc XP-sávja az új állapotot mutatja,
     * a karakterlapon az összesített XP is frissült értéket mutat.
   * ha **hibás** a válasz:

     * nincs XP jóváírás (alapesetben),
     * a rendszer visszajelzést ad, és újrapróbálkozásra ösztönöz.
5. Helyes válasz után a rendszer **kb. 2 másodperc múlva** automatikusan a következő kérdésre lép.

### 3.3. Hatás a modul állapotára

* A Gyakorlás fülön szerzett XP **nem határozza meg** közvetlenül,
  hogy a modul kimaxolt-e (`COMPLETED`).
* A modul kimaxolását továbbra is a **Teszt fülön elért jegyek** határozzák meg
  (lásd: `structure/module-lifecycle.md`).
* A Gyakorlás XP inkább:

  * a tanuló **motivációját** és **haladásérzetét** erősíti,
  * hozzájárul a **globális szintlépéshez**.

---

## 4. XP a Teszt fülön

A Teszt fülön a tanuló **értékeléssel járó** feladatsorokat teljesít:

* témakör szinten (nehézségi szintekkel),
* altéma szinten (nehézségi szintekkel),
* főtéma szinten (összefoglaló teszt, nehézségi bontás nélkül).

### 4.1. Témaköri tesztek XP-je (nehézségi szinttel)

Témakör szinten a tesztekhez kétféle eredmény tartozik:

1. **Jegy** (pl. 1–5-ig)
2. **XP-jutalom** (összefüggésben a jeggyel és a nehézséggel)

Szerkezeti elv:

* minden témakör + nehézségi szint kombinációhoz tartozik egy **alap XP-érték**,
* a ténylegesen jóváírt XP a **jegytől függő szorzóval** módosul,
* a pontos képlet (pl. `XP = baseTopicXP * difficultyMult * gradeMult`) az XP-formula dokumentumban van definiálva.

A rendszer sikeres teszt után:

* frissíti a `best_grade_difficulty_level` értéket,
* **csak javulás esetén** ad XP-t: az új jegyhez tartozó XP és a korábbi legjobb jegyhez tartozó XP **különbözete** kerül jóváírásra,
* ha nincs javulás, nem jár új XP.

### 4.2. Altéma tesztek XP-je (nehézségi szinttel)

Altéma szinten a tesztekhez nehézségi szint tartozik (`könnyű` / `normál` / `nehéz`).

Szerkezeti elv:

* minden altéma + nehézségi szint kombinációhoz tartozik egy **alap XP-érték**,
* a ténylegesen jóváírt XP a **jegytől** és **nehézségi szinttől** függhet,
* a pontos képlet az XP-formula dokumentumban van definiálva.

Itt is:

* frissül a nehézségi szinthez tartozó **legjobb jegy**,
* **csak javulás esetén** kerül jóváírásra az új és a korábbi legjobb jegyhez tartozó XP-különbözet.

### 4.3. Főtéma tesztek XP-je (nehézségi bontás nélkül)

Főtéma szinten **nincs nehézségi bontás**, egyetlen összefoglaló teszt tartozik az egységhez.

Szerkezeti elv:

* jegy keletkezik (1–5),
* XP-jutalom keletkezhet,
* az XP-jutalom függhet:

  * a teszt típusától (főtéma),
  * a jegytől,

Itt is az XP-formulák rögzítik a tényleges számítást, és **csak javulás esetén**
kerül jóváírásra a korábbi legjobb jegyhez képesti XP-különbözet.

---

## 5. Achievementek, bónusz XP-k

Az achievementek **különleges, egyszeri vagy ritka eseményekhez** kötött jutalmak.

Példák achievement-szintű XP-jutalmakra:

* Első modul elfogadása (`NOT_ACCEPTED` → `ACTIVE`).
* Első modul kimaxolása (`COMPLETED` állapot).
* Minden nehézségi szint kimaxolása egy témakörben.
* Bizonyos számú gyakorlófeladat egymás utáni helyes megoldása.

Szerkezeti elv:

* az achievementek egyéni **XP-bónusszal** járhatnak,
* az achievement lista a **karakterlapon** jelenik meg,
* egy adott achievement **egyszer szerezhető meg** (idempotens jutalom),
* az achievement-hez tartozó XP egy **külön XP-event**, amely a globális XP-t növeli.

---

## 6. Szintek, XP-küszöbök és szintlépés

A szintrendszer az összegyűjtött XP alapján működik.

### 6.1. Szinttáblázat

A rendszer egy konfigurált **szinttáblázatot** használ, amely:

* megadja minden szinthez (`Lv. 1`, `Lv. 2`, ...) az **XP-alsó és felső határt**,
* minden szinthez rendel egy **szintnevet** (pl. `Tanonc`, `Adeptus`, `Mester`),

A szinttáblázat **nem hard-coded** a logikába, hanem
konfigurációból (pl. JSON / külön XP-konfiguráció) tölthető be.

### 6.2. Szint meghatározása

Minden XP-változás után a rendszer:

1. kiszámítja az aktuális **összesített XP-t**,
2. a szinttáblázat alapján megállapítja:

   * milyen szint tartományába esik az XP,
   * mi az aktuális `Level` érték,
   * mi az aktuális szintnév.

Ez az információ:

* megjelenik a **felső fejlécben** (XP-sáv, szintnév),
* részletesen megjelenik a **karakterlapon** (összesített XP, szintnév, következő szintig hátralévő XP, stb.).

### 6.3. Szintlépés esemény

Amikor az XP eléri vagy átlépi egy új szint alsó határát:

* a rendszer **szintlépés eseményt** generál,
* opcionálisan:

  * speciális vizuális visszajelzést ad (animáció, hang),
  * achievementet old fel (pl. "Elérted az Lv. 5-öt"),

A szintlépésnek **nincs visszamenőleges hatása** a már megszerzett jegyekre vagy modulállapotokra,
csak a karakter globális státuszát módosítja.

---

## 7. Kapcsolódás más szerkezeti elemekhez

Az XP- és szintrendszer az alábbi dokumentumokkal együtt ad teljes képet:

* `structure/module-lifecycle.md` – megmutatja, hogy a modul kimaxolását a **jegyek** határozzák meg,
  míg az XP a modulon túlnyúló, globális előrehaladást jelzi.
* `structure/module-view.md` – definiálja a Teszt és Gyakorlás fülek szerkezeti helyét,
  ahol az XP ténylegesen termelődik.
* `structure/character-sheet.md` – a karakterlap mutatja az összegzett XP-t, szintet,
  statisztikákat és achievementeket.
* `structure/app-shell.md` – a felső fejléc XP-sávja vizuálisan jeleníti meg
  az aktuális XP-t és szintelőrehaladást.

Ezek együtt adják a MatekMester XP- és szintrendszerének **stílusfüggetlen szerkezeti tervét**, amelyre
később ráépülnek a konkrét XP-formulák, numerikus paraméterek és vizuális visszajelzések.
