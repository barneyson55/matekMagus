---

title: "App Shell szerkezeti leírás"
description: "A MatekMester alkalmazás fő elrendezésének (app shell) stílusfüggetlen struktúrája"
-------------------------------------------------------------------------------------------------

# App Shell – szerkezeti leírás (`structure/app-shell.md`)

Ez a dokumentum a MatekMester alkalmazás **fő elrendezését** ("app shell") írja le **stílusfüggetlenül**.
Nem tartalmaz konkrét színeket, betűtípusokat vagy grafikai részleteket, kizárólag a **blokkok elhelyezkedését, szerepét és egymáshoz való viszonyát** rögzíti.

A shell célja, hogy bármely vizuális skin (pergamen, galaxis, futurisztikus, színes, dark, stb.) ráhúzható legyen ugyanarra a szerkezetre.

---

## 1. Fő elrendezés – felső fejléc + Quest Log + tartalom

Az app három fő, állandóan létező szerkezeti résszel dolgozik:

1. **Felső fejléc (Header)** – tartalmazza a program nevét, a játékos szintjét és XP-progresszióját, a buff ikonokat és a hamburger menüt.
2. **Bal oldali sáv (Quest Log Panel)** – modulok és témakörök listája, quest-szerű állapotokkal (elfogadva / nem elfogadva / kimaxolt).
3. **Fő tartalomterület (Main Content)** – az éppen aktív modul (pl. Halmazműveletek) nézete: cím, fülek, elmélet, vizuális modell, teszt, gyakorlás.

A layout elvi felépítése szövegesen:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ FELSŐ FEJLÉC (Header)                                             │
│ - bal: hamburger + buff ikonok                                    │
│ - közép: MatekMester név                                          │
│ - jobb: player panel (szintnév + avatar + XP sáv)                 │
└─────────────────────────────────────────────────────────────────────┘
┌───────────────┬────────────────────────────────────────────────────┐
│ QUEST LOG     │  FŐ TARTALOM (aktuális modul nézet)               │
│ (bal panel)   │  - modul cím                                      │
│               │  - modulfülek (Elmélet, Modell, Teszt, Gyakorlás) │
└───────────────┴────────────────────────────────────────────────────┘
```

A Settings felület egy **overlay-ként** nyíló külön réteg (nem része a fenti rácsnak), amely a jobb alsó sarokban elhelyezett gombból érhető el.

---

## 2. Felső fejléc (Header) szerkezete

A felső fejléc az alkalmazás tetején **teljes szélességben** helyezkedik el, de a benne futó XP-sáv csak a belső szélesség **95%-át** használja.
A header **két sor magas**, és három fő vizuális zónára bontható:

1. **Bal oldal** – hamburger menü (két sor magas), mellette buff ikonok.
2. **Közép** – MatekMester név (felső sor, középre zárva).
3. **Jobb oldal** – player panel: avatar + szintnév + XP-sáv jobb oldala.

### Sematikus elrendezés

```text
┌─────────────────────────────────────────────────────────┐
│[☰]  [ Buff1 Buff2 ]     MatekMester      [Avatar][Lv.X]│
│[☰]  |====|====|====|====|====|====|====|====|====|====|│  
└─────────────────────────────────────────────────────────┘
```

**Fontos:** a két sor elején látható `[☰]` ugyanazt a hamburger menüt jelöli – vizuálisan két sor magas grafikai elem.

### Hamburger menü

* A header bal szélén.
* Két sor magas blokk: teteje igazodik a buff ikonok tetejéhez, alja az XP sáv aljához.
* Funkció: bal oldali Quest Log megjelenítése/elrejtése.

### Programnév (MatekMester)

* A felső sor közepén jelenik meg.
* Branding elem, bővíthető logóval.

### Player panel

Tartalmazza:

* az aktuális szint megnevezését (pl. `Lv. 4 – Adeptus`),
* az avatar ikont,
* az XP sávot,
* buff ikonokat.

#### Avatar + szintnév

* A header jobb felső részén, a felső sorban.
* Az avatar közvetlenül a szintnév mellett.

#### XP sáv ("XP tape")

* A fejléc **alsó sorában** fut.
* Kb. a header szélességének **95%-ában** jelenik meg.
* 5%-os szakaszokra tagolt (mérőszalag érzet).
* A számérték (`0 / 200 XP`) **csak mouseover/hint** esetén jelenik meg.

#### Buff ikonok

* Az XP sáv bal oldali kezdőpontja fölött, vizuálisan "ráülve" a sávra.
* A hamburger után, de még az XP sáv előtt, a felső sorban.

---

## 3. Bal oldali sáv – Quest Log Panel

A bal oldali panel a modulok és témakörök listáját jeleníti meg **quest-státuszokkal**.

Három állapot:

### 1. Még nem elfogadott küldetés

* A modul neve szürkített.
* A modul nézetében megjelenik: `Küldetés elfogadása` gomb.

### 2. Aktív küldetés

* A modul neve élénk színnel jelenik meg.
* A tanuló már dolgozik a modulon.

### 3. Kimaxolt küldetés

* Élénk szín + **zöld pipa**.
* **Definíció:**

  * minden **témakörben** minden **nehézségi szinten** (könnyű/normál/nehéz) a legjobb jegy megszerzése,
  * **ÉS** minden altéma **minden nehézségi szintjén** **ötös** jegy elérése, továbbá minden főtémakör **egyetlen** tesztjén **ötös** jegy elérése.

A kimaxolt modul továbbra is interaktív, tesztek és gyakorlások végezhetők.

---

## 4. Fő tartalomterület (Main Content)

A Quest Log mellett, jobb oldalon jelenik meg.

Tipikus modulnézet elemei:

* modul cím,
* ha még nem aktív: `Küldetés elfogadása` gomb,
* fülstruktúra:

  * **Elmélet**
  * **Vizuális modell**
  * **Teszt**
  * **Gyakorlás**

A váltás csak a tartalomterületet érinti.

---

## 5. Settings – overlay

* Jobb alsó sarokban halvány gomb.
* Mouseover esetén kiemelődik.
* Kattintásra overlay nyílik meg:

  * skin/theme választóval,
  * egyéb beállításokkal.

Bezáráskor visszatér ugyanabba a modulba/fülbe.

---

## 6. Kapcsolódó szerkezeti dokumentumok

* `structure/navigation-flow.md`
* `structure/module-lifecycle.md`
* `structure/character-sheet.md`
* `structure/settings-overlay.md`

Ezek együtt adják a MatekMester alkalmazás **stílusfüggetlen szerkezeti tervét**.
