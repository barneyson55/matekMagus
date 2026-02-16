---

title: "Színek és témák – vizuális alaprendszer"
description: "A MatekMester globális szín-, háttér- és theme-rendszerének stílusleírása, RPG/MMO hangulatra hangolva"

---

# Színek és témák – vizuális alaprendszer (`style/colors-and-themes.md`)

Ez a dokumentum a MatekMester **szín- és theme-rendszerének** alapelveit rögzíti.

Célja, hogy:

* egységesítsük a **globális alapszíneket** (háttér, szöveg, keretek),
* definiáljuk a **funkcionális szín-tokeneket** (siker, hiba, figyelem, XP, buff, quest-státusz, stb.),
* kijelöljük a **theme-ek / skinek** (pl. Pergamen, Galaxis, Futurisztikus, Dark) mozgásterét,
* biztosítsuk, hogy minden vizuális döntés **összhangban legyen** az RPG/MMO hangulattal, de tanulásbarát maradjon,
* teret adjon a **felhasználói háttérkép** használatának is, úgy, hogy a tartalom végig olvasható maradjon.

Ez egy **keretdokumentum**: konkrét hex-kódok és részletes paletták külön skin-leírásokban pontosíthatók.

---

## 1. Globális szín-tokenek

A konkrét hex értékek helyett **logikai szín-tokenekben** gondolkodunk. Ezek a tokenek minden skinben jelen vannak, csak a konkrét szín változik.

### 1.1. Alap rétegek

* `color.bg.main` – fő háttérszín (tanulófelület alapja)
* `color.bg.panel` – panel-háttér (Quest Log, modul dobozok, kártyák)
* `color.bg.header` – felső App Shell háttér
* `color.bg.overlay` – Beállítások overlay, modálok háttere
* `color.bg.user-image.overlay` – a felhasználó által feltöltött háttérkép fölé helyezett **színes/áttetsző fólia**, amely biztosítja az olvashatóságot

### 1.2. Szöveg és címek

A szöveg-típusokra külön tokeneket használunk, hogy skin-váltásnál rugalmasan
lehessen őket finomhangolni.

* `color.text.base` – általános szöveg (elméleti tartalom, magyarázatok)
* `color.text.muted` – másodlagos, magyarázó szöveg (pl. kiegészítő kommentek)
* `color.text.heading` – globális címsorok (pl. főoldali, nagy címszövegek)
* `color.text.moduleTitle` – **aktuális modul címe** a fő tartalomban (modulnézet tetején)
* `color.text.tabLabel.active` – aktív fül felirata (Elmélet / Vizuális modell / Teszt / Gyakorlás)
* `color.text.tabLabel.inactive` – inaktív fülek felirata
* `color.text.tabHeading` – az adott fülön belüli nagyobb blokkok címei (pl. „Példák”, „Képlet”, „Feladatleírás”)
* `color.text.hint` – **hint jellegű szöveg** (halványabb, gyakran dőlt stílus, pl. „Írd be a megoldást egész számmal…”)
* `color.text.feedback.success` – gyakorlás/taszt visszajelző szöveg helyes válasz esetén
* `color.text.feedback.error` – gyakorlás/teszt visszajelző szöveg hibás válasz esetén
* `color.text.link` – kattintható elemek (linkek, modulnevek, interaktív címkék)

### 1.3. UI-elemek és keretek

* `color.border.subtle` – finom szeparátorok, keretek
* `color.border.strong` – hangsúlyosabb határvonalak
* `color.scroll.track` – görgetősáv pálya
* `color.scroll.thumb` – görgetősáv fogantyú

### 1.4. Állapotok (status)

* `color.state.success` – sikeres művelet (helyes válasz, quest teljesítve)
* `color.state.error` – hiba (rossz válasz, sikertelen művelet)
* `color.state.warning` – figyelmeztetés (pl. nem mentett módosítások)
* `color.state.info` – információs üzenetek

### 1.5. XP és RPG-specifikus színek

* `color.xp.bar.bg` – XP-sáv háttér
* `color.xp.bar.fill` – XP-sáv kitöltése
* `color.xp.tick` – szegmensek jelölése (mérőszalag osztások)
* `color.buff.icon` – buff ikonok alap színe / kontúrja
* `color.quest.active` – aktív quest színe a listában
* `color.quest.completed` – kimaxolt quest zöld pipájának / jelölésének színe

### 1.6. Teszt-eredmény overlay a teljes modulnézetre

Teszt befejezésekor a rendszer **rövid, vizuális visszajelzést** adhat a teljes
modulnézetre kiterjedően (nem agresszív, de egyértelmű jelzés).

Ehhez külön tokeneket használunk:

* `color.test.result.overlay.success` – áttetsző, pozitív tónus (pl. zöldes overlay) sikeres tesztre
* `color.test.result.overlay.fail` – áttetsző, visszafogott pirosas overlay sikertelen tesztre

Ezek az overlay-ek:

* csak **rövid ideig** jelennek meg 1.8 másodpercre,
* nem fedik el véglegesen a tartalmat,
* segítenek érzetre is megkülönböztetni a sikeres / sikertelen próbálkozásokat.

---

## 2. Felhasználói háttérkép a tanulófelület mögött

A rendszer lehetővé teszi, hogy a tanuló **saját háttérképet** töltsön fel
a tanulófelület mögé. Ennek célja a személyre szabhatóság és az „otthonos” érzés
anélkül, hogy az olvashatóság sérülne.

### 2.1. Elhelyezés és viselkedés

* A felhasználói háttérkép **a fő tartalom (`color.bg.main`) alatt** helyezkedik el.
* A fő tartalmi réteg és panelek **mindig** rendelkeznek egy egységes, enyhén
  átlátszatlan háttérrel, hogy a szöveg és ábrák olvashatóak maradjanak.
* A háttérképre **mindig rákerül** a `color.bg.user-image.overlay` réteg,
  amely:

  * csökkenti a kontrasztot,
  * enyhén elszínezi a képet a választott skin tónusa felé,
  * biztosítja, hogy a tartalom ne keveredjen vizuálisan a háttérrel.

### 2.2. Beállítások és korlátok

A Settings overlay „Skin & Téma” szekciójában:

* a felhasználó:

  * feltölthet egy háttérképet,
  * választhat a javasolt vágási / igazítási módok közül (pl. kitöltés, középre igazítás, ismétlés tiltása),
* a rendszer:

  * **fixen meghatározott** minimum overlay-áttetszőséget tart fenn,
  * nem engedi teljesen kikapcsolni az overlay-t (így a szöveg soha nem keveredik élesen a háttérképpel).

A cél, hogy a háttérkép **hangulatot adjon**, de soha ne menjen a tanulhatóság rovására.

---

## 3. Theme-ek (skinek) koncepciója

A MatekMester több, egymással kompatibilis **theme / skin** fölé épül. Minden skin:

* ugyanazokat a **szín-tokeneket** használja, de
* más-más **stiláris világot** valósít meg.

### 3.1. Alap theme-ek (irányelvek szintjén)

1. **Pergamen**

   * Meleg, törtfehér, barnás alapszínek.
   * Papír / tekercs hangulat a Quest Logban és a modul-kártyákon.
   * Címek enyhén díszes, klasszikus betűtípussal.

2. **Galaxis**

   * Mély kék-lila háttér, csillagszerű akcentusok.
   * XP-sáv csillagösvény-szerű, fényes kitöltéssel.
   * Buff ikonok bolygó / csillag / energia-motívumokkal.

3. **Futurisztikus**

   * Világos/medium szürke felületek, neon akcentusok (kék, zöld, lila).
   * Letisztult, high-tech panel-design.
   * Finom glow a kiemelt elemek körül.

4. **Dark / Night study**

   * Sötét háttér, alacsony fényerejű panelek.
   * Kontrasztos címszínek, jól olvasható világos szöveg.
   * Eye-strain csökkentés hosszabb tanuláshoz.

5. **Szines**
   * Kevert szinek mindenhol

6. **Testrteszabott**
   * Alap elemek szinezhetősége beállitoskon belül

A skinek **nem változtatják meg** az információs hierarchiát vagy az elrendezést,
csak a vizuális világot.

---

## 4. Kontraszt és olvashatóság

Minden theme esetén kötelező:

* A `color.text.base` és `color.bg.main` között megfelelő kontraszt legyen.
* A kiemelés (`color.quest.active`, `color.state.success`, stb.) **ne rontsa** az olvashatóságot.
* A hosszú szöveges blokkok (elmélet, magyarázatok) soha ne legyenek
  extrém élénk háttéren.

Irányelvek:

* Fő szöveg: magas kontraszt (pl. sötét szöveg világos háttéren vagy fordítva).
* Másodlagos szöveg: alacsonyabb kontraszt, de továbbra is jól olvasható.
* Állapot-színek: ne legyenek túl neon-harsányak, hogy hosszabb tanulás mellett se legyen fárasztó.

A `color.bg.user-image.overlay` használata kötelező, ha felhasználói háttérkép aktív,
így a háttérkép részletei sosem zavarják a szöveg olvashatóságát.

---

## 5. App Shell, Quest Log és modulnézet – színviszonyok

### 5.1. App Shell (felső fejléc)

* `color.bg.header` eltér `color.bg.main`-től, hogy a HUD jól elkülönüljön.
* XP-sáv:

  * háttér: `color.xp.bar.bg`,
  * kitöltés: `color.xp.bar.fill`,
  * osztások: `color.xp.tick`.
