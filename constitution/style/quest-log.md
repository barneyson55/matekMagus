---

title: "Quest Log – bal oldali modulnavigáció vizuális leírás"
description: "A MatekMester bal oldali Quest Logjának (modullista, lenyitható hierarchia, státusz-jelölések) vizuális és interakciós szabályai"

---

# Quest Log – bal oldali modulnavigáció (`style/quest-log.md`)

Ez a dokumentum a MatekMester **bal oldali Quest Log paneljének** vizuális és interakciós szabályait írja le.

Célja, hogy egységes, RPG/MMO hangulatú, mégis jól áttekinthető **modul-/témakör-navigációt** adjon:

* lenyitható **hierarchikus szerkezet** (Főtéma → Altéma → Témakör),
* **quest státuszok** vizuális jelzése (nem elfogadott / aktív / kimaxolt),
* konzisztens ikon-, szín- és tipográfiai rendszer,
* jól használható görgetés és sorkiemelés.

A leírás technológiától független, konkrét szín- és betűtípus döntéseket a `style-const.md` + skin leírások tartalmazzák.

---

## 1. Alap elrendezés – bal oldali sáv

A Quest Log egy **bal oldali, függőleges sávban** helyezkedik el, amely:

* az App Shell teljes magasságát kitölti (a felső HUD alatt),
* szélessége fix, skinfüggetlen **alap-százalékos tartományba** esik (pl. ~18–22%),
* elrejthető / megjeleníthető a felső fejléc bal oldalán lévő **hamburger gombbal**.

Alap layout (logikai szinten):

```text
┌─────────────────────┬──────────────────────────────────────────────┐
│  QUEST LOG          │  Modul tartalom (modulnézet, karakterlap…)  │
│  (bal oldali sáv)   │                                              │
└─────────────────────┴──────────────────────────────────────────────┘
```

### 1.1. Háttér és elválasztás

* A Quest Log háttere **vizuálisan elkülönül** a fő tartalomtól (világosabb/sötétebb panel).
* A jobb szélén **diszkrét elválasztó vonal / árnyék** jelzi a határt.
* A sáv skinezhető (pergamen / futurisztikus panel / galaktikus keret / stb.), de a **funkció azonos** marad.

---

## 2. Hierarchia – Főtéma / Altéma / Témakör

A Quest Log elemei **hierarchikusan jelennek meg**:

1. **Főtémák** (pl. „9. évfolyam – Halmazelmélet blokk”)
2. **Altémák** (pl. „Halmazelmélet alapjai”, „Logikai alapok”) – a főtémakör alatt
3. **Témakörök** (pl. „Halmazműveletek”) – az adott altéma alatt

A hierarchia **összecsukható / lenyitható**, hogy elkerüljük a „végtelen scroll” jelenséget.

### 2.1. Lenyíló nyíl (accordion viselkedés)

Minden olyan elemnél, amelynek **alárendelt gyerekelemei** vannak (Főtéma, Altéma):

* a sor elején **nyíl ikon** jelenik meg:

  * **jobbra mutató nyíl**: az ág jelenleg össze van csukva,
  * **lefelé mutató nyíl**: az ág lenyitott, az alárendelt elemek látszanak.
* a nyíl (és a sor) kattintására:

  * a nyíl állapota vált (jobbra ↔ lefelé),
  * az alárendelt lista megnyílik / elrejtődik.

Sematikus példa:

```text
▶  9. évfolyam – Főtémakör A
   ▶  Altéma A1
      •  Témakör A1.1 – Halmazműveletek
      •  Témakör A1.2 – Műveletek gyakorlása
   ▶  Altéma A2
▶  10. évfolyam – Főtémakör B
```

Lenyitva:

```text
▼  9. évfolyam – Főtémakör A
   ▼  Altéma A1
      •  Témakör A1.1 – Halmazműveletek
      •  Témakör A1.2 – Műveletek gyakorlása
   ▶  Altéma A2
▶  10. évfolyam – Főtémakör B
```

### 2.2. Behúzás és tipográfia

* A hierarchiaszintek **vizuális behúzással** jelöltek:

  * Főtéma: 0 px alap offset (a nyíl és ikon után).
  * Altéma: +1 behúzási szint.
  * Témakör: +2 behúzási szint.
* Tipográfiai különbségek:

  * Főtéma: nagyobb betű, félkövér cím stílus.
  * Altéma: közepes betű, enyhén kiemelt.
  * Témakör: normál szöveg, jól olvasható, rövidebb címek.

---

## 3. Quest státuszok – NOT_ACCEPTED / ACTIVE / COMPLETED

A Quest Logban minden **modul/témakör** „questként” jelenik meg, amelynek státuszát vizuálisan is jelezni kell.

Alap státuszok (lásd: `structure/module-lifecycle.md`):

1. `NOT_ACCEPTED` – még nem elfogadott küldetés
2. `ACTIVE` – aktív, folyamatban lévő küldetés
3. `COMPLETED` – kimaxolt (minden feltétel teljesült) küldetés

### 3.1. NOT_ACCEPTED – szürkített, inaktív quest

* Modul neve: **szürkített** betűszín, alacsonyabb kontraszt.
* Nincs mellette pipa vagy achievement ikon.
* Kattintható (megnyitható a modulnézet), de **még nincs elindítva a küldetés**.

