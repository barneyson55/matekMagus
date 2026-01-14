---

title: "Navigációs folyamatok"
description: "A MatekMester képernyői közötti navigáció, felhasználói útvonalak és állapot-váltások szerkezeti leírása"
-----------------------------------------------------------------------------------------------------------------------

# Navigációs folyamatok (`structure/navigation-flow.md`)

Ez a dokumentum a MatekMester alkalmazás **képernyői közötti mozgást** írja le:

* honnan, hova, milyen események hatására jut a felhasználó,
* milyen **fő nézettípusok** vannak (modulnézet, karakterlap, beállítások overlay, stb.),
* hogyan kapcsolódnak ehhez a korábban definiált **app shell** és **modul életciklus** szabályok.

A dokumentum **nem vizuális**, kizárólag a **flow**-t, a képernyők közötti kapcsolatokat, és a releváns állapotváltásokat rögzíti.

---

## 1. Fő nézettípusok

A rendszerben az alábbi fő nézettípusok léteznek:

1. **Alkalmazás keret (App Shell)** – a felső fejléc + bal oldali Quest Log + fő tartalomterület

   * Részletes szerkezeti leírás: `structure/app-shell.md`.
2. **Modulnézet** – egy konkrét modul (pl. Halmazműveletek) tartalmi nézete

   * Cím, fülek (Elmélet / Vizuális modell / Teszt / Gyakorlás), „Küldetés elfogadása” gomb, stb.
3. **Karakterlap nézet** – `character_sheet.html`

   * Avatár, szintnév, XP, aktív küldetések, eredmények, achievementek.
4. **Beállítások overlay** – Settings overlay az app shell fölött

   * Skin/tema választás, globális beállítások.

A **Quest Log panel** és az **App Shell** minden „normál” nézetnél jelen van (modulnézet, karakterlap),
csak a Beállítások overlay takarja el átmenetileg.

---

## 2. Kiindulási pont – alkalmazás indítása

### 2.1. Alapfolyamat

1. A felhasználó elindítja a MatekMester alkalmazást (pl. `index.html` vagy desktop app főablak).
2. Az App Shell betölt:

   * felső fejléc (MatekMester + XP sáv + avatar + szintnév + buffok + hamburger),
   * bal oldali Quest Log (modulok listája és állapotai),
   * fő tartalomterület.
3. A fő tartalomterületen **alapértelmezetten**:

   * egy **home/áttekintő nézet** jelenik meg.

### 2.2. Quest Log és modul állapot megjelenítése

Az indítás pillanatában:

* a Quest Log betölti a modulok listáját,
* minden modul az adott tanulóra vonatkozó **állapotával** jelenik meg:

  * `NOT_ACCEPTED` → szürkített modulnév,
  * `ACTIVE` → normál színű modulnév,
  * `COMPLETED` → normál színű modulnév + zöld pipa.

A pontos állapotokat a `structure/module-lifecycle.md` definiálja.

---

## 3. Navigáció a Quest Logból modulnézetre

A leggyakoribb felhasználói művelet: **modul választása** a Quest Logból.

### 3.1. Modul kiválasztása

1. A felhasználó a bal oldali Quest Log panelen rákattint egy modulra (pl. "Halmazműveletek").
2. A fő tartalomterület **modulnézetre vált**, és megjeleníti az adott modul struktúráját:

   * modul cím,
   * (ha állapot: `NOT_ACCEPTED`) `Küldetés elfogadása` gomb,
   * fülrendszer (Elmélet (1 / Elmélet 2 / Elmélet 3(nehezebb modulok esetén több elméleti rész lesz))/ Vizuális modell / Teszt / Gyakorlás).

### 3.2. Küldetés elfogadása (NOT_ACCEPTED → ACTIVE)

Ha a modul állapota `NOT_ACCEPTED`:

1. A modulnézet tetején jól láthatóan megjelenik a `Küldetés elfogadása` gomb.
2. A felhasználó rákattint a gombra.
3. Események:

   * a modul állapota `ACTIVE` lesz,
   * a Quest Logban a modulnév szürkített helyett normál/élő színűre vált,
   * a gomb eltűnik vagy inaktívvá válik,
   * a modul teljes funkcióköre (Teszt, Gyakorlás, stb.) "hivatalosan" elérhetővé válik, mint felvett quest.

Az állapotváltás logikáját részletesen a `structure/module-lifecycle.md` tartalmazza.

