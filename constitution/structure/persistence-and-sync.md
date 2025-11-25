---

title: "Perzisztencia és szinkronizáció szerkezeti leírás"
description: "A MatekMester haladásadatainak tárolási és szinkronizációs elvei, technológiától független szerkezeti szinten"
----------------------------------------------------------------------------------------------------------------------------

# Perzisztencia és szinkronizáció – szerkezeti leírás (`structure/persistence-and-sync.md`)

Ez a dokumentum a MatekMesterben használt **haladás-, állapot- és beállítás-adatok**
**tárolási** és **szinkronizációs** elveit írja le **stílusfüggetlen, szerkezeti szinten**.

Nem dönt arról, hogy az adatok konkrétan:

* localStorage-ben,
* fájlban,
* backend adatbázisban vagy
* felhőszolgáltatásban

kerülnek eltárolásra – kizárólag a **logikai rétegek**, **felelősségi körök** és
**szinkronizációs elvek** szintjén fogalmaz.

---

## 1. Adatkategóriák

A MatekMesterben három fő adatcsoport különíthető el:

1. **Felhasználói haladás és állapot**
2. **UI- és skin-beállítások**
3. **Statikus tananyag metaadatok**

### 1.1. Felhasználói haladás és állapot

Kapcsolódik: `structure/progress-tracking.md`, `structure/xp-system.md`, `structure/module-lifecycle.md`.

Ide tartozik minden olyan adat, ami a tanuló **egyéni előrehaladását** írja le:

* `totalXp`, `level`, `levelName`, `xpToNextLevel`
* quest-állapotok: `status` mezők (NOT_ACCEPTED / ACTIVE / COMPLETED)
  főtéma / altéma / témakör szinten
* teszteredmények:

  * bestGrade értékek (témakör + nehézség, altéma, főtéma)
  * próbálkozási előzmények (attempts)
* gyakorlás statisztikák (opc.):

  * helyes válaszok száma nehézség szerint
  * streak-ek
* achievement állapotok:

  * `isUnlocked`, `unlockedAt`, opcionálisan `grantedXp`

Ezek az adatok **felhasználó-specifikusak**, és perzisztensen tárolandók,
hogy a tanuló visszatérve is ugyanonnan folytathassa.

### 1.2. UI- és skin-beállítások

Kapcsolódik: `structure/settings-overlay.md`, `style/` dokumentumok.

Ide tartoznak:

* kiválasztott skin / téma (pl. Pergamen, Galaxis, Dark, stb.),
* testreszabott színek (pl. egyéni háttérszín, kiemelés színei),
* betűméret, kontrasztbeállítások,
* hang- és visszajelzés-beállítások,
* játékélmény / segítség kapcsolók (tippek megjelenítése, alapértelmezett nehézség, stb.),
* avatar választás / feltöltés.

Ezek az adatok

* szintén **felhasználóhoz kötöttek**,
* de **nem befolyásolják az XP-t vagy jegyeket**, csupán a megjelenést és UX-et.

### 1.3. Statikus tananyag metaadatok

Kapcsolódik: `constitution/`, curriculum leírások.

Ide tartozik minden olyan információ, ami **nem felhasználó-specifikus**:

* modulok, főtémák, altémák, témakörök struktúrája (címek, leírások, hierarchia),
* kérdés-sablonok (Practice Engine template-ek metaadatai),
* XP- és szintrendszer konfiguráció (szinttáblázat, alap XP értékek),
* fix tartalmak az Elmélet és Vizuális modell füleken.

Ezek az adatok **nem igényelnek perzisztenciát felhasználói szinten**,
tipikusan az alkalmazás statikus részét képezik.

---

## 2. Rétegek és felelősségi körök

Szerkezeti szinten két fő réteg különíthető el:

1. **Alkalmazás logikai réteg** – XP-számítás, quest-állapotok, gyakorló motor, stb.
2. **Perzisztencia réteg** – a logikai állapot mentése és visszatöltése.

### 2.1. Alkalmazás logikai réteg

A logikai réteg felelőssége:

* haladás- és állapotmodell karbantartása (lásd: `progress-tracking.md`),
* XP- és szintszámítás (lásd: `xp-system.md`),
* quest-állapotok változtatása (lásd: `module-lifecycle.md`),
* gyakorló motor működtetése (lásd: `practice-engine.md`).

Fontos elv:

> A logikai réteg **nem függ** a perzisztencia konkrét megvalósításától.

Azaz a logika úgy viselkedik, mintha egy memóriában lévő `userProgressState` objektumot
kezelne, és a változásokat események formájában jelenti.

### 2.2. Perzisztencia réteg

A perzisztencia réteg felelőssége:

* a `userProgressState` és a UI/skin-beállítások **mentése**,
* indításkor ezek **visszatöltése**, és a logikai réteg felé átadása,
* (később) backend / felhő irányú **szinkronizáció kezelése**.

A perzisztencia réteg fogadja:

* a logikai réteg által generált **"state changed" eseményeket** (pl. XP nőtt, teszt eredmény született, achievement feloldva),
* és ezek alapján frissíti a tartós tárolót.

---

## 3. Mentési stratégia

### 3.1. Esemény-alapú mentés

Alapelv:

> minden jelentős állapotváltozás után a rendszer **menti** a releváns adatokat.

Jelentős állapotváltozások például:

