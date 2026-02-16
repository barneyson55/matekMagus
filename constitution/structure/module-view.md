---

title: "Modulnézet szerkezeti leírás"
description: "A MatekMester modulnézet (pl. Halmazműveletek) stílusfüggetlen szerkezeti és működési terve"
----------------------------------------------------------------------------------------------------------

# Modulnézet – szerkezeti leírás (`structure/module-view.md`)

Ez a dokumentum a MatekMester **modulnézetének** szerkezetét és működését írja le
**stílusfüggetlen, szerkezeti szinten**.

A modulnézet egy konkrét modul (pl. **Halmazműveletek**) teljes tartalmi felületét jelenti:

* a modul fejléce (cím, küldetés elfogadása, modul-specifikus összegző elemek),
* a modul **fülrendszere** (Elmélet (akár több fül is lehet) / Vizuális modell / Teszt / Gyakorlás),
* az egyes fülek belső blokkjai és logikai működése.

A dokumentum szándékosan nem tartalmaz konkrét vizuális stílusokat (színek, betűk),
csak a **blokkokat, azok tartalmát és egymáshoz való viszonyát**.

---

## 1. Modulnézet elhelyezkedése az App Shell-ben

A modulnézet az App Shell **fő tartalomterületén** helyezkedik el.

* A felső fejléc (header – MatekMester, XP-sáv, avatar, buffok, hamburger) **változatlanul látszik**.
* A bal oldali Quest Log panel (modul-lista és quest állapotok) **változatlanul látszik**, hacsak a felhasználó el nem rejti a hamburgerrel.
* A modulnézet **csak a Quest Log melletti jobb oldali tartományt** foglalja el.

Flow:

* a felhasználó a Quest Logban egy modulnévre (pl. "Halmazműveletek") kattint,
* a fő tartalomterület modulnézetre vált, az adott modul struktúrájával.

---

## 2. Modulnézet felső sávja – cím és küldetés státusz

A modulnézet tetején egy **modul-specifikus fejlécrész** található.

Fő elemek:

1. **Modul cím**

   * pl. `Halmazműveletek`, `Logikai alapok`, stb.

2. **Küldetés státusz / akció**

   * ha a modul állapota `NOT_ACCEPTED` (lásd: `structure/module-lifecycle.md`):

     * jól látható `Küldetés elfogadása` gomb jelenik meg a cím közelében,
     * a gombra kattintva a modul `ACTIVE` állapotba lép.
   * ha a modul állapota `ACTIVE` vagy `COMPLETED`:

     * a `Küldetés elfogadása` gomb már nem jelenik meg,
     * opcionálisan rövid összefoglaló szöveg vagy jelvény mutathatja az állapotot (pl. "Aktív küldetés" / "Kimaxolt modul").

3. **Modulon belüli progressz (opcionális)**

   * szerkezeti szinten rögzíthető egy rövid modul-szintű progressz jelzés helye, pl.:

     * "Témakörök maxolva: 2 / 5",
     * "Altémák 5-ös jeggyel: 3 / 4",
     * stb.
   * a pontos tartalmat a későbbi XP/eredmény logika és UI-döntések határozzák meg.

---

## 3. Modulfülek – fő tartalmi aspektusok

A modulnézet lényege a **fülrendszer**, amely a modul különböző tartalmi aspektusainak megjelenítésére szolgál.

Alapfülek:

1. **Elmélet** – kulcsfogalmak, definíciók, magyarázatok. Egy modulhoz több elmélet fül is lehet.
2. **Vizuális modell** – ábrák, diagramok, vizuális segédeszközök.
3. **Teszt** – a jegyszerzéssel járó feladatsorok.
4. **Gyakorlás** – randomizált gyakorlófeladatok XP-szerzésre.

### 3.1. Elmélet fül – több részre bontott elmélet

Az Elmélet fül(ek) célja, hogy a modulhoz kapcsolódó tudást
strukturáltan, részletekben tálalja.

Szerkezeti elv:

* Nehezebb modulok esetén az elmélet **több részre bontható**, pl.:

  * `Elmélet 1`,
  * `Elmélet 2`,
  * `Elmélet 3`,
  * stb.
* Ezek a részek lehetnek

  * külön alfülek az Elmélet fő fülön belül, vagy
  * egyetlen Elmélet fülön belül blokk-szinten tagolt szekciók.

Tartalom típusok:

