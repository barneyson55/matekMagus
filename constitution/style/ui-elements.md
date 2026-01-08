---

title: "UI-elemek – vizuális komponensek stílusleírása"
description: "A MatekMester gombjainak, inputjainak, kártyáinak, füleinek, üzenetdobozainak és overlay-einek vizuális stílus- és működési terve"
------------------------------------------------------------------------------------------------------------------------------------------------

# UI-elemek – vizuális komponensek (`style/ui-elements.md`)

Ez a dokumentum a MatekMester **alap UI-komponenseinek** (gombok, inputok, kártyák,
fülek, üzenetdobozok, overlay-ek, toastok) vizuális stílusát rögzíti.

Nem konkrét CSS-t írunk le, hanem:

* **logikai stílusszabályokat**,
* **komponens-típusokat** (primary/secondary gomb, input, kártya, stb.),
* ezek **állapotait** (default, hover, active, disabled, focused),
* és az RPG/MMO hangulathoz illeszkedő vizuális elveket.

A dokumentum a már definiált tokenekre épít:

* színek: `style/colors-and-themes.md`,
* tipográfia és ikonok: `style/typography-and-icons.md`,
* felső HUD / app shell: `style/app-shell.md`,
* Quest Log: `style/quest-log.md`.

---

## 1. Alapelv: „Modern RPG UI” – visszafogott díszítéssel

A MatekMester UI-elemei:

* **kártya- és panel-alapúak**,
* enyhén lekerekített sarkokkal,
* visszafogott árnyékolással,
* RPG/MMO hangulatú, de **tanulóbarát** stílusban.

Általános formai elv:

* Sarki lekerekítés: közepesen kerek (nem teljesen „pill”, de nem is szögletes),
* Árnyék: finom, csak a fontos UI-rétegeken (kártyák, overlay-panelek, fő gombok),
* Border: vékony (`color.border.subtle`), csak ott, ahol szeparálni kell.

---

## 2. Gombok (Buttons)

A gombok a MatekMesterben **következetes vizuális nyelvet** használnak.

### 2.1. Gomb-típusok

Alap gomb-típusok:

1. `button.primary` – elsődleges műveletekhez
2. `button.secondary` – másodlagos / kiegészítő műveletekhez
3. `button.tertiary` – link-szerű, kevésbé hangsúlyos lehetőségekhez
4. `button.danger` – destruktív vagy visszavonhatatlan műveletekhez (pl. reset)
5. `button.icon` – ikon-only gombok (hamburger, settings, avatar fölötti kis ikonok, stb.)

#### 2.1.1. Primary gomb

Használat:

* „Küldetés elfogadása”
* „Teszt indítása”
* „Mentés” a Settings overlay-ben
* Gyakorlás fő akció-gombjai (pl. „Következő kérdés” – ha explicit gomb kell)

Vizuális elv:

* Háttér: theme „primary” színe (pl. Pergamen esetén erősebb barnás, Futurisztikusnál neon-accent)
* Szöveg: magas kontraszt, tipikusan világos/dark ellentét
* Border: vagy nincs, vagy minimális, a háttér árnyalatával összefüggő
* Sarok: lekerekítés közepes mértékben
* Árnyék: enyhe, „kattintható” érzetet adó

Tipográfia:

* `font.family.ui`
* `font.size.md`
* `font.weight.medium` vagy `bold`

#### 2.1.2. Secondary gomb

Használat:

* „Mégse”
* „Bezárás”
* Alternatív műveletek (pl. „Másik témakör választása”)

Vizuális elv:

* Háttér: `color.bg.panel`-hez közeli, de kicsit kiemelt
* Szöveg: `color.text.base`
* Border: `color.border.subtle` jól látható, de nem harsány
* Kevésbé figyelem-felhívó, mint a primary

#### 2.1.3. Tertiary gomb (szöveges link-szerű)

Használat:

* „További részletek…”
* „Súgó megnyitása”
* Kisebb UI-szegletekben opcionális műveletek

Vizuális elv:

* Háttér: átlátszó vagy panel színével azonos
* Szöveg: `color.text.link`
* Aláhúzás vagy csak hoverkor aláhúzás (theme dönti el)
* Minimális padding, inkább tipográfiai elem

#### 2.1.4. Danger gomb

Használat:

* „Reset” (pl. helyi beállítások visszaállítása)

Vizuális elv:

* Háttér: `color.state.error`-höz tartozó tónus
* Szöveg: világos, jól olvasható
* Figyelemfelkeltő, de nem „villogó”
* Mindig egyértelműen különbözzön a Primary gombtól

#### 2.1.5. Icon gomb

Használat:

* Hamburger (Quest Log mutatás/elrejtés)
* Settings (fogaskerék)
* Kis „X” bezárás gomb overlay-eken

Vizuális elv:

* Nincs nagy, feltűnő háttérblokk – inkább kör/négyzet alakú, kis sötétebb/halványabb háttérfolt
* Ikon méret: `icon.size.md` vagy `icon.size.lg`
* Hover állapotban:

  * háttér enyhén színezett / fényesebb,
  * ikon kicsit erősebb színnel jelenik meg (`color.icon.active`).

---

### 2.2. Gomb állapotok

Minden gombnál (primary, secondary, danger, icon) érvényes:

* `default` – alapállapot
* `hover` – egér felette
* `active` – kattintás pillanata
* `disabled` – nem elérhető
* `focused` – billentyűzet fókusz

Állapot-szabályok:

* `hover`:

  * háttér szín enyhe világosítása/sötétítése,
  * shadow kicsit erősebb lehet,
  * cursor: pointer.
* `active`:

  * háttér sötétebb/erősebben nyomott hatás,
  * shadow csökkenhet, mintha „benyomódna”.
* `disabled`:

  * háttér és szöveg halványabb,
  * cursor: default, nincs hover-effekt,
  * ikonok is „fakók”.
* `focused`:

  * jól látható, de nem zavaró outline (pl. vékony, kontrasztos keret), az akadálymentesítés miatt kötelező.

---

## 3. Inputok és form-elemek

### 3.1. Szöveg- és szám input (Teszt / Gyakorlás válaszmezők)

Használat:

* Teszt feladatok válaszai
* Gyakorlás input mező, ahová a tanuló beírja a megoldást

Vizuális elv:

* Háttér: `color.bg.panel`-hez közeli, enyhén világosított/darkos
* Border: `color.border.subtle`
* Sarok: enyhén lekerekítve
* Padding: kényelmes, ne legyen zsúfolt
* Fokuszban: border `color.state.info` vagy a theme-hez illő highlight színnel

Tipográfia:

* `font.family.ui`
* `font.size.md`
* `font.weight.regular`

Hibaállapot:

* Border átvált `color.state.error`-re
* Opcionálisan rövid hibaüzenet (`color.text.feedback.error`) az input alatt

### 3.2. Textarea (hosszabb beviteli mező – opcionális)

Ha valahol hosszabb válasz / jegyzet szükséges:

* Hasonló vizuális elv, mint az inputnál
* Magasabb, több soros
* Görgetősáv: `color.scroll.track` / `color.scroll.thumb` stílusokkal

### 3.3. Checkboxok (jelölőnégyzetek)

Használat:

* Gyakorlás nehézségi szintek választása (`könnyű / közepes / nehéz`)