* teszt befejezése és értékelése,
* gyakorló kérdés helyes megoldása (XP-event),
* achievement feloldása,
* quest-állapot váltása (`NOT_ACCEPTED` → `ACTIVE` → `COMPLETED`),
* beállítások módosítása és **Mentés** gomb megnyomása.

Ezek az események kiváltanak egy

* `saveProgress(userProgressState)`
* vagy `saveSettings(userSettings)`

jellegű hívást a perzisztencia réteg felé.

### 3.2. Időzített (debounce-olt) mentés

A túl gyakori mentés elkerülése érdekében a perzisztencia réteg
alkalmazhat **debounce / throttling** elvet:

* több gyors egymás utáni eseményt egy mentési műveletbe von össze,
* pl. max. 1 mentés / X másodperc,
* vagy bizonyos események (pl. szintlépés) azonnali mentést váltanak ki.

A konkrét implementáció technikai döntés; szerkezeti szinten csak az elv rögzül.

---

## 4. Szinkronizáció – lokális és távoli állapot

Későbbi bővítés esetén a rendszer támogathatja:

* több eszközről való bejelentkezést,
* online/offline módot,
* felhőbe mentett haladást.

### 4.1. Lokális első (offline-first) elv

Javasolt szerkezeti elv:

* a **lokális állapot** mindig meglévő, konzisztens forrás,
* a felhasználó offline is tud gyakorolni, tesztet írni,
* a haladás lokálisan mentésre kerül,
* ha később elérhető a backend / felhő, akkor kerül sor a **szinkronizációra**.

Ez biztosítja, hogy a MatekMester **nem válik használhatatlanná** hálózat nélkül.

### 4.2. Szinkronizációs modell (vázlat)

Ha bevezetésre kerül egy backend:

* a kliens oldalon tárolt `userProgressState` és beállítások
  **verziószámmal** vagy **időbélyeggel** rendelkezhetnek,
* a kliens a backend felé **eseménylistát** is küldhet
  (pl. "teszt X eredmény Y", "XP nőtt Z-vel"),
* a backend:

  * feldolgozza az eseményeket,
  * frissíti a szerveroldali állapotot,
  * visszaküldheti az **összevont, autoritatív állapotot**.

Konfliktuskezelés (ha több eszközről is használják):

* egyszerű esetben **"last write wins"** elvet lehet alkalmazni,
* fejlettebb esetben **event-sor alapú** megoldás is bevezethető,
* szerkezeti szinten a dokumentum csak azt rögzíti, hogy
  a kliens és szerver között lehet **irányított szinkronizáció**.

### 4.3. Részleges szinkronizáció

Nem feltétlenül szükséges minden adatot mindig szinkronizálni.

Példák:

* a statikus tananyag-metaadatok nem szorulnak szinkronizációra,
* a beállítások (skin, UI) és haladásadatok viszont igen.

---

## 5. Adatkonzisztencia és integritás

Szerkezeti elv:

* a **haladásadatok** (XP, jegyek, quest-állapotok) legyenek
  **konzisztens kapcsolatban** egymással.

Példák:

* ha egy témakör `bestGrade` értéke eléri a maximumot
  minden nehézségi szinten, akkor ennek tükröződnie kell a
  modul `COMPLETED` státuszában (lásd: `module-lifecycle.md`).
* ha egy modul `COMPLETED` státuszba kerül,
  azt a Quest Log, a karakterlap és bármely más nézet
  **ugyanazon tárolt állapot alapján** kell, hogy lássa.

A perzisztencia réteg feladata:

* az állapot **atomi mentése**,
* úgy, hogy részleges írás ne hagyhasson következetlen állapotot
  (pl. XP frissül, de a `bestGrade` nem).

---

## 6. Adatvédelmi és jogosultsági szempontok (szerkezeti szinten)

Ez a dokumentum nem jogi leírás, de szerkezeti elveket rögzíthet:

* a felhasználói haladás- és beállításadatok **felhasználónként elszeparáltan** tárolandók,
* egy tanuló csak a **saját** haladását látja és módosíthatja,
* ha bevezetésre kerül tanári / admin nézet,
  annak jogosultságkezelését külön dokumentum részletezi.

---

## 7. Kapcsolódás más szerkezeti dokumentumokhoz

A perzisztencia és szinkronizáció az alábbi dokumentumokra épít:

* `structure/progress-tracking.md` – definiálja a tárolandó haladás- és állapotadatok
  logikai szerkezetét.
* `structure/xp-system.md` – leírja, hogyan változik az XP és a szint
  különböző események hatására.
* `structure/module-lifecycle.md` – meghatározza, milyen quest-állapotokat
  kell tartósan követni.
* `structure/practice-engine.md` – a gyakorló motor XP-eventjei szintén
  perzisztens módon kerülnek tárolásra.
* `structure/settings-overlay.md` – a skin és UI-beállítások perzisztens tárolásához
  ad logikai kontextust.
* `structure/app-shell.md` – a felső fejlécben és Quest Logban látható állapotok
  a persistált user progress állapotból származnak.

Ezek együtt adják a MatekMester **perzisztencia- és szinkronizációs rétegének**
stílusfüggetlen szerkezeti tervét, amelyre később konkrét technikai megoldások
(JS storage, backend API-k, adatbázis) építhetők.
