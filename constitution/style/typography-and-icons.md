---
title: "Tipográfia és ikonok – globális stílusleírás"
description: "A MatekMester szöveg- és ikonstílusainak stílusfüggetlen, RPG/MMO-hangulatú leírása"
---

# Tipográfia és ikonok (`style/typography-and-icons.md`)

Ez a dokumentum a MatekMester **szöveg- és ikonvilágának** alapelveit rögzíti.

Célja, hogy:

- egységesítse a **betűcsaládokat, méreteket, vastagságokat, dőléseket**,
- definiálja, mely UI-elem **milyen tipográfiai „szerepet”** kap (modulcím, fülcím, hint, visszajelzés, quest sor, stb.),
- meghatározza az **ikonok stílusát és méretezését** (quest ikonok, buff ikonok, pipák, hamburger stb.),
- biztosítsa, hogy minden theme/skin mellett a szöveg **olvasható, konzisztens és RPG/MMO hangulatú** maradjon.

A konkrét fontnevek (pl. Google Fonts típusok) és technikai CSS-részletek implementációs szinten döntendők el. Itt **logikai tokenekben** gondolkodunk.

---

## 1. Globális betűcsalád koncepció

A MatekMester három fő betűcsalád-funkciót használ:

1. `font.family.ui` – **alap UI betűcsalád**

   - Tiszta, jól olvasható sans-serif.
   - Használat:
     - általános szövegek,
     - gombok, input mezők,
     - Quest Log elemek,
     - Teszt / Gyakorlás tartalom.

2. `font.family.display` – **RPG/MMO hangulatú kiemelt címekhez**

   - Enyhén díszes, de még mindig jól olvasható display/font.
   - Használat:
     - MatekMester logó / felirat a felső sávban,
     - modulnézet főcímei (pl. „Halmazműveletek”),
     - kiemelt nagy címek (pl. főtéma szintnév a karakterlapon).

3. `font.family.mono` – **monospaced/technikai jellegű tartalomhoz**

   - Használat:
     - képletblokkok (ha szükséges),
     - pszeudókód, táblázatok, „technikai megjegyzések”.

---

## 2. Tipográfiai lépték (type scale)

A betűméreteket **logikai méret-tokenekkel** kezeljük:

- `font.size.xs` – nagyon kicsi
- `font.size.sm` – kicsi
- `font.size.md` – normál / törzsszöveg
- `font.size.lg` – nagyobb címek
- `font.size.xl` – modulcímek, nagy címsorok
- `font.size.display` – MatekMester logó / fő brand felirat

Vastagság:

- `font.weight.regular` – alap
- `font.weight.medium` – enyhén kiemelt
- `font.weight.bold` – erősen kiemelt

Sorköz (line-height):

- `lineHeight.tight` – címekhez, rövitebb sorokhoz
- `lineHeight.normal` – normál olvasási sűrűség
- `lineHeight.relaxed` – hosszabb elméleti szöveghez

A konkrét px/rem értékek theme-en belül konzisztensen definiálandók, de
a logika minden skinre ugyanaz marad.

---

## 3. Szövegszerepek és tipográfiai hozzárendelések

Az alábbiakban a **font-tokenek és UI-szerepek** hozzárendelését rögzítjük.

### 3.1. Felső fejléc / HUD

1. **MatekMester felirat (felső középen)**

   - Cél: brand, RPG/MMO érzet.
   - Tipográfia:
     - `font.family.display`
     - `font.size.display`
     - `font.weight.bold`
     - `lineHeight.tight`
   - Szín: `color.text.heading` (a theme határozza meg).

2. **Avatar melletti szintnév (`Lv. X – Szintnév`)**

   - Cél: karakterszint hangsúlyos, de ne nyomja el a logót.
   - Tipográfia:
     - `font.family.ui`
     - `font.size.lg`
     - `font.weight.medium` vagy `bold` (theme döntés)
     - `lineHeight.normal`
   - Szín: `color.text.heading` vagy skin specifikus player-color.

3. **XP-sáv tooltip (pl. „1200 / 2000 XP”)**

   - Tipográfia:
     - `font.family.ui`
     - `font.size.sm`
     - `font.weight.regular`
   - Szín: `color.text.muted` vagy `color.text.base`,
   - Rövid, egy soros szöveg.

4. **Buff ikonok alá / mellé kerülő rövid szövegek (ha szükséges)**

   - Pl. buff neve, időtartam.
   - Tipográfia:
     - `font.family.ui`
     - `font.size.xs` vagy `sm`
     - `font.weight.regular`
   - Szín: `color.text.muted`.

---