* Buff ikonok: `color.buff.icon`, skinfüggő piktogramokkal.
* Avatar + Lv. szintnév: `color.text.heading` vagy skin-specifikus player-color.

### 5.2. Quest Log (bal oldali sáv)

* Panel háttér: `color.bg.panel`.
* Főtémák / altémák / témakörök:

  * `color.text.heading` / `color.text.base` kombinációk,
  * `color.text.muted` a még nem elfogadott (`NOT_ACCEPTED`) questekhez.
* Aktív modul kiemelése: háttér highlight + erősebb szövegszín (`color.quest.active`).
* Kimaxolt modul: zöld pipa (`color.quest.completed`).

### 5.3. Modulnézet (fő tartalom)

* Háttér: `color.bg.main` (a felhasználói háttérkép fölött, overlay-en keresztül).
* Kártyák (feladatdobozok, képletblokk, vizuális modell): `color.bg.panel`.
* Modul cím: `color.text.moduleTitle`.
* Fülcímkék: `color.text.tabLabel.active` / `color.text.tabLabel.inactive`.
* Fülön belüli címsorok: `color.text.tabHeading`.
* Hint szövegek: `color.text.hint`.
* Teszt / Gyakorlás visszajelző dobozok:

  * siker: `color.state.success` + `color.text.feedback.success`,
  * hiba: `color.state.error` + `color.text.feedback.error`,
  * info: `color.state.info`.
* Teszt befejezésekor rövid overlay:

  * sikeres: `color.test.result.overlay.success`,
  * sikertelen: `color.test.result.overlay.fail`.

---

## 6. Hover, fókusz és interaktív állapotok

Minden kattintható elemnek (modulnév, gomb, avatar, hamburger, XP-sáv hover, stb.)
konzisztens **állapot-színrendszert** kell követnie.

Alapállapotok:

* `default` – normál szín.
* `hover` – kissé világosabb/sötétebb árnyalat vagy finom glow.
* `active/pressed` – rövid ideig tartó erősebb kontraszt vagy lenyomott hatás.
* `focused` (billentyűzetnavigáció): jól látható fókusz-keret.

A fókusz jelölése fontos az **akadálymentesítés** miatt is.

---

## 7. Theme-váltás – Skin & Theme a Settings overlay alatt

A `Settings` overlay **Skin & Téma** szekciója a `colors-and-themes` logikai rendszerre épül:

* minden theme betölti a saját token-kiosztását,
* a preview-n ugyanazok az elemek látszanak: App Shell részlete, Quest Log, modulkártya,
* theme váltáskor:

  * a funkcionális szerepek (XP-sáv, buff, quest állapotok) **nem változnak**,
  * csak a hozzájuk rendelt színek és textúrák.

A theme-váltás:

* UX szinten történhet azonnali előnézettel,
* de végleges mentés csak a `Mentés` gombbal történik.

A felhasználó által feltöltött háttérkép beállítása **szintén ehhez a szekcióhoz** tartozik,
és minden theme esetén a `color.bg.user-image.overlay` biztosítja az olvashatóságot.

---

## 8. Stílus-öröklődés és testreszabás

A globális theme-rendszer felett lehetséges **finom testreszabás** (pl. egyéni színek a custom skinben):

* Alap skinek: fix, előre definiált színpalettával.
* Custom skin:

  * bizonyos tokenek (pl. `color.bg.main`, `color.xp.bar.fill`, `color.quest.active`) felülírhatók,
  * a felülírás soha nem ronthatja az olvashatósági / kontraszt követelményeket.

Ajánlott megkötés:

* A felhasználó csak **biztonságos tartományban** választhat színeket (előszűrt paletta),
* a rendszer figyelmeztethet, ha egy választott szín túl alacsony kontrasztot eredményezne.

---

## 9. Összegzés

A `colors-and-themes` rendszer célja, hogy:

* egységes **logikai szín-tokenekre** épüljön minden skin,
* a MatekMester minden nézetében (App Shell, Quest Log, modulnézet, karakterlap, Settings)
  koherens, RPG/MMO-hangulatú, de tanulóbarát vizuális világot adjon,
* biztosítsa a konzisztenciát és az olvashatóságot,
* lehetővé tegye **felhasználói háttérképek** használatát kontrollált overlay-jel,
* egyben teret adjon többféle világ (Pergamen, Galaxis, Futurisztikus, Dark, Custom) megvalósításának.

A konkrét theme-ek részleteit külön skin-leírások bontják ki
ha később theme-specifikus leírások születnek, azok a `style/` alá kerülhetnek;
erre ez a dokumentum adja az **alap keretet**.
