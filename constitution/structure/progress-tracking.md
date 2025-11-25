---

title: "Haladás- és állapotkövetés szerkezeti leírás"
description: "A MatekMester felhasználói haladásának, modulállapotainak és eredményeinek stílusfüggetlen, szerkezeti terve"
---------------------------------------------------------------------------------------------------------------------------

# Haladás- és állapotkövetés – szerkezeti leírás (`structure/progress-tracking.md`)

Ez a dokumentum a MatekMesterben tárolt **haladási és állapotadatok**
szerkezetét írja le **stílusfüggetlen, szerkezeti szinten**.

Célja, hogy egységes képet adjon arról, hogy:

* milyen **adatstruktúrák** szükségesek a tanuló haladásának követéséhez,
* hogyan tároljuk a **quest-állapotokat** (NOT_ACCEPTED / ACTIVE / COMPLETED),
* hogyan tároljuk a **teszteredményeket és legjobb jegyeket**,
* hogyan kapcsolódik mindez az **XP- és szintrendszerhez**,
* és hogyan jelenik meg ez az adatréteg a Quest Logban, modulnézetekben és a karakterlapon.

Nem foglalkozik konkrét technológiával (localStorage, backend API, stb.),
csak a **logikai adatszerkezettel és felelősségi körökkel**.

---

## 1. Fő entitások és szintek

A haladáskövetés logikailag **felhasználóhoz kötött**.

Minden felhasználóhoz tartozik egy **Progresszió állapot** (User Progress State), amely több rétegből áll:

1. **Globális szint- és XP-állapot**
2. **Quest- és modulállapotok** (főtéma / altéma / témakör)
3. **Teszt-eredmények és legjobb jegyek**
4. **Gyakorlás statisztikák**
5. **Achievement állapotok**

### 1.1. Globális szint- és XP-állapot

Kapcsolódik: `structure/xp-system.md`, App Shell felső fejléc, karakterlap jobb panel.

Fő mezők (logikai szinten):

* `totalXp` – a tanuló összegyűjtött XP-je.
* `level` – az aktuális szint sorszáma (pl. 5).
* `levelName` – az aktuális szint elnevezése (pl. `Halmazmágus Tanonc`).
* `xpToNextLevel` – mennyi XP hiányzik a következő szinthez.

Ezeket minden XP-event (teszt, gyakorlás, achievement) után frissítjük.

### 1.2. Quest- és modulállapotok

Kapcsolódik: `structure/module-lifecycle.md`, `structure/quest-log.md`.

A tananyag hierarchikus:

* főtéma → altéma → témakör.

Minden szinten **quest-állapotot** tárolunk:

* `status` ∈ { `NOT_ACCEPTED`, `ACTIVE`, `COMPLETED` }.

Logikai struktúra (vázlat):

* `mainTopics[]` – főtémák listája

  * `id`
  * `title`
  * `status` (quest állapot)
  * `subtopics[]` – altémák listája

    * `id`
    * `title`
    * `status`
    * `topics[]` – témakörök listája

      * `id`
      * `title`
      * `status`

A `status` mezők a moduléletciklus alapján változnak:

* `NOT_ACCEPTED` → `ACTIVE` akkor, amikor a tanuló elfogadja a küldetést
  vagy érdemben elkezd dolgozni az egységen.
* `ACTIVE` → `COMPLETED` akkor, amikor teljesülnek a kimaxolási feltételek.

### 1.3. Teszt-eredmények és legjobb jegyek

Kapcsolódik: `structure/module-view.md` (Teszt fül), `structure/module-lifecycle.md`.

Minden teszthez (témakör / altéma / főtéma) az alábbi alapadatokat tároljuk:

* egyedi azonosító (pl. `topicId`, `subtopicId`, `mainTopicId` + `testType`),
* **próbálkozási előzmények** listája,
* **legjobb elért jegy**.

#### 1.3.1. Témaköri tesztek – nehézségi szintekkel

Témakör szinten a tesztek több nehézségi szinten léteznek:

