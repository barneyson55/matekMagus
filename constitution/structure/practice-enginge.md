---

title: "Gyakorló motor (Practice Engine) szerkezeti leírás"
description: "A MatekMester gyakorló feladatmotorjának stílusfüggetlen, szerkezeti terve"
-----------------------------------------------------------------------------------------

# Gyakorló motor – szerkezeti leírás (`structure/practice-engine.md`)

Ez a dokumentum a MatekMester **Gyakorlás** fülét kiszolgáló
**gyakorló motor (Practice Engine)** szerkezetét és működését írja le
**stílusfüggetlen, logikai szinten**.

Célja, hogy definiálja:

* milyen **fogalmakból** áll a gyakorló motor (kérdés-sablon, példány, session),
* hogyan működik a **randomizáció** és a **nem ismétlődő kérdések** elve,
* hogyan kezeli a motor a **nehézségi szint választást**,
* hogyan zajlik a **válasz-ellenőrzés**, az **azonnali visszajelzés** és a **következő kérdésre lépés**,
* hogyan kapcsolódik mindez az **XP-rendszerhez**, a **modulnézethez** és a
  **haladáskövetéshez**.

Nem foglalkozik konkrét technológiával (JS függvények, konkrét adattípusok),
csak a logikai komponensekkel és azok felelősségével.

---

## 1. Fő fogalmak és komponensek

A gyakorló motor három fő fogalomra épül:

1. **Kérdés-sablon (Question Template)**
2. **Kérdés-példány (Question Instance)**
3. **Gyakorló session (Practice Session)**

### 1.1. Kérdés-sablon (Question Template)

A kérdés-sablon a gyakorló motor **absztrakt feladat-leírása**.

Minden sablon tartalmazza, hogy **milyen típusú feladatot** tud generálni,
éppen aktuális paraméterektől függően.

Logikai mezők (példa):

* `templateId` – sablon egyedi azonosítója.
* `topicId` – melyik témakörhöz tartozik.
* `difficulty` – melyik nehézségi szinthez soroljuk (`easy` / `normal` / `hard`).
* `parameterSpec` – milyen paraméterekből generálható változat:

  * pl. szám-tartományok, halmazméretek, halmazelemek tartománya.
* `renderModel` – hogyan kell a kérdést megjeleníteni:

  * szöveges rész,
  * képletsáv,
  * opcionális vizuális modell (pl. Venn-diagram konfiguráció).
* `solutionModel` – a megoldás logikai leírása:

  * milyen formátumú választ várunk (szám, halmazelemek listája, kifejezés, stb.),
  * hogyan ellenőrizzük a helyességet.

A kérdés-sablon **nem konkrét feladat**, hanem egy "feladat-generátor" logikai leírása.

### 1.2. Kérdés-példány (Question Instance)

A kérdés-példány a sablon **egy konkrét, felhasználónak feltett verziója**.

Logikai mezők (példa):

* `instanceId` – egyedi azonosító (session-ön belül is elég).
* `templateId` – melyik sablonból származik.
* `topicId`, `difficulty` – öröklődnek a sablonból.
* `parameters` – a konkrét generált paraméterek (pl. `A` halmaz elemei, számértékek).
* `renderPayload` – a konkrét megjelenítéshez szükséges adatok (szöveg, képlet, vizuális modell input).
* `expectedSolution` – a motor által elvárt megoldás (normál formára hozott).

A kérdés-példány **immutable** abban az értelemben, hogy a generálás után
logikailag nem változik – a motor ezt hasonlítja össze a felhasználó válaszával.

### 1.3. Gyakorló session (Practice Session)

A gyakorló session a felhasználó **egy folyamatos gyakorlási szakaszát** jelenti.

Logikai mezők (példa):

* `sessionId` – egyedi azonosító.
* `userId` – melyik tanulóhoz tartozik.
* `moduleId` / `topicId` – melyik modul / témakör gyakorlása zajlik.
* `enabledDifficulties` – a felhasználó által bepipált nehézségi szintek halmaza.
* `history` – az eddig generált kérdés-példányok listája
  (vagy legalább az utolsó *N* kérdés metaadatai a nem-ismétlődéshez).
