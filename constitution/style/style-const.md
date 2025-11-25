---

title: "style-const.md"
description: "A projekt során használt stílusjegyek és vizuális irányelvek"
---------------------------------------------------------------------------

# Stílus Konstansok – `style-const.md`

A dokumentum célja, hogy egységes és jövőbe mutató vizuális, grafikai, szövegstílusbeli irányelveket adjon a MatekMágus alkalmazás teljes felületére vonatkozóan.

## 🎨 Színpaletta

| Szerep                                | Szín                                                            | Hex kód   |
| ------------------------------------- | --------------------------------------------------------------- | --------- |
| Fő hangsúly (brand-primary)           | ![#4A55A2](https://via.placeholder.com/15/4A55A2/000000?text=+) | `#4A55A2` |
| Másodlagos árnyalat (brand-secondary) | ![#7895CB](https://via.placeholder.com/15/7895CB/000000?text=+) | `#7895CB` |
| Világos háttér (brand-light)          | ![#A0BFE0](https://via.placeholder.com/15/A0BFE0/000000?text=+) | `#A0BFE0` |
| Háttér / panel (brand-background)     | ![#C5DFF8](https://via.placeholder.com/15/C5DFF8/000000?text=+) | `#C5DFF8` |
| Sötét szöveg                          | ![#2C3333](https://via.placeholder.com/15/2C3333/000000?text=+) | `#2C3333` |
| Sötétszürke szöveg                    | ![#393E46](https://via.placeholder.com/15/393E46/000000?text=+) | `#393E46` |
| Siker                                 | ![#2ECC71](https://via.placeholder.com/15/2ECC71/000000?text=+) | `#2ECC71` |
| Hiba                                  | ![#E74C3C](https://via.placeholder.com/15/E74C3C/000000?text=+) | `#E74C3C` |

## 🖋️ Betűtípusok

* **Alapértelmezett törzsszöveg:** `Inter`, 1.1em, 1.7 sor-távolság, max. 80 karakter szélesség
* **Címsorok:** `Cinzel`,

  * `h1`: nagy méret, félkövér
  * `h2`: közepes méret, középfélkövér

```
 Példa:
 <h1 style="font-family: 'Cinzel'; font-size: 2.5em; font-weight: bold;">Halmazműveletek</h1>
 <p style="font-family: 'Inter'; font-size: 1.1em;">A halmazok uniója a következő szabállyal értelmezhető...</p>
```

## 🪄 Kiemelések és Hangsúlyok

* Félkövér vagy `strong` kiemelés lila (`#4A55A2`) árnyalatot kap
* Segédszöveg vagy információs XP-kiírások dőlt stílusban, halványabb színnel jelennek meg

```
 <p><em style="color: #7895CB;">XP jutalom: 1 pont minden helyes válaszért (könnyű).</em></p>
```

## 🧩 Kártyák és Panelek

* Fehér háttér
* Lekerekített sarkok (`border-radius: 12px`)
* Árnyék (`box-shadow: 0 2px 6px rgba(0,0,0,0.1)`)
* Szegély halvány szürke

```
 <div style="background: white; border-radius: 12px; padding: 1em; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
   <h2>Unió művelet</h2>
   <p>Két halmaz uniója az összes olyan elemből áll, amely legalább az egyik halmazban szerepel.</p>
 </div>
```

## 🧮 Gombok és Interaktív elemek

* Lekerekített sarkok
* `Inter`, félkövér, 1.1em
* Hover vagy aktív állapotban lila háttér + fehér szöveg + kis árnyék

```
 <button style="padding: 0.5em 1em; border-radius: 8px; font-weight: bold; background: #4A55A2; color: white;">
   Következő kérdés
 </button>
```

## 🔖 Navigációs elemek

* Menüpont alapértelmezetten: sötétszürke szöveg
* Aktív fül: lila szöveg, alul vonal (`border-bottom: 3px solid #4A55A2`)
* Fokozatos animáció: `transition: all 0.2s ease`

```
 <nav>
   <span style="padding: 0.5em; font-weight: bold; color: #4A55A2; border-bottom: 3px solid #4A55A2;">Gyakorlás</span>
   <span style="padding: 0.5em; color: #393E46;">Elmélet</span>
 </nav>
```