* `difficulty` ∈ { `easy`, `normal`, `hard` }.

Logikai struktúra:

* `topicResults[topicId].difficulties[difficulty]`:

  * `bestGrade` – legjobb jegy az adott nehézségen,
  * `attempts[]` – próbálkozási előzmények listája:

    * `timestamp`
    * `grade`
    * opcionálisan: `duration`, `correctCount`, `wrongCount`, stb.

A `bestGrade` mező alapján döntjük el:

* a témakör **nehézségi szinten** kimaxolt-e,
* modul-szinten mikor teljesülnek a kimaxolási feltételek.

#### 1.3.2. Altéma és főtéma tesztek – egy teszt, nehézség nélkül

Altéma és főtéma teszteknél nincs nehézségi bontás.

Logikai struktúra:

* `subtopicResults[subtopicId]`:

  * `bestGrade`
  * `attempts[]`

* `mainTopicResults[mainTopicId]`:

  * `bestGrade`
  * `attempts[]`

Ezek a mezők a témazáró és modulzáró tesztek **legjobb elért jegyét** tartják nyilván.

### 1.4. Gyakorlás statisztikák

Kapcsolódik: `structure/module-view.md` (Gyakorlás fül), `structure/xp-system.md`.

A gyakorlás célja elsősorban az **XP-szerzés** és készségfejlesztés, nem a kimaxolás.

Logikai szinten opcionálisan tárolhatjuk:

* összes helyes válasz gyakorlásban,
* nehézség szerinti bontást (pl. `practiceStats.easy.correctCount`),
* sorozatok (streak-ek) hosszát,
* legutóbbi gyakorlási időpontot.

Ezek az adatok segíthetik:

* az achievementek feltételeinek értelmezését,
* a karakterlap statisztika blokkot,
* adaptív nehézség későbbi bevezetését.

### 1.5. Achievement állapotok

Kapcsolódik: `structure/xp-system.md`, karakterlap jobb panel.

Minden achievementhez állapotot tárolunk:

* `achievementId`
* `isUnlocked` (bool)
* `unlockedAt` (időbélyeg)

Opcionálisan:

* `grantedXp` – az achievementhez tartozó egyszeri XP-jutalom.

Az achievement lista a karakterlapon jelenik meg,
és a haladás hosszú távú mérőszámát adja.

---

## 2. Állapotváltások – események és hatásuk

A haladáskövetés a rendszerben bekövetkező **eseményekre** reagál.

Néhány kulcsesemény és következménye:

### 2.1. Küldetés elfogadása

Esemény:

* a tanuló egy főtéma / altéma / témakör modulnézetében megnyomja a
  `Küldetés elfogadása` gombot.

Hatás:

* az adott egység `status` mezője `NOT_ACCEPTED` → `ACTIVE` értékre vált,
* a Quest Logban a név szürkítettből normál színűre vált.

### 2.2. Teszt beküldése és értékelése

Esemény:

* a tanuló kitölti és elküldi a Teszt fülön a feladatsort.

Hatás:

1. **Teszt eredmény rögzítése**:

   * új bejegyzés kerül az adott egység `attempts[]` listájába,
   * ha a jegy jobb, mint a korábbi `bestGrade`, frissül a `bestGrade`.

2. **Quest-állapot frissítése**:

   * ellenőrizzük, hogy az adott témakör / altéma / főtéma
     elérte-e a kimaxolás definícióját,
   * ha igen, az adott entitás `status` mezője `ACTIVE` → `COMPLETED` lesz.

3. **XP-event generálása**:

   * a teszteredmény alapján XP-jutalom számítódik (lásd: `xp-system.md`),
   * az XP hozzáadódik a `totalXp` mezőhöz,
   * szükség esetén szintlépés esemény is létrejön.

### 2.3. Gyakorlófeladat megoldása

Esemény:

* a tanuló a Gyakorlás fülön helyes választ ad egy kérdésre.

Hatás:

* XP-event generálása a kérdés nehézségi szintje alapján
  (1 / 2 / 3 XP, lásd: `xp-system.md`).