* `currentQuestion` – az éppen megjelenített kérdés-példány.
* `stats` – opcionális session-szintű statisztikák (helyes/hibás válaszok, streak, stb.).

Egy session logikailag:

* indul (amikor a tanuló a Gyakorlás fülön elkezd gyakorlófeladatot kérni),
* addig tart, amíg a tanuló ki nem lép a Gyakorlás fülről / modulnézetből,
* vagy amíg explicit le nem zárja a gyakorlást.

---

## 2. Randomizáció és nem ismétlődő kérdések

A gyakorló motor egyik fő elve:

> "A tanuló **folyamatosan új variációkat** kapjon,
> ne ismétlődő, betanulható konkrét példákat."

### 2.1. Random paramétergenerálás

Minden kérdés-sablon tartalmaz egy **paramétergeneráló logikát** (`parameterSpec`),
ami meghatározza:

* milyen értéktartományokból sorsol a motor (pl. halmaz elemszám 2–6 között),
* milyen típusú adatokat generál (egész számok, betűs jelölések, stb.),
* milyen kötöttségek vannak (pl. `A` és `B` halmaz metszete ne legyen üres).

A gyakorló motor a **kérdés-példány generálásakor**:

1. kiválaszt egy sablont,
2. véletlenszerűen generál hozzá paramétereket,
3. e paraméterekből felépíti a `renderPayload`-ot és `expectedSolution`-t.

### 2.2. Nem ismétlődő kérdések – praktikus elv

Teljes elméleti "soha ne ismétlődjön" garancia helyett
**gyakorlati nem-ismétlődést** céloz a rendszer.

Szerkezeti elv:

* a session `history` mezője tartalmazza az utolsó *N* kérdés metaadatait,
* új kérdés generálásakor a motor:

  * lehetőség szerint **más sablont** választ az előzőhöz képest,
  * ha ugyanazt a sablont választja, más paramétereket generál,
  * ellenőrzi, hogy a **(templateId + parameters)** kombináció
    ne egyezzen az utolsó *N* kérdés egyikével.

Ha a sablon domain-je kicsi (kevés lehetséges variáció):

* a motor bizonyos számú próbálkozás után
  **elfogadhatja a megismétlődő struktúrát**, de eltérő paraméterekkel,
* a cél nem az abszolút tilalom, hanem a **magas változatosság**.

### 2.3. Nehézségi eloszlás és keverés

Ha a felhasználó több nehézségi szintet is bepipált
(pl. `könnyű` + `közepes`), a motor:

* egy **nehézség-választó logika** alapján dönti el,
  hogy a következő kérdés melyik szintről érkezzen,
* egyszerű esetben ez lehet egyenletes eloszlás,
* később lehet **súlyozott** (pl. 70% könnyű, 30% közepes),
* vagy akár adaptív (ha a tanuló túl könnyen megoldja, több közepes / nehéz jön).

A nehézség-döntés szerkezeti fogalom, a konkrét algoritmus
(egyenletes vs. adaptív) későbbi game design kérdés.

---

## 3. Válaszadás, ellenőrzés, visszajelzés

### 3.1. Válasz bevitele

A gyakorló motor a Gyakorlás fülön **inputmezőt** biztosít a válaszhoz.

Szerkezeti elv:

* a felhasználó a beviteli mezőbe írja a megoldást,
* a választ:

  * egy dedikált `Válasz elküldése` gombbal,
  * vagy **Enter billentyűvel** küldi be,
* a motor a **kérdés-példány `expectedSolution` mezője** alapján ellenőriz.

### 3.2. Válasz ellenőrzése

Az ellenőrzés lépései:

1. A motor beolvassa a felhasználó válaszát.
2. A választ **normalizálja** (pl. felesleges szóközök eltávolítása, sorrendfüggetlen halmazok rendezése).
3. A normalizált választ összeveti az `expectedSolution`-nel.
4. Eredmény:

   * `isCorrect = true` vagy `false`.

A konkrét ellenőrzési logika sablon-specifikus lehet (pl. halmazműveleteknél
sorrendfüggetlen összehasonlítás szükséges).

