# XP rendszer – tervezési dokumentum

> Csak XP rendszer – itt nincs kód, ez egy stabil referencia, amire a későbbi implementáció és tesztelés épül.

## 1. Cél

- Motiváló, „MMO-s” érzésű fejlődési rendszer, ahol a diák pontosan érti, mit miért kap.
- Az XP **nem csak a teszt nehézségtől**, hanem az adott témakör / altéma / főtéma **saját nehézségétől** is függ.
- Minden teszt **csak egyszer** ad XP-t adott struktúra + nehézség kombinációra; ismétlés csak gyakorlás.

---

## 2. Tartalomszintek (struktúra)

Három szintet különböztetünk meg, ahogy az eredeti tervben:

| Szint | Név      | Példa                                | Fülök | Kérdések |
| ----- | -------- | ------------------------------------ | ----- | -------- |
| 3.    | Témakör  | `Halmazműveletek`                   | 3     | 10       |
| 2.    | Altéma   | `Gondolkodási módszerek, Halmazok`  | 2     | 15       |
| 1.    | Főtéma   | `Alapozó modulok`                   | 1     | 20       |

Egy teszt tehát mindig tudja magáról:

- melyik **szinthez** tartozik (`topicLevel`: tema / altema / fotema),
- melyik **konkrét egységhez** (`topicId`),
- milyen **nehézségű a teszt** (könnyu / kozepes / nehez).

---

## 3. Alap XP a nehézség szerint (feladatszinten)

Alap gondolat: a nehézség „súlyozza” a kérdéseket, de nem külön világ minden tantárgyra.

**Bázis:** 5 XP / kérdés egy „átlagos” (kozepes) tesztre.

Nehézség-szorzók:

- `konnyu`: 0.7  
- `kozepes`: 1.0  
- `nehez`: 1.4  

**Alap XP képlet (csak nehézség + kérdésszám):**

```text
baseXp(test) = 5 * kerdesSzam * difficultyMultiplier
```

Példák:

- Témakör (10 kérdés), konnyu → 5 * 10 * 0.7 = 35 XP  
- Altéma (15 kérdés), kozepes → 5 * 15 * 1.0 = 75 XP  
- Főtéma (20 kérdés), nehez → 5 * 20 * 1.4 = 140 XP  

Ez még nem veszi figyelembe, hogy egyes **témák önmagukban is nehezebbek**.

---

## 4. Témakör / altéma / főtéma nehézségi szorzók

Minden struktúra kap egy **relatív nehézségi súlyt**: `topicWeight`.

Skála (tárgy-specifikus, kézzel állítjuk be):

- 1.0 – alap / átlagos (pl. százalékszámítás alapjai)
- 1.2 – közepesen nehéz (pl. hatványozás, halmazműveletek)
- 1.4 – nehéz (pl. trigonometria, valószínűség emelt szinten)

Emellett a **szint** is súlyoz:

```text
tierMultiplier:
  tema (3. szint)    = 1.0
  altema (2. szint)  = 1.2
  fotema (1. szint)  = 1.5
```

Így egy modulzáró (főtéma, 1. szint) alapból többet ér, mint egy egyedi témakör-teszt.

---

## 5. Végső XP képlet egy tesztre

Paraméterek:

- `N` = kérdések száma (10 / 15 / 20 stb.)
- `Dmult` = difficultyMultiplier (konnyu / kozepes / nehez)
- `Tmult` = tierMultiplier (tema / altema / fotema)
- `Wtopic` = topicWeight (1.0–1.4)

```text
XP(test) = round( 5 * N * Dmult * Tmult * Wtopic )
```

**Csak első teljesítésre jár**, per `(topicId, difficulty)` kombináció, és csak ha a jegy >= 2.

Példa – Halmazműveletek (témakör):

- 10 kérdés, kozepes teszt
- `Tmult = 1.0` (tema)
- `Wtopic = 1.2` (kicsit nehezebb átlagosnál)

```text
XP = round(5 * 10 * 1.0 * 1.2) = 60 XP
```

Példa – Gondolkodási módszerek altéma témazáró:

- 15 kérdés, nehez teszt
- `Tmult = 1.2` (altema)
- `Wtopic = 1.2` (közepesen nehéz blokk)

```text
XP = round(5 * 15 * 1.4 * 1.2 * 1.2) ≈ 151 XP
```

---

## 6. Struktúra-szintű bónuszok

Ezek opcionális „fej-simogatások”, nem kötelező az első implementációban, de a cél az MMO-érzés.

### 6.1. Témakör-szintű bónusz

Ha egy **altémán belül** minden témakörön (3. szint) legalább egyszer teljesített a diák (bármilyen nehézségen, legalább jegy 2):

- `+100 XP` egyszeri jutalom az adott altémára.

### 6.2. Altéma-szintű bónusz

Ha egy **főtémán belül** minden altéma-témazáró megvan:

- `+200 XP` egyszeri jutalom a főtémára.

### 6.3. Emelt / nehéz blokkok

Később külön flag-et kaphatnak az emelt témák:

- plusz `+20%` XP a teljes modulra (szorzó: 1.2).

---

## 7. Viselkedés ismétléskor

- Ha a diák **ugyanazon tesztet** (ugyanaz a difficulty) többször kitölti, **nem kap új XP-t**.
- Ha sikerül **jobb jegyet** elérni ugyanazon nehézségen, akkor logikailag dönthetünk úgy, hogy:
  - vagy az XP változatlan (csak a jegy javul),  
  - vagy adunk egy kis „upgrade” bónuszt (pl. +10% a különbségért).
- Első implementáció: **csak az első sikeres teljesítés ad XP-t**, a többi csak gyakorlás.

---

## 8. Implementációs jegyzetek (későbbre)

Nem most kell, de a kód szempontjából:

- `progress.json`-ban érdemes tárolni:
  - `xp` (össz XP)
  - `completions[topicId][difficulty] = { grade, xp, timestamp }`
  - opcionálisan: `structureLevel[topicId] = 'tema' | 'altema' | 'fotema'`
  - opcionálisan: `topicWeight[topicId] = 1.0–1.4`
- A szint-számítás külön függvény: XP → szint, XP a következő szintig (már létezik).
- A fenti képletek alapján egyetlen helyen számítjuk ki az XP-t (nem modulonként másképp).

---

## 9. Következő lépés (XP szempontból)

1. Halmazműveletek modulhoz hozzárendelni: `topicLevel = tema`, `topicWeight = 1.2`.
2. Gondolkodási módszerek, Halmazok: `topicLevel = altema`, `topicWeight = 1.2`.
3. Alapozó modulok főtéma: `topicLevel = fotema`, `topicWeight = 1.1` (kicsit könnyebb, de összetett).
4. A pilot implementációnál (Halmazműveletek) a fenti XP-képlet szerint számolni, és ellenőrizni, „érzésre” jók-e a jutalmak.

