---

title: "Quest Log (bal oldali modulnavigáció) szerkezeti leírás"
description: "A MatekMester bal oldali Quest Log / modulnavigáció stílusfüggetlen szerkezeti terve"

---

# Quest Log – szerkezeti leírás (`structure/quest-log.md`)

Ez a dokumentum a MatekMester **Quest Log** (bal oldali modulnavigációs sáv)
**szerkezetét és működését** írja le stílusfüggetlen, szerkezeti szinten.

A Quest Log célja, hogy:

* modul- és tananyagszinten jelenítse meg a **küldetéslistát**,
* jelezze a főtéma / altéma / témakör egységek **állapotát** (`NOT_ACCEPTED` / `ACTIVE` / `COMPLETED`),
* kiindulási pont legyen a modulnézetekhez,
* illeszkedjen a felső fejlécben látható globális szint- és XP-rendszerhez.

Nem foglalkozik konkrét vizuális stílussal (szín, ikon, betűtípus),
csak azzal, hogy **milyen elemek vannak**, **mit jelent az állapotuk**, és **hogyan viselkednek**.

---

## 1. Elhelyezkedés az App Shell-ben

A Quest Log az App Shell bal oldalán található, a fő tartalomterület mellett.

* A Quest Log egy **függőleges panel**, amely:
  * tananyagegységeket (főtéma / altéma / témakör) listáz,
  * azok állapotát jeleníti meg,
  * kattintható elemeket tartalmaz a modulnézetekre / tesztekre navigáláshoz.
* A panel **láthatósága** a felső fejlécben lévő **hamburger gombbal** kapcsolható:
  * látható állapot: a Quest Log panel bal oldalon, a fő tartalomterület jobbra mellette,
  * rejtett állapot: a fő tartalomterület kitölti a teljes szélességet, a Quest Log panel nem látható.

A Quest Log elrejtése / megjelenítése **nem változtatja meg** a modulok állapotát,
csak az elrendezést.

---

## 2. Listázott elemek és hierarchia – főtéma / altéma / témakör

A Quest Log tartalmát hierarchikusan strukturáljuk, hogy elkerüljük az „órás görgetést”:

* **1. szint – Főtéma**
* **2. szint – Altéma** (a főtémához tartozó altémák)
* **3. szint – Témakör** (az altémához tartozó témakörök)

Mindhárom szint **quest-szerű entitásként** szerepel:

* van saját állapotuk (`NOT_ACCEPTED` / `ACTIVE` / `COMPLETED`),
* önállóan kattinthatók,
* külön nézetet / tesztet / modulnézetet nyithatnak meg.

### 2.1. Főtéma szint (1. szint – „gyökér”)

A Quest Log **felső szintjén** alapértelmezetten a **főtémák** listája látható.

Minden főtéma sor tartalmaz:

* **lenyitó nyíl ikont**:
  * alapértelmezetten **jobbra mutat** (►) → a főtéma **zárt**, altémák rejtve,
  * kattintás után **lefelé mutat** (▼) → a főtéma **nyitott**, alatta megjelennek az altémák.
* főtéma név (pl. „9. évfolyam – Halmazműveletek és logika”),
* állapotjelzést:
  * `NOT_ACCEPTED` / `ACTIVE` / `COMPLETED` (kimaxolt), a `structure/module-lifecycle.md` logikája szerint.

A főtéma sorára kattintva:

* a fő tartalomterület **főtémához tartozó modulnézetre / összefoglaló nézetre** válthat,
* a lenyitó nyílra kattintva az altémák jelennek meg / tűnnek el.

### 2.2. Altéma szint (2. szint – főtéma gyerekei)

Ha egy főtéma **lenyitott** állapotban van (nyíl lefelé mutat), alatta **behúzva** megjelennek a hozzá tartozó **altémák**.

Minden altéma sor tartalmaz:

* saját **lenyitó nyíl ikont**:
  * alapértelmezetten jobbra mutat (►) → az altémához tartozó témakörök rejtve,
  * kattintva lefelé mutat (▼) → a témakörök megjelennek az altéma alatt.
* altéma név (pl. „Halmazműveletek alapjai”),
* állapotjelzést az altémára vonatkozóan:
  * `NOT_ACCEPTED` – még nincs altéma-tesztpróba,
  * `ACTIVE` – van altéma-tesztpróba, de nem minden nehézségi szinten max a jegy,
  * `COMPLETED` – az altéma-tesztből minden nehézségi szinten max (pl. 5-ös) jegyet ért el.

Az altéma sorára kattintva:

* a fő tartalomterület az **altémához tartozó modulnézetre / tesztoldalra** vált,
* a lenyitó nyílra kattintva a kapcsolódó **témakörök** jelennek meg / tűnnek el.

### 2.3. Témakör szint (3. szint – altéma gyerekei)

Ha egy altéma lenyitott, alatta **behúzva** megjelennek a hozzá tartozó **témakörök**.