### 3.2. Quest Log (bal oldali sáv)

1. **Főtémák nevei**

   - Tipográfia:
     - `font.family.ui`
     - `font.size.md` vagy `lg`
     - `font.weight.bold`
   - Szín:
     - aktív / elfogadott modul: `color.text.heading` / `color.quest.active`,
     - még nem elfogadott (`NOT_ACCEPTED`): `color.text.muted`.

2. **Altéma nevei**

   - Tipográfia:
     - `font.family.ui`
     - `font.size.md`
     - `font.weight.medium`
   - Szín: 
     - alap: `color.text.base`,
     - `NOT_ACCEPTED`: `color.text.muted`.

3. **Témakörök listája**

   - Tipográfia:
     - `font.family.ui`
     - `font.size.sm` vagy `md`
     - `font.weight.regular`
   - Szín: `color.text.base`
   - Kimaxolt témakör jelölése:
     - zöld pipa ikon (`color.quest.completed`),
     - maga a cím maradhat `color.text.base` vagy enyhén „achievement” színben.

4. **Aktív kijelölt modul sor**

   - Tipográfia ugyanaz, mint alapállapotban,
   - Háttér vagy keret: theme specifikus, de mindig olvasható marad,
   - Szöveg színe megerősítve: `color.quest.active`.

---

### 3.3. Modulnézet – fő tartalom

1. **Modul cím (pl. „Halmazműveletek”)**

   - Tipográfia:
     - `font.family.display`
     - `font.size.xl`
     - `font.weight.bold`
     - `lineHeight.tight`
   - Szín: `color.text.moduleTitle`.

2. **Fülcímkék (Elmélet / Vizuális modell / Teszt / Gyakorlás)**

   - Aktív fül:
     - `font.family.ui`
     - `font.size.md`
     - `font.weight.medium`
     - Szín: `color.text.tabLabel.active`.
   - Inaktív fül:
     - `font.family.ui`
     - `font.size.md`
     - `font.weight.regular`
     - Szín: `color.text.tabLabel.inactive`.

3. **Fülön belüli nagyobb címsorok (pl. „Példák”, „Képlet”, „Feladatleírás”)**

   - Tipográfia:
     - `font.family.ui`
     - `font.size.lg`
     - `font.weight.bold`
     - `lineHeight.normal`
   - Szín: `color.text.tabHeading`.

4. **Általános elméleti szöveg (törzsszöveg)**

   - Tipográfia:
     - `font.family.ui`
     - `font.size.md`
     - `font.weight.regular`
     - `lineHeight.relaxed` (kényelmes olvasás).
   - Szín: `color.text.base`.

5. **Hint szövegek (pl. „Írd be a megoldást egész számmal…”)**

   - Tipográfia:
     - `font.family.ui`
     - `font.size.sm`
     - `font.weight.regular`
     - döntött (`italic` jellegű megjelenítés ajánlott)
   - Szín: `color.text.hint`.

6. **Gyakorlás visszajelzés szöveg (helyes/hibás)**

   - Siker (helyes válasz):
     - `font.family.ui`
     - `font.size.md`
     - `font.weight.medium`
     - Szín: `color.text.feedback.success` + háttér `color.state.success`.
   - Hiba (rossz válasz):
     - `font.family.ui`
     - `font.size.md`
     - `font.weight.medium`
     - Szín: `color.text.feedback.error` + háttér `color.state.error`.

7. **Teszt eredmény összefoglaló panel**

   - Cím („Teszt eredménye”):
     - `font.family.ui`
     - `font.size.lg`
     - `font.weight.bold`.
   - Részletek (pontszám, jegy, idő):
     - `font.family.ui`
     - `font.size.sm` / `md`
     - `font.weight.regular`.

---

### 3.4. Karakterlap (character_sheet.html)

1. **Szintnév és szint** (jobb oldali panel fő headingjei)

   - Tipográfia:
     - `font.family.display` vagy `font.family.ui` + erős stilizálással
     - `font.size.lg` / `xl`
     - `font.weight.bold`.
   - Szín: `color.text.heading`.

2. **Achievementek listája**

   - Achievement cím:
     - `font.family.ui`
     - `font.size.md`
     - `font.weight.medium`.
   - Achievement leírás:
     - `font.family.ui`
     - `font.size.sm`
     - `font.weight.regular`.

3. **Aktív küldetések / Eredményeim listák**

   - Listaelem cím:
     - `font.family.ui`
     - `font.size.md`
     - `font.weight.medium`.
   - Másodlagos infók (dátum, százalék):
     - `font.family.ui`
     - `font.size.xs` / `sm`
     - `font.weight.regular`
     - `color.text.muted`.