* a releváns gyakorlás statisztikák növelése (pl. `practiceStats.easy.correctCount++`).

A gyakorlás **nem módosítja közvetlenül** a `bestGrade` mezőket
és a quest `status` mezőket.

### 2.4. Achievement feloldása

Esemény:

* teljesül egy achievement feltétele (pl. első kimaxolt témakör).

Hatás:

* az adott `achievementId`-hez tartozó bejegyzés:

  * `isUnlocked = true`,
  * `unlockedAt = now`,
* opcionálisan XP-event generálása (bónusz XP),
* a karakterlap achievement listája frissül.

---

## 3. Megjelenítés és adatforrások kapcsolata

A haladás- és állapotadatok **több nézetet szolgálnak ki**.

### 3.1. App Shell felső fejléc

Felhasznált adatok:

* `totalXp`, `level`, `levelName`, `xpToNextLevel` (XP-sáv és szintnév).
* esetleges aktív buffok (külön logika, de ide kötve megjelenítés szinten).

A fejléc mindig a **legfrissebb globális állapotot** mutatja.

### 3.2. Quest Log

Felhasznált adatok:

* hierarchikus struktúra: `mainTopics[]` → `subtopics[]` → `topics[]`.
* minden elem `status` mezője.

A Quest Logban az állapot:

* vizuálisan jelenik meg (szürkítés, pipa, stb.),
* nem tárol külön adatot – csak a Progresszió állapot tükrözése.

### 3.3. Modulnézet

Felhasznált adatok:

* adott egység (főtéma / altéma / témakör) `status` mezője,
* releváns `bestGrade` értékek (pl. témakör nehézségi szintenként),
* Teszt fülön: előzmények (pl. legjobb jegy, utolsó jegy),
* Gyakorlás fülön: opcionális gyakorlás statisztikák.

A modulnézet a haladásadatok "lokális" nézete.

### 3.4. Karakterlap

Felhasznált adatok:

* globális XP, szint, szintnév,
* aggregált statisztikák (kimaxolt modulok száma, tesztek száma, stb.),
* achievement állapotok,
* `ACTIVE` és `COMPLETED` egységek listája.

A karakterlap a haladásadatok "globális" nézete.

---

## 4. Perzisztencia – általános elv

Ez a dokumentum **nem írja elő**, hogy az adatokat hol és hogyan tároljuk (frontend localStorage, backend adatbázis, stb.).

Általános elvek:

* a Progresszió állapot **felhasználóhoz kötötten** tárolódik,
* a rendszer indulásakor beolvasható (pl. betöltés backendről / helyi tárolóból),
* minden releváns esemény (teszt, gyakorlás, achievement) után
  frissül és mentésre kerül.

A konkrét perzisztencia-megoldást egy külön technikai dokumentum részletezheti;
itt csak az adatszerkezet és a felelősségi körök vannak rögzítve.

---

## 5. Kapcsolódás más szerkezeti dokumentumokhoz

A haladás- és állapotkövetés az alábbi dokumentumokkal együtt ad teljes képet:

* `structure/module-lifecycle.md` – meghatározza a quest-állapotok definícióját és a kimaxolási feltételeket.
* `structure/quest-log.md` – leírja, hogyan jelennek meg az állapotok a bal oldali navigációban.
* `structure/module-view.md` – a Teszt és Gyakorlás fülek az itt leírt adatszerkezeteket használják.
* `structure/xp-system.md` – definiálja, hogyan generálódnak XP-eventek a tesztekből, gyakorlásból, achievementekből.
* `structure/character-sheet.md` – a haladásadatok globális összképét mutatja a felhasználónak.
* `structure/navigation-flow.md` – meghatározza, milyen események váltják ki az állapotváltozásokat.

Ezek együtt adják a MatekMester haladás- és állapotkövetésének **stílusfüggetlen szerkezeti tervét**, amelyre
később ráépülhet a konkrét implementáció (JavaScript logika, perzisztencia, backend API-k).