Minden témakör sor tartalmaz:

* témakör nevet (pl. „Halmazok uniója és metszete”),
* állapotjelzést:
  * `NOT_ACCEPTED` – még nem írt tesztet a témakörből,
  * `ACTIVE` – írt tesztet, de még nincs minden nehézségi szinten max jegye,
  * `COMPLETED` – a témakör összes nehézségi szintjén max jegyet ért el.

A témakör sorára kattintva:

* a fő tartalomterület az adott **témakör modulnézetének** (pl. Halmazműveletek modul megfelelő része) Teszt / Gyakorlás / Elmélet nézetére válthat (a `structure/module-view.md` szerint).

### 2.4. Görgetés csökkentése lenyithatósággal

A hierarchia és lenyitható nyilak célja:

* elkerülni, hogy **minden főtéma + altéma + témakör egyszerre legyen listázva**, ami túl hosszú görgetést eredményezne;
* biztosítani, hogy a tanuló **csak az aktuálisan releváns részeket nyissa ki**:

  * alapállapot: csak **főtémák** látszanak,
  * a tanuló lenyitja az aktuális főtémát → megjelennek az altémák,
  * egy altéma lenyitásával jelennek meg a hozzá tartozó témakörök.

A lenyitás/zárás állapotokat a rendszer opcionálisan:

* megjegyezheti (utolsó állapot per felhasználó),
* vagy minden új belépéskor alapállapotra (csak főtémák) állíthatja vissza – ez későbbi UX-döntés kérdése.

---

## 3. Modul / quest állapotok megjelenítése a Quest Logban

A Quest Log minden hierarchikus elemre (főtéma, altéma, témakör) ugyanazt a **quest-állapot modellt** használja:

1. `NOT_ACCEPTED` – **még nem elfogadott küldetés**
2. `ACTIVE` – **felvett, folyamatban lévő küldetés**
3. `COMPLETED` – **kimaxolt küldetés**

> Megjegyzés: a `structure/module-lifecycle.md` dokumentumban a „modul” fogalom
> **általánosított quest-entitásként** értendő: ugyanez a három állapot
> alkalmazható főtéma / altéma / témakör szinten is.

### 3.1. NOT_ACCEPTED – még nem elfogadott egység

Jellemzők:

* Az adott főtéma / altéma / témakör **alapértelmezett állapota** a tanuló számára.
* A Quest Log listában az elem:

  * szürkítetten / halványabban jelenik meg (stílus a `style/` alatt definiálandó),
  * nem tartozik hozzá pipa vagy kimaxolás-jelzés.

* Rákattintva:
  * a fő tartalomterület az adott egység modulnézetére vált,
  * a modulnézet tetején megjelenhet a `Küldetés elfogadása` gomb,
    ha az adott egységet expliciten „questként” kell felvenni.

### 3.2. ACTIVE – felvett, folyamatban lévő egység

Jellemzők:

* Az egység akkor `ACTIVE`, ha a tanuló **elfogadta a küldetést** (pl. `Küldetés elfogadása` gombbal)
  és / vagy már elkezdett benne teszteket írni / gyakorolni.
* A Quest Log listában az elem:

  * normál / élő színnel jelenik meg,
  * még nincs mellette kimaxolás-jelzés (pipa).

* Rákattintva:
  * a fő tartalomterület a megfelelő modulnézetre vált,
  * a megfelelő fül (Elmélet / Teszt / Gyakorlás) elérhető.

### 3.3. COMPLETED – kimaxolt egység

Jellemzők:

* `COMPLETED` állapot akkor jön létre, ha a `structure/module-lifecycle.md`-ben
  definiált **kimaxolási feltételek** az adott szinten teljesülnek:
  * témakör: minden nehézségi szinten max jegy,
  * altéma: altéma-teszt minden nehézségi szinten max jegy,
  * főtéma: modulzáró max jegy + alárendelt egységek teljesítése.
* A Quest Log listában az elem:

  * normál / élő színnel jelenik meg,
  * egyértelmű **pozitív jelzést** (pl. zöld pipa) kap a neve mellett.

* Rákattintva:
  * az egység továbbra is **teljesen interaktív** (újratesztelés, gyakorlás),
  * a pipa csak azt jelzi, hogy **quest-szinten kimaxolt**.

---

## 4. Interakciók – kattintás, fókusz, navigáció

A Quest Log listaelemei **interaktívak**, a hierarchia minden szintjén.

### 4.1. Elemre kattintás (főtéma / altéma / témakör)

1. A felhasználó egy sorra kattint (bármely szinten).
2. A fő tartalomterület az adott egység **modulnézetére** vált (`structure/module-view.md` szerint):
   * főtéma: főtéma-összefoglaló / modulzáró nézet,
   * altéma: altéma-teszt / elmélet nézet,
   * témakör: konkrét Elmélet / Teszt / Gyakorlás nézet az adott témakörben.
