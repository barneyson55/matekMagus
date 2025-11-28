---

title: "App Shell – felső fejléc és HUD vizuális leírás"
description: "A MatekMester felső fejlécének (XP-sáv, avatar, buff ikonok, hamburger, MatekMester logó) vizuális és elrendezési szabályai"
------------------------------------------------------------------------------------------------------------------------------------------

# App Shell – felső fejléc és HUD (`style/app-shell.md`)

Ez a dokumentum a MatekMester **felső HUD-jának / fejlécének** vizuális szabályait írja le.

A cél: pontosan definiálni, hogyan helyezkedjen el és hogyan nézzen ki

* a **hamburger gomb**,
* az **XP progressziós sáv** (szegmentált „mérőszalag”),
* a **buff ikonok**,
* a **MatekMester** felirat,
* az **Avatar + Lv. szintnév** blokk.

A leírás technológiától független (nem konkrét CSS), a részletes tipográfia és színek
külön `style-` dokumentumokban lesznek rögzítve.

---

## 1. Felső sáv – alap elrendezési koncepció

A felső fejléc egy **két rétegű, teljes szélességű sáv**, amely minden nézetben látható.

Vizuális séma (logikai elrendezés):

```
┌───────────────────────────────────────────────────────┐
│[☰] [ Buff1 Buff2 ]     MatekMester     [Avatar][Lv.X]│
│[☰] |====|====|====|====|====|====|====|====|====|====│
└───────────────────────────────────────────────────────┘
```

**Fő elv:**

* A **bal oldali 5% szélességű oszlopban** helyezkedik el a hamburger gomb.
* A fennmaradó **95% szélességű zónában**:

  * a felső 50%-ban: balra zártan a buff ikonok, középre zártan a **MatekMester** felirat, jobb oldalon az **Avatar + Lv. szintnév**;
  * az alsó 50%-ban: a **teljes szélességben futó XP-sáv**

A hamburger gomb **vertikálisan végigfut** a felső sáv teljes magasságában,
így mind a felső (MatekMester / Avatar), mind az alsó (XP-sáv / buffok) „szinthez” igazodik.

---

## 2. Horizontális felosztás – 5% + 95%

A felső fejléc két fő horizontális zónára bontható:

1. **Bal oldali oszlop (~5%)** – csak a hamburger gomb.
2. **Jobb oldali tartomány (~95%)** – buffok + XP-sáv + MatekMester + Avatar/Lv.

```
┌───────────────────────────────────────────────────────┐
│[☰] [ Buff1 Buff2 ]    MatekMester      [Avatar][Lv.X]│
│[☰] |====|====|====|====|====|====|====|====|====|====|
└────┴──────────────────────────────────────────────────┘
 5%                        ~95%                                            
```

* A bal oldali 5% **fix** szélességű, minden skin és felbontás mellett.
* A jobb oldali 95% rugalmasan igazodik az ablak méretéhez,
  de a benne lévő elemek **relatív pozicionálása fix** marad.

---

## 3. Vertikális felosztás a jobb oldali 95%-os tartományban

A jobb oldali 95%-os tartomány **két vízszintes rétegre** oszlik:

1. **Felső 50%** – Buff ikonok + MatekMester felirat és Avatar + Lv. blokk.
2. **Alsó 50%** – XP-sáv.

### 3.1. Felső 50% – Buff ikonok és MatekMester és Avatar/Lv.

```
┌─────────────────────────────────────────────────────────────┐
│[☰]  [ Buff1 Buff2 ]      MatekMester         [Avatar][Lv.X]│
└─────────────────────────────────────────────────────────────┘
```

**Elrendezés:**

* A Buff ikonok:
  * a felső sáv bal oldaára igazitva
  * az xp sáv bal szélére sorakoztatva

* A **MatekMester** felirat:

  * a jobb oldali 95%-os tartomány **horizontális közepére** igazítva,
  * a felső 50% magasságában helyezkedik el.

* Az **Avatar + Lv. szintnév** blokk:

  * a teljes felső sáv **jobb oldalára** igazítva,
  * a MatekMester felirat magasságával azonos sorban.

---

### 3.2. Alsó 50% – XP-sáv

```
┌─────────────────────────────────────────────────────────┐
│[☰]  |====|====|====|====|====|====|====|====|====|====||
└─────────────────────────────────────────────────────────┘
```

* A jobb oldali 95%-os tartomány alsó felében a **globális XP-sáv** található.
* A sáv **teljes szélességben fut**.

---

## 4. XP-sáv – „mérőszalag” megjelenítés

Szegmentációs séma:

```
|====|====|====|====|====|====|====|====|====|====|
```

### 4.1. Vizuális szabályok

* A sáv egy hosszú téglalap, kb. 5%-os **szegmensekre bontva**.
* Kitöltött szegmensek: erős szín / fényerő.
* Üres szegmensek: halvány, háttér jellegű.
* A szegmensek száma skin-független, de konfigurálható.

### 4.2. XP érték megjelenítése

* Alapállapotban rejtett.
* Hover esetén jelenik meg:
  *pl. „1200 / 2000 XP”*

---

## 5. Buff ikonok - felső sáv bal eleje

* A megszerzésük szerint balra felsorkaoztatva megjelenésük szerint
* az XP sáv bal széléhez igazodva

---

## 6. Hamburger gomb – bal oldali fix 5%-os oszlop

* A hamburger oszlopa **vertikálisan végigfut** a teljes felső sávon.
* Minden skin esetén fix pozícióban marad.
* Interakció: Quest Log megnyitása / elrejtése.

---

## 7. Avatar + Lv. blokk – jobb felső sarok

```
[Avatar][Lv. X – Szintnév]
```

* A jobb felső sarokba igazítva.
* Hover esetén finom kiemelés.
* Kattintás → **karakterlap (character_sheet.html)**.

---

## 8. MatekMester logó / felirat – középre igazítva

* A teljes felső sáv vizuális közepét foglalja el.
* Tipográfia RPG/MMO stílusú, de modern és olvasható.

---

## 9. Skin-független szerkezeti szabályok

A layout **minden skin alatt azonos**:

* 5% hamburger oszlop, 95% HUD zóna.
* HUD zónán belül felső 50% (Buff ikonok + MatekMester + Avatar/Lv.) és alsó 50% (XP-sáv).
* Tooltip XP-infó.
* Minden elem konsziszten módon igazítva.

---

## 10. Összegzés

A felső fejléc általános szabályai:

* Bal 5%: hamburger.
* Jobb 95%: felső réteg → Buff ikonok + MatekMester + Avatar/Lv., alsó réteg → XP-sáv.
* XP-sáv szegmentált.
* A teljes fejléc egységes RPG/MMO HUD élményt biztosít.