Vizualizációs minta:

```text
▶  9. évfolyam – Főtémakör A
   ▶  Altéma A1
      •  Halmazműveletek            (szürkébb, NOT_ACCEPTED)
```

### 3.2. ACTIVE – normál, élő quest

* Modul neve: **normál színű**, teljes kontraszttal.
* Opcionálisan kis „aktív” jelölés (pl. apró pont / jelvény) a sor végén.
* Kattintásra a modulnézet nyílik meg.

```text
•  Halmazműveletek            (aktív szín, ACTIVE)
```

### 3.3. COMPLETED – kimaxolt, zöld pipával jelölt quest

* Modul neve: normál/élő szín.
* A sor **jobb szélén zöld pipa** (vagy egyértelmű pozitív ikon) jelenik meg.
* A modul továbbra is kattintható (tesztelés / gyakorlás folytatható),
  de vizuálisan látszik, hogy quest-szinten **„kész”**.

```text
•  Halmazműveletek            ✅
```

A státuszok **színkódolása** és pontos ikon-stílusa skinfüggő,
de a három állapot vizuálisan mindig jól megkülönböztethető.

---

## 4. Aktuális modul kiemelése

Amikor a tanuló éppen egy adott modulban dolgozik (pl. Halmazműveletek modulnézet megnyitva):

* a megfelelő **Témakör sor** a Quest Logban **kiemelést kap**.

Vizuális kiemelési elvek:

* háttércsík / highlight az adott sor mögött,
* nagyobb fényerő,
* opcionálisan egy vékony, színes bal oldali sáv.

Cél: a tanuló **egy pillantással lássa**, melyik modulban dolgozik jelenleg.

---

## 5. Görgetés és overflow

A Quest Log tartalma hosszabb lehet, mint a rendelkezésre álló függőleges tér.

Szabályok:

* A Quest Log panel **saját, függőleges görgetősávval** rendelkezik.
* A görgetősáv vizuálisan illeszkedik a skinhez (pl. vékony, diszkrét scroll bar).
* A felső fejléc (App Shell) és a fő tartalomterület **nem** gördül vele –
  csak a Quest Log listája mozog.

---

## 6. Ikonok és RPG/MMO hangulat

A Quest Log célja, hogy **MMO quest listaként** hasson, miközben megőrzi a tanulhatóságot.

Lehetséges vizuális motívumok:

* Főtéma ikon: pl. könyv, fejezet-pecsét, „világtérkép-jellegű” szimbólum.
* Altéma ikon: kisebb könyv / tekercs.
* Témakör ikon: golyó / bullet-stílusú jel.

Stílus:

* Visszafogott, nem túlzsúfolt – fontos, hogy a **szöveg olvasható maradjon**.
* Minden skin (pergamen, galaxis, futurisztikus, dark, stb.) a **saját motívumkészletével** díszítheti
  ezeket az ikonokat, a funkciók változtatása nélkül.

---

## 7. Interakciós minták

### 7.1. Modulra kattintás

* Kattintás egy Témakörre:

  * a fő tartalomterület **modulnézetre vált**,
  * a sor kiemelést kap,
  * az állapot (NOT_ACCEPTED / ACTIVE / COMPLETED) változhat, ha pl. `Küldetés elfogadása` történt.

### 7.2. Nyíl ikonra kattintás

* A nyíl kattintására **csak a lenyitás/összecsukás** történik.
* A modul/vonal sorára kattintva **navigáció** történik.

### 7.3. Quest státusz-változások vizuális feedbackje

* `NOT_ACCEPTED` → `ACTIVE`:

  * szürkített szöveg → normál színre vált,
  * opcionális rövid animáció (finom fel-fényesedés).

* `ACTIVE` → `COMPLETED`:

  * zöld pipa animáltan jelenhet meg,
  * rövid vizuális „quest completed” hatás (szolid, nem zavaró).

---

## 8. Kapcsolódás más style- és structure-dokumentumokhoz

A Quest Log vizuális terve az alábbi dokumentumokra épül:

* `structure/navigation-flow.md` – meghatározza, hogyan történik a navigáció modulnézetre,
  karakterlapra, stb.
* `structure/module-lifecycle.md` – definiálja a modul/quest státuszokat,
  amelyeket a Quest Log vizuálisan megjelenít.
* `style/app-shell.md` – rögzíti, hogyan viselkedik a Quest Log a felső fejléc és a fő tartalom mellett.
* `style-const.md` + skin dokumentumok – színeket, ikonstílusokat, tipográfiát adnak a fenti szerkezeti szabályokhoz.

---

## 9. Összegzés

A Quest Log a MatekMester **RPG-s navigációs központja**:

* bal oldali, fix sávban jeleníti meg a Főtémakör–Altéma–Témakör hierarchiát,
* lenyitható nyilakkal kezeli a struktúrát,
* vizuálisan egyértelműen jelzi, melyik modul:

  * még nem elfogadott,
  * aktív,
  * kimaxolt,
* kiemeli az aktuálisan használt modult,
* skinezhető, de minden skin ugyanazt a logikát követi.

Ez a dokumentum biztosítja, hogy a Quest Log **minden modul és skin esetén konzisztens** maradjon,
és egyszerre támogassa a tanulást és az RPG/MMO hangulatot.
