---

title: "Modul és quest életciklus"
description: "A MatekMester modulok, témakörök és tesztek stílusfüggetlen állapot- és életciklus leírása"
---------------------------------------------------------------------------------------------------------

# Modul és quest életciklus (`structure/module-lifecycle.md`)

Ez a dokumentum a MatekMester rendszerben szereplő **modulok**, **témakörök**, **altémák** és **főtémakörök**
életciklusát írja le **stílusfüggetlen, szerkezeti szinten**.

Nem foglalkozik vizuális megjelenéssel (színek, ikonok, betűtípusok), kizárólag azzal, hogy:

* milyen **állapotok** léteznek,
* milyen **események** váltják az állapotváltásokat,
* mit jelent pontosan az, hogy egy **modul „kimaxolt” quest**.

---

## 1. Entitások és hierarchia

A tananyag hierarchikusan épül fel. A releváns szintek:

1. **Főtéma** – Egy teljes középiskolai osztály tananyagának összefoglalója, gyűjteménye, egy bizonyos szintet szimbolizál a tanluó tudásának megflelően, egymásra építve, egyre nehezedve. Csak egy teszt létezik a legvégén, ha minden altémáját és témakörét elvégezte a tanuló, majd egy modulzáró írásával jegyet kap rá és a modul kimaxolódik, ha elérte az 5-ösjegyet a modulzáróban.
2. **Altéma** – Egy bizonyos témát foglal össze a tanéven belül, így a témakörei elvégzése után témazáró írható belőle, **nehézségi szintekkel** (`könnyű` / `normál` / `nehéz`). A témazáró kimaxolása akkor történik, ha **minden nehézségi szinten** megkapta rá az 5-ös jegyet.
3. **Témakör** – Egy témán belüli témakör, nehézségi szintek szerinti tesztekkel, minden nehézségi szinten elért teljesítmény után különböző XP jutalmat kap a hallgató, az elért jegy függvényében. Témakörön belül XP jutalomért gyakorlások tölthetőek ki. Ezekben az entitásokban lehet elsajátítani a témával kapcsoaltos tudást, itt van megtanítva a tanuló arra, amiről valójában szól a témakör, részben az altéma, és a főtéma. Képletekkel, szöveggel, vizuális segítséggel, amit éppen az adott tudás igényel a megértetéshez.  

A **quest log** (bal oldali sáv) modul-szinten mutatja a haladást, de a modul állapotát az alatta lévő szinteken elért teljesítmény határozza meg.

---

## 2. Modul állapotok (Quest státuszok)

Modul szinten három fő állapot létezik:

1. `NOT_ACCEPTED` – **még nem elfogadott küldetés**
2. `ACTIVE` – **aktív küldetés**
3. `COMPLETED` – **teljesített küldetés**

### 2.1. NOT_ACCEPTED – még nem elfogadott küldetés

* **Alapállapot:** minden modul ebben az állapotban indul a tanuló számára.
* A Quest Logban a modul:

  * szürkített / halvány szöveggel jelenik meg (stílus később a `style/` alatt),
  * nincs mellette pipa vagy achievement jelölés.
* A modul nézetében (Main Content):

  * a tanuló látja a modul címét,
  * láthat elméleti tartalmat, betekintést,
  * **külön gombként megjelenik:** `Küldetés elfogadása`.

**Állapotváltás NOT_ACCEPTED → ACTIVE:**

* Esemény: a tanuló **megnyomja a `Küldetés elfogadása` gombot** a modul nyitó nézetében.
* Következmény:

  * a modul állapota `ACTIVE` lesz,
  * a Quest Logban a modul normál, élénk színnel jelenik meg,
  * a modul tartalmában a teljes funkciókör (teszt, gyakorlás, stb.) elérhetővé válik (logikai értelemben – technikailag akár korábban is, de fogalmilag innen számít „felvett questnek”).

### 2.2. ACTIVE – aktív küldetés

Az `ACTIVE` állapot azt jelenti, hogy a tanuló **felvette a modult küldetésként**, és már dolgozik rajta.

Jellemzők:

* A Quest Logban a modul neve normál/élő színnel látszik.
* A modul nézetében:

  * a `Küldetés elfogadása` gomb már nem releváns / nem jelenik meg,
  * elérhetők a modulfülek: Elmélet, Vizuális modell, Teszt, Gyakorlás.
* A tanuló:

  * teszteket írhat témakörönként,
  * altéma/főtémakör teszteket teljesíthet,
  * XP-t és jegyeket szerezhet.