---

## 4. Navigáció a modulfüleken belül

Minden modulnézet egy **fülrendszerrel** rendelkezik, amely az adott modul különböző tartalmi aspektusait jeleníti meg.

Tipikus fülek:

1. **Elmélet** – kulcsfogalmak, definíciók, magyarázatok. Nehezebb modulok esetén több Elmélet fül lesz létrehozva, pl.: Elmélet 1 / Elmélet 2 / Elmélet 3.
2. **Vizuális modell** – ábrák, animációk, grafikus szemléltetés.
3. **Teszt** – értékeléssel járó feladatsor, jegyszerzéssel.
4. **Gyakorlás** – ismétlő feladatok, nehézség szerinti XP-szerzés.

### 4.1. Fülváltás logikája

* A fülre kattintva csak a **modul tartalomrégiója** cserélődik –
  az App Shell (fejléc + Quest Log) változatlanul megmarad.

### 4.2. Teszt fül – eredmény és visszatérés

A Teszt fül használatának fő lépései:

1. Teszt indítás:

   * **témakör** esetén nehézségi szintet választ (`könnyű` / `normál` / `nehéz`),
   * **altéma** esetén nehézségi szintet választ, majd rövid ismertető után `Teszt indítása` gombbal indul a teszt,
   * **főtéma** esetén rövid ismertető után `Teszt indítása` gombbal indul a teszt.
2. A teszt a paginációs pontok + bal/jobb nyilak sávval navigálható, a kérdések ez alatt jelennek meg.
3. A felhasználó kitölti a tesztet, elküldi a megoldást.
4. A rendszer kiértékeli:

   * jegyet generál a témakör + nehézségi szint kombinációhoz,
   * frissíti a témakörre vonatkozó `best_grade_difficulty_level` adatot.
5. Eredmény megjelenik (pl. összefoglaló dobozban vagy modálban), válasz-áttekintővel és helyes megoldásokkal.
6. A felhasználó:

   * maradhat a Teszt fülön (új próba), vagy
   * válthat Gyakorlás fülre, vagy
   * visszatérhet Elmélet / Vizuális modell fülre.

A modul kimaxolása szempontjából **csak a tesztek jegyei számítanak**, nem a gyakorlások XP-je (lásd `module-lifecycle.md`).

### 4.3. Gyakorlás fül – kérdésfolyam és XP

A Gyakorlás fül tipikus folyamata (példa-szinten):

1. A tanuló kiválasztja, mely nehézségi szintekről szeretne kérdéseket kapni (könnyű / normál / nehéz) – akár több egyszerre is.
2. A rendszer **véletlenszerűen** generál feladatokat az adott témakörből, a kiválasztott nehézségi szintek alapján. A kérdések a nehézségi szintekhez igazodnak, de tartalmuk randomizált függvények által készül el (pl. véletlenszerűen generált számok, véletlenszerűen generált kérdések, stb.). Így a tanuló nagy eséllyel nem fogja kétszer ugyanazt a kérdést kapni, jobban tanulhat.
3. Minden kérdésnél:

   * a tanuló megoldást ír be,
   * elküldi (pl. gombbal vagy Enterrel),
   * azonnali visszajelzést kap (jó/rossz),
   * helyes megoldás esetén megkapja a nehézségi szinthez tartozó XP-jutalmat.
4. A rendszer automatikusan **2 másodperc múlva** a következő kérdésre lép.

Navigáció szempontjából:

* a Gyakorlás fülön belül a tanuló egy *folyamatos kérdésáramot* használ,
* bármikor átválthat másik fülre (Teszt, Elmélet, Vizuális modell),
* az XP állapotot globálisan a fejléc player panelje tükrözi.

---

## 5. Navigáció a karakterlapra (Character Sheet)

A **karakterlap** a felhasználó profiljának és "RPG-karakterének" nézete.

### 5.1. Belépés a karakterlapra

1. A felhasználó a felső fejléc jobb oldalán található **avatarra** vagy a szintnév melletti elemre kattint.
2. Az App Shell továbbra is megmarad (fejléc + Quest Log),
   de a fő tartalomterület **karakterlap nézetre** vált (`character_sheet.html`).

### 5.2. Karakterlap tartalma (flow szempontból)

A karakterlapon a fő tartalmi blokkok:

* jobb oldali panel: avatár, szintnév, XP, achievementek listája (görgethető),
* bal oldali panel: tab-váltás **Aktív küldetések** / **Eredményeim** között.

Navigációs lehetőségek:

* **Aktív küldetések** fül:

  * listázza az összes `ACTIVE` állapotú modult,
  * innen a modulnévre kattintva vissza lehet térni az adott modulnézetre.

* **Eredményeim** fül:

  * listázza a teljesített modulokat, főbb eredményeket, kimaxolt modulokat, teszt próbálkozás eserdményeket, főtéma, altéma, témakör szinten, akkor is, ha sikertelenek lettek.

A karakterlapról bármikor vissza lehet lépni egy modulnézetre:

* Quest Log modulra kattintva,
* vagy a listákban lévő modul linkeken keresztül.

---

## 6. Navigáció a Beállítások overlayhez

A **Beállítások** önálló overlay-ként jelenik meg az App Shell fölött.

### 6.1. Belépés a Beállításokba

1. A felhasználó a jobb alsó sarokban található **Settings gombra** kattint.
2. A teljes képernyő fölé egy overlay réteg kerül:

   * a mögöttes tartalom (App Shell + aktuális nézet) elhomályosodik vagy háttérbe szorul,
   * az overlay központi panelén a Beállítások tartalma jelenik meg.

### 6.2. Beállítások tartalma (flow szempontból)

A Settings overlay tipikusan tartalmazza:

* skin/tema választót (pergamen, galaxis, futurisztikus, színes, dark, stb.),
* egyéb globális opciókat (pl. animációk, hang, stb.),
* visszalépés/becsukás gombot.

### 6.3. Kilépés a Beállításokból

Kilépési lehetőségek:

* explicit "Bezárás" (x) gomb,
* overlay háttérre kattintás (ha a design engedi),
* ESC billentyű (ha támogatott).

Kilépés után:

* a felhasználó **pontosan ugyanarra a nézetre** kerül vissza, ahol a beállítások megnyitása előtt volt:

  * ugyanabban a modulban,
  * ugyanazon fülön (Elmélet / Teszt / Gyakorlás / karakterlap, stb.).

---

## 7. Quest Log megjelenítése / elrejtése (hamburger)

A bal oldali Quest Log panel elrejthető/megjeleníthető a felső fejléc bal oldalán lévő **hamburger gombbal**.

### 7.1. Rejtés/megjelenítés

1. A felhasználó a hamburgerre kattint.
2. Ha a Quest Log **látható** volt:

   * a panel eltűnik, kiúszik a bal oldalon,
   * a fő tartalomterület szélesebb lesz (kitöltheti a felszabadult helyet).
3. Ha a Quest Log **nem látható** volt:

   * a panel ismét megjelenik, beúszik a bal oldalon,
   * a fő tartalomterület visszaigazodik az eredeti méretére.

Ez a funkció csak **elrendezést** befolyásol, a modulok és állapotok nem változnak tőle.

---

## 8. Navigáció összefoglaló

* Az alkalmazás induláskor betölti az App Shell-t: felső fejléc, Quest Log, fő tartalomterület.
* A Quest Logból modulra kattintva a fő tartalomterület adott modulnézetre vált.
* A `Küldetés elfogadása` gombbal a modul `NOT_ACCEPTED` → `ACTIVE` állapotba kerül.
* A modulon belüli fülek (Elmélet / Vizuális modell / Teszt / Gyakorlás) között szabadon lehet váltani.
* A Teszt fülön szerzett jegyek és a témakör/altéma/főtéma struktúra együtt határozza meg, mikor lesz a modul `COMPLETED` (kimaxolt).
* A Gyakorlás fül folyamatos kérdésáramot biztosít XP-gyűjtéssel, de a kimaxolást **nem** közvetlenül befolyásolja.
* Az avatarra kattintva a karakterlap (character sheet) nézetre váltunk, ahol a modulokra vissza is lehet navigálni.
* A jobb alsó Settings gomb beállítás overlayt nyit, amelyből kilépve a felhasználó ugyanarra a nézetre tér vissza.
* A hamburger gombbal a Quest Log panel bármikor elrejthető/megjeleníthető, a tartalom nézetének állapota változatlanul megmarad.

Ez a dokumentum az általános navigációs "vázat" rögzíti. A részletes vizuális megjelenés és interakciós finomhangolás a `style/` mappa dokumentumaiban kerül meghatározásra.