* definíciók, példák,
* magyarázó szöveg,
* bevezető mini-feladatok (ertekelés nélkül),
* hivatkozások a Vizuális modell fülön megjelenő ábrákra.

### 3.2. Vizuális modell fül

A Vizuális modell fülön a modul fogalmait **Vizuális eszközökkel** szemléltetjük.

Szerkezeti elemek:

* ábrák, diagramok (pl. halmazműveleteknél Venn-diagramok),
* animációs vagy interaktív szemléltetők helye,
* rövid magyarázó szövegek az ábrák mellett.

A Vizuális modell fül **szoros kapcsolatban áll** az Elmélet fül tartalmával,
példákat és ellenpéldákat tesz "láthatóvá".

### 3.3. Teszt fül – jegyszerzés és kimaxolás alapja

A Teszt fül az a hely, ahol a tanuló **jegyet szerez**, és ahol eldől,
hogy teljesülnek-e a modul "kimaxolásának" feltételei.

Szerkezeti elemek:

Megjegyzés: témakör szinten **nincs** témakör-választó; a teszt mindig az aktuális témakörre
vonatkozik. Altéma/főtéma esetén a teszt a hozzájuk tartozó témakörökből áll össze, külön
választó nélkül.

1. **Teszt indító blokk (altéma/főtéma)**

   * akkor látszik, amikor a modul `ACTIVE` és a teszt még nem indult el,
   * megjeleníti az altéma/főtéma címét és egy **rövid ismertetőt** a témakörökről,
   * főtéma esetén vizuális jelzés (pl. „Összefoglaló teszt” jelvény) emeli ki a komolyabb teszt jellegét,
   * altéma esetén a nehézségi szint választó a teszt indítása előtt jelenik meg,
   * tartalmazza a `Teszt indítása` gombot.

2. **Nehézségi szint választó** (témaköröknél és altémáknál)

   * `könnyű` / `normál` / `nehéz` szintek,
   * egyszerre **egy** nehézségi szinthez tartozó teszt fut,
   * kérdésszám: **10 kérdés / nehézségi szint**.

   Altéma teszt: **10 kérdés / nehézségi szint**, főtéma teszt: **20 kérdés**, nehézségi bontás nélkül.

3. **Teszt navigációs sáv**

   * **paginációs pontok** és **bal/jobb nyilak** egy sorban,
   * alapállapot: a pontok szürkék (inaktív),
   * elfogadott válasz után a pont zöldre vált,
   * az aktuális pont kiemelt,
   * számozott „kérdés x / y” jelzés **nem szükséges**.

4. **Feladvány blokk**

   * kérdés szövege (képletekkel, táblázattal, ábrával kiegészítve),
   * válaszmezők (egy vagy több input), rádiógombok, szükséges kontrollok,
   * kísérő infók és rövid instrukció.

5. **Teszt lezárása és értékelés**

   * alul fix `Teszt befejezése` / `Értékelés` gomb,
   * beküldés után lezárja a futó tesztet.

6. **Eredménymegjelenítés**

   * a teszt lezárása után:

     * megjelenik a **jegy**,
     * meta-információk (pl. helyes válaszok száma, időtartam),
     * válasz-áttekintő (helyes / helytelen + helyes megoldás),
   * a rendszer frissíti a `best_grade_difficulty_level` (témakör + nehézség) adatot,
   * altéma esetén a **nehézségi szinthez** tartozó legjobb jegyet,
   * főtéma esetén az egyetlen tesztre vonatkozó legjobb jegyet.

A Teszt fül **eredményei** döntik el, hogy a modul mikor lesz `COMPLETED` (kimaxolt),
a `structure/module-lifecycle.md` szabályai szerint.

### 3.4. Gyakorlás fül – végtelenített kérdésfolyam XP-ért

A Gyakorlás fül célja, hogy a tanuló **folyamatos, randomizált feladatfolyamot** kapjon,
lehetőleg ismétlődő kérdések nélkül, és **XP-ért** cserébe.

Szerkezeti elemek:

1. **Nehézségi szint szűrők (checkboxok)**

   * `könnyű` / `normál` / `nehéz` jelölőnégyzetek,
   * alapértelmezés: a `könnyű` be van pipálva,
   * ha a tanuló bepipálja a `normál` vagy `nehéz` szintet, onnan is kaphat kérdéseket,
   * ha kiveszi a pipát `könnyű` szintről, akkor csak a megmaradt szintekről érkeznek kérdések.