---

## 4. Gombok, linkek, interaktív elemek

1. **Elsődleges gombok (pl. „Küldetés elfogadása”, „Teszt indítása”, „Mentés”)**

   - Tipográfia:
     - `font.family.ui`
     - `font.size.md`
     - `font.weight.medium` vagy `bold`.
   - Szín:
     - szöveg: `color.text.base` vagy theme-specifikus gomb-szín,
     - háttér: theme-en belüli „primary” szín (pl. `color.state.success`-hez közelítő, de attól eltérő).

2. **Másodlagos gombok (pl. „Mégse”, „Bezárás”)**

   - Tipográfia:
     - `font.family.ui`
     - `font.size.sm` vagy `md`
     - `font.weight.regular` / `medium`.
   - Szín: visszafogottabb, konzisztens a theme-mel.

3. **Linkek, kattintható modulnevek**

   - Tipográfia:
     - `font.family.ui`
     - `font.size.md`
     - `font.weight.regular`.
   - Szín: `color.text.link`, hover esetén enyhe változás (világosabb/sötétebb árnyalat, aláhúzás).

---

## 5. Ikonok – stílus és méretezés

Az ikonok egységes, **vonal-alapú (outline)** stílusban jelenjenek meg, RPG/MMO-hangulattal, de modern UI-ra optimalizálva.

### 5.1. Ikon-méret tokenek

- `icon.size.sm` – pl. 12–14px (görgetés közeli, kiegészítő ikonok).
- `icon.size.md` – pl. 16–20px (gombok, menüpontok).
- `icon.size.lg` – pl. 24–32px (avatar környékén, fontos UI-horgonyok).

### 5.2. Általános ikon szabályok

- Egységes vonalvastagság (stroke width) a teljes UI-ban.
- Színezés:
  - alapállapot: `color.icon.base` (skin specifikus),
  - aktív / kiemelt: `color.icon.active`,
  - siker / hiba kontextusban: `color.state.success` / `color.state.error` társítása.

### 5.3. Speciális ikonok

1. **Hamburger ikon (Quest Log megnyitás/elrejtés)**

   - Méret: `icon.size.lg`.
   - Elhelyezés: App Shell bal 5%-os sávjában.
   - Interakció:
     - hover: enyhe színerősödés vagy glow,
     - active: „lenyomott” hatás.

2. **Zöld pipa (kimaxolt modul)**

   - Méret: `icon.size.sm` vagy `md`, quest sor végén.
   - Szín: `color.quest.completed`.

3. **Buff ikonok**

   - Méret: `icon.size.md`.
   - Stílus: RPG-szerű motívumok (pl. pajzs, kard, homokóra), de line-art jelleggel.
   - Szín: alap: `color.buff.icon`, ritka buffoknál enyhe kiemelés (pl. glow).

4. **Settings (fogaskerék) ikon**

   - Méret: `icon.size.md`.
   - Pozíció: jobb alsó sarok közelében, overlay nyitására.
   - Szín: `color.icon.base`, hover-re `color.icon.active`.

---

## 6. Akadálymentesség és olvashatóság

Tipográfia szempontból:

- `font.size.md` alá **fő tartalomszöveg nem mehet**.
- Hosszabb elméleti részeknél mindig `lineHeight.relaxed`.
- Kontraszt:
  - `color.text.base` és `color.bg.main` között magas kontraszt legyen,
  - hint és muted szöveg esetén is ügyelni kell arra, hogy elolvasható maradjon.

Ikonok:

- ahol ikon **önmagában hordoz jelentést**, javasolt kiegészítő szöveg (tooltip, aria-label, vagy szöveges címkézés), hogy a rendszer képernyőolvasóval is használható legyen.

---

## 7. Kapcsolódás más style-dokumentumokhoz

Ez a tipográfiai leírás az alábbi dokumentumokkal együtt ad teljes képet:

- `style/colors-and-themes.md` – meghatározza a színtokeneket, amelyekre a tipográfia ráül.
- `style/app-shell.md` – definiálja a felső sáv layoutját, ahol ezek a szövegek és ikonok megjelennek.
- `style/quest-log.md` – a bal oldali Quest Log szerkezeti stílusára építve használja a tipográfiai szabályokat.
- (később) modulnézet- és settings-stílus dokumentumok, amelyek a fenti szöveg- és ikon-szerepeket alkalmazzák.

Ezek együtt biztosítják, hogy a MatekMester minden nézete **konzisztens, olvasható és RPG/MMO-hangulatú** tipográfiát használjon.