**Állapotváltás ACTIVE → COMPLETED** később, a 4. fejezetben kerül részletezésre (kimaxolt feltételek).

### 2.3. COMPLETED – kimaxolt küldetés

A `COMPLETED` állapot azt fejezi ki, hogy a tanuló **a modul összes releváns tesztjéből a maximumot hozta ki** a szabályok szerint.

Jellemzők:

* A Quest Logban:

  * a modul neve továbbra is normál/élő színnel látszik,
  * **zöld pipa** vagy más egyértelmű pozitív jelzés jelenik meg a modul neve mellett.
* A modul **továbbra is teljesen interaktív**:

  * tesztelés és gyakorlás ezután is lehetséges,
  * a pipa azt jelzi: a modul "quest" szinten már komplett, de a tanulás folytatható.

A `COMPLETED` állapot feltételeit a 4. fejezet részletezi.

---

## 3. Témakörök, altémák, főtémák – tesztek és nehézségi szintek

A modulon belüli szinteknek külön szabályrendszerük van, a **nehézségi szintek** pedig csak bizonyos helyeken jelennek meg.

### 3.1. Témakör – nehézségi szintekkel rendelkező tesztek

A **témakörök** azok az egységek, ahol a tanuló **több nehézségi szinten is tesztet írhat**.

* Elérhető nehézségi szintek (tipikusan):

  * `könnyű`,
  * `normál`,
  * `nehéz`.

* Minden nehézségi szinthez tartozik:

  * egy vagy több teszt-próba,
  * minden próbából jegy (1–5 vagy hasonló skála) származik.
  * kérdésszám: **10 kérdés / nehézségi szint**.

A rendszer **témakör szinten** nyilvántartja:

* adott témakör + adott nehézségi szint **legjobb elért jegyét** (`best_grade_difficulty_level`).

### 3.2. Altéma – nehézségi szintekkel rendelkező tesztek

Az **altéma** esetén:

* nehézségi szintek: `könnyű` / `normál` / `nehéz`,
* minden nehézségi szinthez tartozik tesztpróba,
* a tanuló itt is jegyet szerez (jellemzően 1–5 közötti),
* kérdésszám: **10 kérdés / nehézségi szint**.

A rendszer altéma szinten nehézségi bontásban nyilvántartja:

* az **elért legjobb jegyet** az altéma + nehézség kombinációra (`subtopicId + difficulty`).

### 3.3. Főtéma – egyetlen teszt, nehézségi bontás nélkül

A **főtéma** hasonló az altémához abból a szempontból, hogy:

* a modul egy-egy főbb egységéhez **egy darab összefoglaló teszt** tartozik,
* **nincs nehézségi szint bontás** (nincs könnyű/normál/nehéz),
* a tanuló itt is jegyet szerez.
* kérdésszám: **20 kérdés**.

A rendszer főtémak szinten nyilvántartja:

* az **elért legjobb jegyet** a főtémak tesztjéből (`best_grade_maintopic`).

---

### 3.4. Quest-hierarchia státusz aggregáció

Az állapotok a hierarchiában (főtéma → altéma → témakör) **egymásra hatnak**. Az
aggregáció azt jelenti, hogy a szülő szint státusza nem csak a saját tesztjeiből,
hanem az alatta lévő szintek állapotából is számítódik, és a Quest Logban ez a
**összegzett** állapot jelenik meg:

* **Témakör**
  * `NOT_ACCEPTED`: nincs elfogadás és nincs tesztpróba.
  * `ACTIVE`: elfogadta, vagy legalább egy tesztpróbája van.
  * `COMPLETED`: minden nehézségi szinten elérte a max jegyet.

* **Altéma**
  * `NOT_ACCEPTED`: nincs elfogadás és nincs altéma-tesztpróba, valamint nincs aktív/kimaxolt témakör alatta.
  * `ACTIVE`: elfogadta, vagy van altéma-tesztpróba, vagy legalább egy alá tartozó témakör `ACTIVE`/`COMPLETED`.
* `COMPLETED`: altéma-tesztből **minden nehézségi szinten** max jegy **és** minden alá tartozó témakör `COMPLETED`.

* **Főtéma**
  * `NOT_ACCEPTED`: nincs elfogadás és nincs főtéma-tesztpróba, valamint nincs aktív/kimaxolt altéma alatta.
  * `ACTIVE`: elfogadta, vagy van főtéma-tesztpróba, vagy legalább egy alá tartozó altéma `ACTIVE`/`COMPLETED`.
  * `COMPLETED`: főtéma-tesztből max jegy **és** minden alá tartozó altéma `COMPLETED`.