2. **Aktuális kérdés blokk**

   * kérdés szövege,
   * opcionális képlet-blokk (a megoldáshoz szükséges képlet),
   * vizuális segéd (ha releváns, pl. Venn-diagram részlete),
   * beviteli mező(k) a megoldásra.

3. **Válasz beküldése**

   * dedikált `Válasz elküldése` gomb,
   * **Enter billentyű** lenyomásával is beküldhető a válasz (keyboard-friendly),
   * a rendszer azonnal ellenőrzi a választ.

4. **Visszajelzés blokk**

   * helyes válasz esetén:

     * pozitív visszajelzés,
     * a nehézségi szintnek megfelelő XP jóváírása,

       * pl. könnyű: 1 XP,
       * normál: 2 XP,
       * nehéz: 3 XP,
     * az XP azonnal hozzáadódik a **globális XP-hez**, ami a felső fejléc XP-sávján is megjelenik.
   * hibás válasz esetén:

     * jelzés a hibáról,
     * a tanuló utasítása, hogy próbálja újra,
     * a helyes megoldás (vagy a megoldás lépései) **csak egy logikailag döntött ponton** jelennek meg (pl. X próbálkozás után).

5. **Automatikus továbblépés**

   * helyes válasz és lezárt visszajelzés után a rendszer **kb. 2 másodperc múlva** automatikusan a következő kérdésre lép,
   * így a gyakorlás **folyamatos, megszakítás nélküli kérdésfolyamként** élhető meg.

6. **Randomizáció és nem ismétlődő kérdések elve**

   * a kérdésgenerálás **random paraméterekkel** dolgozik (pl. véletlen számok, véletlenül kiválasztott halmazok, különböző esetek),
   * cél: a tanuló **nagy valószínűséggel ne kapja meg kétszer ugyanazt a konkrét feladatot**, csak hasonló struktúrájúakat,
   * randomizált függvények írásával maximulaizáljuk a feladatok ismétlődésének elkerülését.

A Gyakorlás fül tehát:

* XP-gyűjtésre szolgál,
* segíti a készségek elmélyítését,
* **nem** közvetlenül befolyásolja a modul `COMPLETED` státuszát (azt a Teszt fül jegyei határozzák meg).

---

## 4. Kapcsolódás az XP- és szint-rendszerhez

A modulnézet szoros kapcsolatban áll a globális XP- és szint-rendszerrel.

* A **Teszt fülön** elért eredmények elsősorban **jegyeket** generálnak,
  amelyek a modul "kimaxolását" határozzák meg.
* A **Gyakorlás fülön** helyes válaszokért XP jár (nehézségi szinttől függően),
  amely:

  * azonnal hozzáadódik a globális XP-hez,
  * a felső fejléc XP-sávján látható előrehaladást biztosít,
  * hosszú távon hozzájárul a tanuló szintlépéséhez.

A konkrét XP-formulákat és szintlépési szabályokat más dokumentum (XP-rendszer leírás) rögzíti,
itt csak a modulnézet strukturális kapcsolódási pontjait definiáljuk.

---

## 5. Kapcsolódás más szerkezeti dokumentumokhoz

A modulnézet szerkezete az alábbi `structure/` dokumentumokkal együtt értelmezhető teljesen:

* `structure/app-shell.md` – meghatározza az App Shell keretét, amelybe a modulnézet illeszkedik.
* `structure/navigation-flow.md` – leírja, hogyan jut a tanuló a Quest Logból a modulnézetre, és hogyan mozog a fülek között.
* `structure/module-lifecycle.md` – definiálja a modul állapotait (`NOT_ACCEPTED`, `ACTIVE`, `COMPLETED`) és a kimaxolás feltételeit, amelyek a Teszt fül eredményeihez kötődnek.
* `structure/character-sheet.md` – a modulok eredményei innen visszanézhetők a karakterlapon (Eredményeim fül).
* `structure/settings-overlay.md` – a modulnézet vizuális megjelenésére ható globális beállításokat (skin, UI, hang) innen lehet módosítani.

Ezek együtt adják a MatekMester modulnézeteinek **stílusfüggetlen szerkezeti tervét**, amelyre a `style/` mappa dokumentumai építenek konkrét vizuális megoldásokat és grafikát.
