# Matek Mester (Electron)

Interaktív, moduláris matematikaoktató alkalmazás, amely a magyar emelt szintű érettségi követelményeit követve kíséri végig a diákot az alapozástól a haladó témákig. A projekt jelenleg Electron-alapú asztali kliens formájában érhető el, és lépésről lépésre bővül új elméleti anyagokkal, mini vizualizációkkal és vizsgaszituációt szimuláló feladatsorokkal.

## Célok és jelenlegi képességek

- **Electron shell + webes modulok:** a bal oldali hierarchikus navigáció több tucat tematikus blokkot listáz, a tényleges tartalmak külön HTML-modulokban töltődnek be egy iframe-be.
- **Státuszkörök és tooltip-ek:** minden témához tartozik egy `data-topic-id`, ehhez rendeli hozzá a rendszer a legjobb elért jegyet, és tooltipben bontja ki a könnyű / normál / nehéz eredményeket.
- **Halmazműveletek modul (kész):** KaTeX-szel formázott magyarázatok, interaktív Venn-diagram, azonnali gyakorló feladatok és 10 kérdéses teszt három nehézségi szinten; a teszt eredménye részletesen mentésre kerül.
- **Lineáris függvények modul (prototípus):** Chart.js grafikon, csúszkákkal állítható egyenes és teszt mód váltó. A teszt mód UI működik, de még nem generál feladatokat és nem küld részletes eredményobjektumot.
- **Eredmények nézet:** a `modules/results.html` modul az Electron főfolyamathoz fordulva kilistázza a lokálisan mentett teszteredményeket, modális ablakban részletes kérdésenkénti visszanézési lehetőséggel.
- **Mentés diskre:** minden teszteredmény az `app.getPath('userData')/progress.json` állományba kerül, így újraindítás után is visszakereshető (a státuszkörök jelenleg még nem töltik vissza automatikusan ezt az adatot).
- **XP és szint rendszer:** minden téma-nehézség kombináció első teljesítése egyszeri XP-t ad (WoW-szerű fejlődési görbével), Modul/Témazáró/Emelt blokkok extra bónuszt kapnak, a szintek és haladás a bal oldali sávban és az eredményoldalon is megjelennek.
- **Tematikus terv:** az `assets/temakorok` fájl tartalmazza a teljes tananyagtervet szövegesen, amelyhez az index.html navigáció igazodik.

## Technológiák