3. A megfelelő modulnézetben:
   * látható az egység címe,
   * állapottól függően megjelenik vagy eltűnik a `Küldetés elfogadása` gomb,
   * hozzáférhetők a modulfülek (Elmélet / Vizuális modell / Teszt / Gyakorlás).

### 4.2. Lenyitó nyílra kattintás

* Főtéma sor lenyitó nyila:
  * zárt állapot (►) → kattintásra lenyílik (▼), az altémák láthatóvá válnak,
  * nyitott állapot (▼) → kattintásra záródik (►), az altémák eltűnnek.
* Altéma sor lenyitó nyila:
  * zárt állapot (►) → kattintásra lenyílik (▼), a témakörök láthatóvá válnak,
  * nyitott állapot (▼) → kattintásra záródik (►), a témakörök eltűnnek.

A lenyitó nyíl **kifejezetten a hierarchia megjelenítését** szabályozza,  
nem vált modulnézetet – azt a sor fő klikk-területe intézi.

### 4.3. Fókusz és kiemelés

Szerkezeti szinten:

* a **jelenleg megnyitott egység** (pl. aktuális témakör) sorát kiemelhetjük (más háttér, keret),
* a kiemelés segít a tanulónak vizuálisan azonosítani, hol jár a tananyagban,
* a tényleges stílust a `style/` mappa dokumentumai definiálják.

---

## 5. Quest Log és a moduléletciklus kapcsolata

A Quest Log a `structure/module-lifecycle.md` dokumentumban definiált
**quest / modul állapotokat** tükrözi vizuálisan a teljes hierarchiában:

* `NOT_ACCEPTED` egység → szürkített név, nincs pipa.
* `ACTIVE` egység → normál színű név, nincs pipa.
* `COMPLETED` egység → normál színű név + pipa (vagy más „kimaxolt” jelzés).

Állapotváltási események például:

1. `NOT_ACCEPTED` → `ACTIVE`:
   * kiváltó esemény: a tanuló megnyomja a modulnézetben a `Küldetés elfogadása` gombot,
     vagy első alkalommal tesztet ír az adott egységből.
   * hatás: a Quest Logban a név szürkítettből normál színűre vált.

2. `ACTIVE` → `COMPLETED`:
   * kiváltó esemény: a tanuló teljesíti az adott egységre vonatkozó kimaxolási feltételeket
     (max jegy, minden szinten, a `module-lifecycle.md` szabályai szerint).
   * hatás: a Quest Logban a név mellett megjelenik a kimaxolás-jelzés (pipa).

A Quest Log **nem tartalmazza** a részletes teszteredményeket vagy XP-adatokat;
ezeket a modulnézet és a karakterlap mutatja.

---

## 6. Kapcsolódás a karakterlaphoz és XP-rendszerhez

A Quest Log hierarchikus listája és a karakterlap szorosan együttműködik:

* a karakterlap **„Aktív küldetéseim”** füle az összes `ACTIVE` egységet (főtéma / altéma / témakör) listázhatja,
  amelyek a Quest Logban normál színnel jelennek meg;
* a karakterlap **„Eredményeim”** füle a `COMPLETED` egységekről részletesebb statisztikákat mutat,
  amelyeket a Quest Logban pipa jelöl;
* a gyakorlásból és tesztekből származó XP események
  a globális XP-szintet növelik (`structure/xp-system.md`),
  amelyet a felső fejléc XP-sávja és a karakterlap mutat.

A Quest Log ebben a rendszerben:

* **belépési pont** a tananyagegységekhez,
* **állapot-visszajelzés** főtéma / altéma / témakör szinten,
* míg a mélyebb eredményeket a modulnézet és a karakterlap részletezi.

---

## 7. Kapcsolódás más szerkezeti dokumentumokhoz

A Quest Log szerkezete az alábbi dokumentumokkal együtt ad teljes képet:

* `structure/app-shell.md` – meghatározza az App Shell elrendezését
  (bal oldali Quest Log + jobb oldali tartalom + felső fejléc).
* `structure/navigation-flow.md` – leírja, hogyan navigál a felhasználó a Quest Logból modulnézetre,
  és hogyan rejthető/elrejthető a panel.
* `structure/module-lifecycle.md` – definiálja a quest / modul állapotokat, amelyeket a Quest Log vizuálisan tükröz.
* `structure/module-view.md` – a Quest Logból elérhető modulnézet szerkezetét írja le.
* `structure/character-sheet.md` – a Quest Logban jelzett állapotok és eredmények a karakterlapon is visszaköszönnek.
* `structure/xp-system.md` – az XP-ből és szintekből fakadó globális előrehaladást rögzíti,
  amely a Quest Log által elérhető egységekből származik.

Ezek együtt adják a MatekMester Quest Logjának **stílusfüggetlen szerkezeti tervét**, amelyre
később a `style/` mappa dokumentumai építenek konkrét vizuális és interakciós megoldásokat.
