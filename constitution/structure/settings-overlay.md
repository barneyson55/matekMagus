---

title: "Beállítások overlay szerkezeti leírás"
description: "A MatekMester Beállítások (Settings) overlay stílusfüggetlen szerkezeti és működési terve"
--------------------------------------------------------------------------------------------------------

# Beállítások overlay – szerkezeti leírás (`structure/settings-overlay.md`)

Ez a dokumentum a MatekMester **Beállítások overlay** (Settings) működését és szerkezetét írja le
**stílusfüggetlen, szerkezeti szinten**.

A Beállítások overlay:

* az App Shell (felső fejléc + Quest Log + fő tartalom) **fölött** jelenik meg,
* átmenetileg **elhomályosítja** a mögöttes tartalmat,
* lehetőséget ad a felhasználónak, hogy:

  * **skin/tema** beállításokat (vizuális stílusokat) válasszon, szabjon testre,
  * globális **UI / hozzáférhetőségi** opciókat állítson,
  * hang- és visszajelzés-beállításokat módosítson,
  * (később) játékélményt befolyásoló opciókat (tippek, tutorialok) finomhangoljon.

Nem foglalkozik konkrét színekkel, ikonokkal, tipográfiával – ezeket a `style/` dokumentumok részletezik.

---

## 1. Elhelyezkedés és rétegződés az App Shell felett

A Beállítások overlay **nem külön oldal**, hanem egy **teljes képernyős réteg** az App Shell felett.

* Az App Shell (header + Quest Log + fő tartalom) **továbbra is jelen van a háttérben**,
  de vizuálisan tompítva / elmosva / sötétítve.
* A Beállítások overlay egy **központi panelt** jelenít meg, amely tartalmazza a beállítási kategóriákat és azok tartalmát.

Flow szempontból:

* belépés: jobb alsó sarokban lévő **Settings gomb**,
* kilépés: Bezárás gomb / háttérre kattintás / ESC (ha engedélyezett),
* kilépés után a felhasználó **pontosan ugyanarra a nézetre** kerül vissza, ahol a Beállításokat megnyitotta.

---

## 2. Belépés és kilépés folyamata

### 2.1. Belépés a Beállításokba

Belépés indító eseményei:

1. A felhasználó a jobb alsó sarokban elhelyezkedő **Settings gombra** kattint.
2. (Opcionális jövőbeli lehetőség) Billentyűparancs, pl. `Esc + S`, ha definiálva lesz.

Belépéskor:

* egy fél-átlátszó háttér (overlay háttér) jelenik meg az App Shell fölött,
* a központi panel felúszik,
* a fókusz a Beállítások felületre kerül (billentyűzet-navigáció szempontjából is).

### 2.2. Kilépés a Beállításokból

Kilépési lehetőségek:

* **Bezárás gomb** (tipikusan a jobb felső sarokban, pl. `X` ikon),
* overlay háttérre kattintás (ha a design megengedi),
* **ESC billentyű** lenyomása (ha engedélyezett).

Kilépéskor:

* az overlay háttér eltűnik,
* a központi panel bezárul,
* a fókusz visszakerül az előző nézetre (ugyanabba a modulba/fülre/karakterlapra).

A beállítások életciklusa szempontjából két alapvető működés létezik:

* **Azonnali alkalmazás** – változás mentése azonnal (pl. skin-váltás azonnal hatályba lép).
* **Mentés gombbal** – változások csak "Mentés" / "Alkalmazás" gomb megnyomásakor lépnek életbe.

Ez a dokumentum a **második verziót** tekinti alapnak (külön Mentés/Mégse logika), a `style/` dokumentumok dönthetnek az azonnali előnézet alkalmazás konkrét működéséről.

---

## 3. Overlay fő elrendezése

A Beállítások overlay központi panelje logikailag három részre tagolható:

1. **Fejléc sáv** – overlay címe + Bezárás gomb.
2. **Kategória- és tartalomrégió** – bal oldali kategórialista + jobb oldali részletes beállítások.
3. **Alsó akciósáv** – gombok: `Mégse` / `Mentés`.

Sematikus vázlat:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ [ Beállítások ]                                       [ X Bezárás ] │  ← Fejléc sáv
├───────────────┬─────────────────────────────────────────────────────┤
│ Kategóriák    │  Kiválasztott kategória részletes beállításai       │
│ (bal lista)   │  (Skin / UI / Hang / Játékélmény / stb.)            │
├───────────────┴─────────────────────────────────────────────────────┤
│ [ Mégse ]                                                [ Mentés ] │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Kategóriák és logikai csoportosítás

A konkrét kategóriák bővíthetők, de a szerkezeti terv az alábbi **alap kategóriákkal** számol:

1. **Skin & Téma** (`Skin & Theme`)
2. **Felhasználói felület & Hozzáférhetőség** (`UI & Accessibility`)
3. **Hang & Visszajelzések** (`Sound & Feedback`)
4. **Játékélmény & Segítség** (`Gameplay & Assistance`)
5. **Adatok & Reset** (`Data & Reset`) – opcionális, jövőbeli modul.

### 4.1. Skin & Téma