- [Electron 25](https://www.electronjs.org/) (main + renderer folyamatok)
- Node.js (ajánlott v18+ az Electron 25 futtatásához)
- Egyszálú vanilla JavaScript a render oldalon
- [KaTeX](https://katex.org/) a matematikai képletekhez
- [Chart.js](https://www.chartjs.org/) az interaktív grafikonhoz
- Google Fonts (Inter) és egyedi, CSS-változókkal paraméterezett UI

## Projektstruktúra

```
matekMagus/
├── assets/
│   └── temakorok                  # Szöveges tanmenet
├── modules/
│   ├── halmazmuveletek.html       # Teljesen működő modul
│   ├── linearis_fuggveny.html   # Vizualizáció + teszt mód prototípus
│   ├── placeholder.html           # Kezdő képernyő
│   └── results.html               # Eredmények listája
├── index.html                     # Fő UI + modul loader
├── style.css                      # Globális Electron shell stílusok
├── main.js                        # Electron main process, IPC, mentés
├── preload.js                     # Védett bridge az iframe-ek felé
├── package.json / package-lock.json
└── node_modules/                  # Electron fejlesztői függőség
```

## Fő komponensek

### `main.js`

- Létrehozza a `BrowserWindow`-t, betölti az indexet, és lazított CSP-t ad a CDN-eken (jsDelivr, Google Fonts, KaTeX) hosztolt erőforrásokhoz.
- `progress.json`-ban tárolja a `tests` tömböt. A fájl a felhasználó profiljához kötött `appData` mappába kerül, így platformfüggetlenül működik.
- IPC csatornák:
  - `save-test-result` (fire-and-forget): a renderer küld egy `result` objektumot, amit a main beszúr a `tests` tömb elejére.
  - `get-all-results` (invoke): visszaadja a teljes `tests` listát.

### `preload.js`

`contextBridge`-en keresztül két metódust tesz elérhetővé a renderereknek (`window.electronAPI.saveTestResult` / `window.electronAPI.getAllResults`), miközben a `contextIsolation` be van kapcsolva és a `nodeIntegration` le van tiltva.

### `index.html` + `style.css`

- Bal oldalon többszintű `details/summary` alapú tematika-fa, a jobb oldalon egy `iframe` (`modules/placeholder.html` a nyitó nézet).
- A `module-link` elemek `data-src` attribútuma határozza meg, hogy melyik modul töltődjön az iframe-be. A `'results-btn'` külön kezeli a `modules/results.html`-t.
- A `window.postMessage`-en keresztül érkező üzeneteket fogadja:
  - `type: 'testResult'` → `result` objektummal (vagy legacy top-level mezőkkel) menti és frissíti a státusz jelzőt.
  - `type: 'get-all-results'` → bekéri a diszken tárolt eredményeket és továbbítja az iframe-nek.
- A státuszkörök megjelenítéséhez `progressData` objektumban tárolja a legjobb jegyet nehézség szerint, és tooltipben bontja ki.

### Modulok

| Modul | Funkcionalitás | Állapot |
| --- | --- | --- |
| `halmazmuveletek.html` | Részletes elméleti kártyák (tabs), interaktív Venn-diagram KaTeX-szel, instant ellenőrző kérdések, három nehézségű kérdésbank, 10 feladatot számláló teszt, eredmény-összegzés és mentés. | Kész, teljes mentési folyamat bekötve (`type: 'testResult'` + `result` objektum). |
| `linearis_fuggveny.html` | Chart.js grafikon csúszkákkal, test mód váltó, vizuális eredménypopup. | A teszt kérdésgenerálás még hiányzik, de az eredmény mentése már `result` objektummal működik (alapértelmezett nehézség + üres `questions`). |
| `results.html` | Betölti a lokális `tests` tömböt, vizuálisan sorolja őket, és modális részletezőben kérdésenkénti visszanézést ad (KaTeX támogatással). | Kész; arra számít, hogy a főablak `type: 'all-results-response'` üzenetet küld. |
| `placeholder.html` | Barátságos kezdő képernyő, ami témaválasztásra ösztönöz. | Kész. |

## Adatfolyam és szerződések

1. Modul teszt befejezésekor a modulnak a következő formájú üzenetet kell küldenie:  
   ```js
   window.parent.postMessage({ type: 'testResult', result }, '*');
   ```
   ahol a `result` objektum mezői: `topicId`, `topicName`, `difficulty` (`'könnyű' | 'normál' | 'nehéz'`), `grade` (1-5), `percentage` (0-100), `timestamp` (ISO string), `questions` (kérdés leírás, opciók, helyes / felhasználói válasz).
2. A főablak menti az eredményt és frissíti a státusz jelzőket (a legjobb elért jegyet veszi figyelembe tematikus bontásban).
3. A `modules/results.html` modul `DOMContentLoaded`-kor `type: 'get-all-results'` üzenetet küld; a főablak IPC-n keresztül beolvassa a `progress.json`-t, majd visszaküldi az iframe-nek `type: 'all-results-response'` payload-dal.

## Telepítés és futtatás

1. **Követelmények:** Node.js 18 vagy újabb, mivel az Electron 25 ezt igényli. Git opcionális.
2. **Függőségek telepítése:**
   ```bash
   npm install
   ```
3. **Fejlesztői mód indítása:**
   ```bash
   npm start
   ```
   Ez megnyitja az Electron ablakot, bal oldalt a tematikus navigációval, jobb oldalt pedig a modul betöltő iframe-mel.

## Ismert hiányosságok és teendők

- A navigációban felsorolt legtöbb modulhoz még nincs HTML-fájl; jelenleg a Halmazműveletek és a Lineáris függvény modul érhető el, a többi helyett placeholder tartalom töltődik.
- A `linearis_fuggveny.html` teszt módja még nem generál feladatokat, így XP-t sem oszt teljesítésre.
- Az XP/Beállítások felület továbbra is minimális: nincsenek achievement jelvények, teljes testreszabási opciók vagy értesítések.
- A `mainWindow` konfiguráció `icon` mezője `assets/icon.png`-ra mutat, de ilyen fájl jelenleg nincs a repóban.
- A globális CSS több helyen hibás karakterkódolású (például `summary::before` ikonja), emiatt egyes UI elemek nem jelennek meg megfelelően Windows alatt.
- Az `assets/temakorok` tervfájlt még nem használja fel automatikusan az alkalmazás (kézzel duplikált lista szerepel az indexben).

## Licenc

`package.json` szerint a projekt az [ISC licenc](https://opensource.org/licenses/ISC) alatt érhető el.