Ezek az aggregációk biztosítják, hogy a Quest Log státuszai a hierarchia teljesítményét tükrözzék.

---

## 4. "Kimaxolt" modul – pontos definíció

Egy modul akkor lép `COMPLETED` állapotba, ha a tanuló **minden alá tartozó szinten elérte a maximumnak tekintett teljesítményt**.

### 4.1. Kimaxolás témakör szinten (nehézségi bontással)

Témakör szinten a feltétel:

* **minden elérhető nehézségi szinten** (könnyű, normál, nehéz),
* a tanuló **elérte a legjobb jegyet**.

"Legjobb jegy" alatt itt azt értjük, hogy:

* a rendszer által definiált **maximális jegyet** (tipikusan 5-ös) eléri, vagy
* ha később a jegyrendszer változik, akkor mindig a **konkrét skála szerinti plafont**.

### 4.2. Kimaxolás altéma és főtémakör szinten

Altéma esetén van nehézségi szint, főtéma esetén nincs.

* **Altéma**: minden nehézségi szinten az altéma-tesztből a tanuló **ötös (vagy maximális) jegyet** ér el.
* **Főtéma**: minden főtémakörhöz tartozó **egyetlen összefoglaló tesztből** a tanuló **ötös (vagy maximális) jegyet** ér el.

### 4.3. Modul kimaxolása (összefoglaló feltétel)

A modul akkor lép `COMPLETED` állapotba, ha **egyidejűleg teljesül** az alábbi két feltétel:

1. **Témakör feltétel:**

   * minden témakörben, minden nehézségi szinten a legjobb (maximális) jegy elérése.

2. **Altéma + főtéma feltétel:**

   * minden altémához tartozó teszt **minden nehézségi szintjén** ötös (vagy adott skálán maximális) jegy elérése,
   * minden főtémához tartozó egyetlen tesztből ötös (vagy adott skálán maximális) jegy elérése.

Amint mindkét feltétel teljesül, a modul állapota:

* `ACTIVE` → `COMPLETED`-re vált,
* a Quest Logban zöld pipa jelenik meg a modul neve mellett.

**Fontos:** az állapotváltás **nem tiltja meg** a további használatot:

* a tanuló továbbra is írhat teszteket,
* gyakorolhat,
* fejlesztheti az eredményeit (pl. időeredmények, statisztikák szintjén),
* a pipa pusztán azt jelzi: a modul "quest" szinten már teljesített.

---

## 5. Tesztek, gyakorlás és XP – kapcsolat az életciklussal

Ez a dokumentum elsődlegesen az **állapotokról** szól, nem az XP-számítás részleteiről,
azonban a teljes képhez fontos megjegyezni:

* A **Teszt** fülön elért eredmények:

  * jegyeket generálnak (témakör/altéma/főtémakör szinten),
  * ezekből számítódik a modul teljesítése és a kimaxolás.

* A **Gyakorlás** fülön elért eredmények:

  * elsősorban **XP-t** adnak (nehézséghez rendelt XP-értékekkel),
  * segítik a tanulót a felkészülésben,
  * de a modul `COMPLETED` állapotának feltételét **nem** a gyakorlás XP-je, hanem a tesztekből származó jegyek adják.

A Teszt/Gyakorlás pontos XP- és jegykezelését külön dokumentum (pl. XP-formulák, jutalmazási rendszer) részletezi.

---

## 6. Összefoglalás

* A modul **három állapotot** vehet fel: `NOT_ACCEPTED`, `ACTIVE`, `COMPLETED`.
* A tanuló a modul nézetében, a `Küldetés elfogadása` gombbal lépteti a modult `NOT_ACCEPTED` → `ACTIVE` állapotba.
* A modul akkor lesz `COMPLETED`, ha:

  * minden témakör minden nehézségszintjén a legjobb (maximális) jegyet elérte,
  * minden altéma minden nehézségi szintjén ötös (vagy maximális) jegyet szerzett,
  * minden főtéma egyetlen tesztjéből ötös (vagy maximális) jegyet szerzett.
* A kimaxolt modul is **továbbra is használható**, a pipa csak a quest-szintű teljesítettséget jelöli.
* A vizuális megjelenítést (színek, ikonok, pipák, szürkítés) a `style/` mappában található dokumentumok definiálják.