Cél: a tanuló kiválaszthassa, milyen **vizuális stílusban** szeretné használni a MatekMestert.

Fő elemek:

* Avatar feltöltése

* Elérhető skinek listája (pl. Pergamen, Galaxis, Futurisztikus, Színes, Dark, Saját színek, stb.).
* Egy skin kiválasztásakor:

  * a jobb oldali régióban **előnézet** jelenhet meg (pl. kicsinyített Quest Log + modulnézet mintaképernyő),
  * az előnézet csak az overlayen belül érvényes – a teljes alkalmazás kinézete csak `Mentés` után frissül. 
  * Testreszabható skin opció választásakor a programban használt színek megjelenítése és hexadecimális szín választóval ellátva egyesével, egyedi képek feltöltése háttérnek.

Logikai működés:

* A kiválasztott skin az aktuális felhasználó **profilhoz kötött beállítás**.
* A skin a teljes alkalmazásra (App Shell + modulok + karakterlap) érvényes.
* A skinhez tartozó stílus-definíciókat (színek, betűk, díszítések) a `style/` és a korábbi `skins` koncepció egyesített dokumentumai tartalmazzák.

### 4.2. Felhasználói felület & Hozzáférhetőség

Cél: a tanuló saját igényeihez igazíthassa a kezelőfelületet.

Lehetséges beállítások:

* Betűméret skálázása (normál / nagyobb / nagyon nagy).
* Kontraszt opciók (normál / magas kontraszt).
* Animációk engedélyezése/tiltása (egyszerűbb megjelenítés, ha valakit zavar a sok mozgás).
* Billentyűparancsok / Billentyűparancsok testreszabása.

### 4.3. Hang & Visszajelzések

Cél: szabályozni, hogy mennyire "beszédes" a rendszer.

Lehetséges beállítások:

* Hangok ki/be (helyes válasz, hibás válasz, szintlépés, achievement, stb.).
* Visszajelzési intenzitás (pl. csak minimál jelzések vs. részletes szöveges visszajelzés).
* Értesítési stílus (pl. felugró toast üzenetek hossza, láthatósága).

### 4.4. Játékélmény & Segítség

Cél: olyan opciók kezelése, amelyek **nem befolyásolják a jegyeket**,
ade hatással vannak a tanuló támogatottságára.

Lehetséges beállítások:

* **Tippek és magyarázatok** megjelenítése teszt közben:

  * teljesen kikapcsolva,
  * csak gyakorlás módban,
  * mindenhol.
* **Vizuális segítségek** (pl. kiemelések, segéd-vonalak a diagramokon).
* **Alapértelmezett nehézségi szint** gyakorláskor:

  * pl. legutóbb használt, vagy mindig könnyű / közepes / nehéz.

### 4.5. Adatok & Reset (opcionális)

Ez a szekció később bevezethető, potenciálisan veszélyes műveletek szabályozására.

Lehetséges opciók:

* Kizárólag **helyi kliens beállítások** visszaállítása alapállapotra (skin, UI, hang, stb.).
* (Külön megerősítést igényelne) Tanulói statisztikák / próbálkozási előzmények törlése.

A konkrét törlési funkciók szigorúbb UX-dizájnt igényelnek (megerősítő párbeszédek),
ez a dokumentum csak a szerkezeti létezésüket rögzíti.

---

## 5. Mentés / Mégse logika

A Beállítások overlay **független az App Shell állapotaitól**, de a beállítások
érvényesítése hatással van az egész alkalmazás kinézetére és viselkedésére.

Alapelv:

* **Mégse**:

  * minden, az overlay megnyitása óta végzett módosítás elvetése,
  * a rendszer visszaáll a belépéskori beállításokra,
  * az overlay bezárása után az app úgy néz ki, mint a Beállítások megnyitása előtt.

* **Mentés**:

  * az overlayen belül megadott beállítások érvénybe lépnek,
  * a skin / UI / hang / játékélmény beállításokat a rendszer elmenti (profilhoz kötve),
  * az overlay bezárása után az app már az új beállításokkal működik.

A `style/` dokumentumok döntik el, hogy egyes beállításokból adódhat-e
**azonnali előnézet**, amely mentés nélkül is látható (pl. skin preview), de menteni csak gombnyomásra ment.

---

## 6. Kapcsolódás más szerkezeti dokumentumokhoz

A Beállítások overlay a következő szerkezeti dokumentumokhoz kapcsolódik:

* `structure/app-shell.md` – az App Shell fölött jelenik meg overlay-ként,
  a jobb alsó sarokban elhelyezett Settings gombból nyitható.
* `structure/navigation-flow.md` – részletesen leírja a belépés/kilépés folyamatát,
  valamint azt, hogy kilépéskor a felhasználó ugyanarra a nézetre tér vissza.
* `style/` mappa dokumentumai – a Skin & Téma, UI, hang és egyéb beállítások
  pontos vizuális és tipográfiai hatását rögzítik.

Ezek együtt adják a MatekMester Beállítások overlayének **stílusfüggetlen, szerkezeti tervét**, amelyre
bármilyen vizuális skinrendszer és részletes UX-interakció ráépíthető.