### 3.3. Visszajelzés és XP-event

* Ha a válasz **helyes**:

  * a motor rövid **pozitív visszajelzést** generál (szöveges / ikonikus),
  * XP-eventet küld az XP-rendszer felé (lásd: `structure/xp-system.md`):

    * könnyű kérdés → 1 XP,
    * közepes kérdés → 2 XP,
    * nehéz kérdés → 3 XP,
  * az XP hozzáadódik a globális `totalXp`-hez,
  * frissül a felső fejléc XP-sávja.

* Ha a válasz **hibás**:

  * a motor rövid **negatív visszajelzést** ad,
  * alapesetben **nem ad XP-t**,
  * a motor engedheti az **újrapróbálkozást** ugyanarra a kérdésre,
    vagy bizonyos számú próbálkozás után megmutathatja a helyes megoldás logikáját.

A pontos szabály (hány próbálkozás után mutatjuk a megoldást)
konfigurálható, de szerkezeti szinten létezik egy ilyen "küszöb".

### 3.4. Automatikus továbblépés

Helyes válasz után a gyakorló motor:

1. **visszajelzést jelenít meg** (rövid időre),
2. **kb. 2 másodperces késleltetés** után automatikusan generálja és megjeleníti a következő kérdést.

Ez a késleltetés szerkezeti paraméter, de a 2 másodperc jó kiindulási érték.

---

## 4. Session állapotgép (egyszerű modell)

A gyakorló session működése felírható egy egyszerű állapotgéppel:

1. `IDLE` – nincs aktív kérdés; a felhasználó még nem indította el a gyakorlást.
2. `QUESTION_SHOWN` – egy kérdés-példány aktívan megjelenik.
3. `ANSWER_EVALUATED` – a felhasználó választ adott, a motor kiértékelte.
4. `TRANSITION_DELAY` – helyes válasz esetén rövid várakozás a következő kérdés előtt.

Állapotváltások:

* `IDLE` → `QUESTION_SHOWN`

  * Esemény: a felhasználó elkezdi a gyakorlást (pl. „Start” vagy első kérés).
* `QUESTION_SHOWN` → `ANSWER_EVALUATED`

  * Esemény: a felhasználó elküldi a választ (gomb / Enter).
* `ANSWER_EVALUATED` → `TRANSITION_DELAY`

  * Ha helyes a válasz, és XP-t is jóváírtunk.
* `TRANSITION_DELAY` → `QUESTION_SHOWN`

  * A késleltetés lejárta után új kérdés generálása és megjelenítése.

Hibás válasz esetén:

* maradás `QUESTION_SHOWN`-hoz hasonló állapotban ugyanazzal a kérdéssel (újrapróbálkozás),

A dokumentum csak rögzíti, hogy a motor **állapotgéppel** gondolkodik,
a konkrét ágakat később lehet finomhangolni.

---

## 5. Kapcsolódás más szerkezeti elemekhez

A gyakorló motor az alábbi `structure/` dokumentumokhoz kapcsolódik:

* `structure/module-view.md` – definiálja, hogy a Gyakorlás fülön belül
  hol jelennek meg a kérdések, a válaszmező és a visszajelzés.
* `structure/xp-system.md` – meghatározza, hogy a helyes válaszokért
  nehézségi szinttől függő XP jár (1 / 2 / 3 XP), és hogyan lép szintet a tanuló.
* `structure/progress-tracking.md` – opcionálisan tárolhat gyakorlás statisztikákat
  (pl. helyes válaszok száma nehézség szerint), de a gyakorló motor alaplogikája
  XP-centrikus.
* `structure/module-lifecycle.md` – rögzíti, hogy a modul kimaxolását **nem** a gyakorlás,
  hanem a Teszt fülön elért jegyek döntik el; a gyakorlás XP-t és készséget ad.
* `structure/app-shell.md` – a felül látható XP-sáv a gyakorló motor által termelt XP-t is mutatja.

Ezek együtt adják a MatekMester gyakorló motorának **stílusfüggetlen szerkezeti tervét**, amelyre
később ráépülhet a konkrét implementáció (JavaScript generátorok, sablonok, ellenőrző függvények).
