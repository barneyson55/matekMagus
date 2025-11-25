---

title: "Karakterlap (Character Sheet) szerkezeti leírás"
description: "A MatekMester karakterlap nézetének stílusfüggetlen, szerkezeti terve"
------------------------------------------------------------------------------------

# Karakterlap – szerkezeti leírás (`structure/character-sheet.md`)

Ez a dokumentum a MatekMester **karakterlap (Character Sheet)** nézetének
szerkezetét és működését írja le **stílusfüggetlen, szerkezeti szinten**.

A karakterlap célja, hogy:

* a tanuló **RPG-karaktereként** jelenítse meg a profilját,
* összefoglalja a **szintet, XP-t, achievementeket**,
* áttekinthetően mutassa az **aktív küldetéseket** és az **eddigi eredményeket**,
* kiindulási pont legyen a részletes modulnézetekhez.

Nem foglalkozik konkrét vizuális stílussal (színek, ikonok, betűtípusok),
csak azzal, hogy **milyen blokkok vannak**, **milyen adatot tartalmaznak**, és **hogyan kapcsolódnak**
az App Shell-hez, a Quest Loghoz és az XP-rendszerhez.

---

## 1. Elhelyezkedés az App Shell-ben

A karakterlap nézet az App Shell **fő tartalomterületén** jelenik meg.

* A felső fejléc (MatekMester, XP-sáv, avatar, buffok, hamburger) **látható marad**.
* A bal oldali Quest Log panel **látható marad** (ha a hamburger nincs rejtett állapotban).
* Csak a Quest Log melletti **jobb oldali fő tartomány** vált tartalmat:
  ott jelenik meg a karakterlap.

Belépés a karakterlapra:

* a felső fejléc jobb oldalán található **avatarra** vagy a **szintnév** melletti elemre kattintva
  (lásd: `structure/navigation-flow.md`).

Kilépés a karakterlapról:

* Quest Logban modulra kattintva,
* a karakterlapon belül lévő modul-linkekre kattintva,
* vagy bármilyen más navigációs eseménnyel, amely modulnézetre vált.

---

## 2. Fő elrendezés – bal és jobb panel

A karakterlap két fő hasábra bontható:

1. **Bal panel** – küldetés- és eredménylista fülekkel
2. **Jobb panel** – karakter-azonosság, szint, XP, achievementek

Sematikus vázlat:

```text
┌──────────────────────────────────────────────────────────────┐
│                 (App Shell felső fejléc)                     │
├───────────────┬──────────────────────────────────────────────┤
│ Quest Log     │  Karakterlap fő tartalom                     │
│ (bal panel)   │                                              │
│               │  ┌───────────────┬───────────────────────┐  │
│               │  │ BAL PANEL     │ JOBB PANEL            │  │
│               │  │ (fülek,       │ (avatar, szint, XP,  │  │
│               │  │  listák)      │  achievementek)       │  │
│               │  └───────────────┴───────────────────────┘  │
└───────────────┴──────────────────────────────────────────────┘
```

---

## 3. Jobb panel – karakter-azonosság, szint, XP, achievementek

A jobb panel a tanuló "karakterkártyája":

### 3.1. Karakter fejléc

Fő elemek:

* **Avatar kép**

  * a tanuló által választott / feltöltött vagy előre definiált avatar,
  * az avatar a Beállítások overlay (Skin & Téma) egyik beállítása is lehet.

* **Szintnév és Level**

  * pl. `Lv. 5 – Halmazmágus Tanonc`,
  * a szintnév és szintszám a `structure/xp-system.md` által definiált szinttáblázatból származik.

* **Összesített XP & következő szintig hátralévő XP**

  * pl. `Összes XP: 1240`,
  * `Következő szintig: 60 XP`,
  * az értékek a globális XP-számlálóból jönnek.

Ezek az adatok konzisztensen megegyeznek a felső fejlécben
látható XP-sáv és szint-információival.

### 3.2. Szintprogressz és statisztikák blokk

A jobb panelen helyet kap egy **rövid statisztika blokk**, amely szerkezetileg tartalmazhatja:

* Szintek gyors áttekintése (pl. `Aktuális szint: Lv. 5`).
* Kimaxolt modulok száma (pl. `Kimaxolt modulok: 3`).
* Aktív küldetések száma (pl. `Aktív küldetések: 4`).
* Összesen elvégzett tesztek száma.
* Összes helyes gyakorlófeladat.

A pontos mutatók köre a későbbi game design döntéseitől függ,
de szerkezetileg itt kapnak helyet a **globális összefoglaló statisztikák**.

### 3.3. Achievement lista

A jobb panel alsó részén egy **görgethető achievement lista** helyezkedik el.

Jellemzők:

* minden achievement:

  * neve (pl. `Első kimaxolt témakör`),
  * rövid leírása,
  * megszerzés időpontja,
  * opcionális piktogram / jelvény (vizuális részletek a `style/` alatt).
* a lista időrendben vagy kategóriánként csoportosítva jelenhet meg
  (pl. "XP achievementek", "Teszt achievementek", "Modul achievementek").
* minden achievement egyszer szerezhető meg
  (idempotens, lásd: `structure/xp-system.md`).

Az achievement lista kapcsolatban áll az XP-rendszerrel:

* egy achievement megszerzése külön XP-event lehet,
* a lista a tanuló hosszú távú előrehaladását mutatja.

---

## 4. Bal panel – Aktív küldetések és Eredményeim fülek

A bal panel a karakterlap saját "mini-Quest Logja" két fő füllel:

1. **Aktív küldetéseim** – az összes `ACTIVE` állapotú egység
2. **Eredményeim** – a `COMPLETED` egységek és fontosabb teszteredmények

### 4.1. Fülrendszer

A bal panel tetején két fül található:

* `Aktív küldetéseim`
* `Eredményeim`

A fülváltás **csak a karakterlap bal panelén lévő listát** változtatja;

* a jobb panel (avatar, XP, achievementek) változatlan marad,
* az App Shell (fejléc, Quest Log) változatlan marad.

### 4.2. Aktív küldetéseim

Ez a fül listázza az összes olyan egységet, amely `ACTIVE` állapotban van,
a `structure/module-lifecycle.md` szerint.

Listázható egységek:

* főtéma szintű aktív küldetések,
* altéma szintű aktív küldetések,
* témakör szintű aktív küldetések.

Szerkezeti elv:

* a lista követheti a `structure/quest-log.md` hierarchiáját
  (főtéma → altéma → témakör),
* vagy lapos, szűrhető listaként is megjelenhet
  (pl. állapot, tantárgy, nehézség szerint szűrve).

Interakció:

* egy listaelementre kattintva a fő tartalomterület az adott egység
  **modulnézetére** vált (Elmélet / Teszt / Gyakorlás fülekkel),
* a lista csak "shortcut"; az állapotokat továbbra is a modulnézet és tesztek határozzák meg.

### 4.3. Eredményeim

Ez a fül mutatja a tanuló **befejezett és részben befejezett** eredményeit.

Lehetséges tartalmak:

* `COMPLETED` (kimaxolt) modulok listája:

  * modulnév,
  * mikor lett kimaxolva,
  * rövid összefoglaló (pl. "Minden témakör max jeggyel"),
  * kattintásra a modulnézetre ugrik.

* Témakör-szintű eredmények:

  * témakör neve,
  * nehézségi szintek legjobb jegye (pl. `könnyű: 5`, `közepes: 4`, `nehéz: 5`),
  * kattintásra az adott témakör Teszt vagy Eredmény-alnézetére ugrik.

* Altéma és főtéma tesztek eredményei:

  * altéma / főtéma neve,
  * elért jegy (pl. `Témazáró: 5`),
  * próbálkozások száma.

A lista lehet:

* időrendben rendezett (legutóbbi eredmények felül),
* vagy struktúrált (először kimaxolt modulok, aztán részben teljesítettek).

Interakció:

* egy listaelementre kattintva a fő tartalomterület a megfelelő modulnézetre vagy
  részletes eredmény oldalra vált.

---

## 5. Kapcsolódás az XP- és szintrendszerhez

A karakterlap a `structure/xp-system.md` által leírt XP- és szintrendszer
**fő megjelenítési helye**.

Kapcsolódások:

* a jobb panel mutatja az **aktuális szintet**, szintnevet és össz-XP-t;
* a statisztika blokk a hosszú távú haladást (kimaxolt modulok, tesztek száma) mutatja;
* az achievement lista az XP-hez kötődő különleges mérföldköveket jeleníti meg;
* minden XP-változás után a karakterlapon látható értékek
  (szint, XP, következő szintig szükséges XP) frissülnek.

A karakterlap **nem változtatja meg** az XP-t önmagában,
csak megjeleníti a különböző forrásokból (Gyakorlás, Teszt, achievement) származó értékeket.

---

## 6. Kapcsolódás a Quest Loghoz és modulnézetekhez

A karakterlap és a Quest Log együtt adják a tanuló haladásának strukturált képét.

* A Quest Log a bal oldalon, hierarchikusan mutatja az egységeket
  (főtéma / altéma / témakör) és azok quest-állapotát.
* A karakterlap bal panelje szűrt / összegzett formában mutatja ugyanezeket
  **Aktív küldetések** és **Eredményeim** bontásban.
* A karakterlap listáiban lévő egységekre kattintva
  a fő tartalomterület az adott **modulnézetre** vált
  (lásd: `structure/module-view.md`).

Így a tanuló:

* a Quest Logból "világtérkép"-szerűen látja az összes elérhető modult,
* a karakterlapról pedig a **saját útját, eredményeit és aktív küldetéseit**.

---

## 7. Kapcsolódás más szerkezeti dokumentumokhoz

A karakterlap szerkezete az alábbi dokumentumokkal együtt ad teljes képet:

* `structure/app-shell.md` – meghatározza az App Shell keretét, amelybe a karakterlap illeszkedik.
* `structure/navigation-flow.md` – leírja, hogyan jut a tanuló az avatarra kattintva a karakterlapra, és hogyan térhet vissza a modulnézetekbe.
* `structure/module-lifecycle.md` – definiálja azokat a quest-állapotokat, amelyek a karakterlap listáiban (Aktív küldetéseim / Eredményeim) is megjelennek.
* `structure/module-view.md` – a karakterlapról elérhető modulnézetek szerkezetét írja le.
* `structure/quest-log.md` – a bal oldali Quest Log és a karakterlap bal panelje között logikai kapcsolat van (ugyanazokra az entitásokra épülnek).
* `structure/xp-system.md` – a karakterlap jobb paneljén megjelenő XP- és szintinformációk forrása.

Ezek együtt adják a MatekMester karakterlapjának **stílusfüggetlen szerkezeti tervét**,
amelyre később a `style/` mappa dokumentumai építenek konkrét vizuális és interakciós megoldásokat.
