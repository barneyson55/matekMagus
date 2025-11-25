---

title: "nav-style.md"
description: "Navigációs felület és menüpontok stílusleírása"
-------------------------------------------------------------

# Navigációs Stílus – `nav-style.md`

Ez a dokumentum részletesen ismerteti a bal oldali főmenü, valamint a lapfülek vizuális stílusát és megjelenítési logikáját. A cél, hogy minden témakör és modul egységes vizuális keretrendszerbe illeszkedjen.

## 📌 Általános felépítés

* A fő navigációs menüsáv (bal oldalon) fix pozícióban jelenik meg.
* A menüpontokat fülek ("tabs") formájában kezeljük.
* Minden fülhöz külön HTML szekció tartozik, amelyek `display: none` és `display: block` segítségével váltakoznak.

## 🧭 Menüelemek

| Menüfül         | Tartalom                          | Vizsgálat alatt lévő fájl | Megjelenítési stílus                          |
| --------------- | --------------------------------- | ------------------------- | --------------------------------------------- |
| Kulcsfogalmak   | Elméleti definíciók, példák       | halmazmuveletek.html      | Inter, 1.1em, félkövér, sötétszürke (#393E46) |
| Vizuális Modell | Ábrák, grafikonok, műveletek      | halmazmuveletek.html      | Inter, 1.1em, világos háttér, halvány szegély |
| Teszt           | Gyors kvíz, XP szerzés            | halmazmuveletek.html      | Inter, 1.1em, aláhúzás, aktív állapotban lila |
| Gyakorlás       | Ismétlő feladatok, nehézség szűrő | halmazmuveletek.html      | Inter, dőlt, szűrőcheckbox, XP infóval        |

## 🎨 Aktív állapot

Az aktív menüfül minden esetben:

* **Szín:** Lila (`#4A55A2`)
* **Aláhúzás:** `border-bottom: 3px solid #4A55A2`
* **Animáció:** `transition: border-bottom 0.2s ease`

```
 <span class="tab-button active">
   Teszt
 </span>
```

## 🖼️ Példa menü HTML markup-ra

```
<nav class="main-tabs">
  <span class="tab-button" data-tab="elmelet">Kulcsfogalmak</span>
  <span class="tab-button" data-tab="vizualis">Vizuális Modell</span>
  <span class="tab-button active" data-tab="teszt">Teszt</span>
  <span class="tab-button" data-tab="gyakorlas">Gyakorlás</span>
</nav>
```

## ✨ Speciális jellemzők

* Hover eseményre halvány háttérváltozás: `background-color: #f0f4ff`
* Bal oldali sáv kiemelt vizuális dizájnelem: vékony árnyék, háttérszín: `#F5F9FF`
* Egyes fülek (pl. Gyakorlás) extra elemeket tartalmaznak (checkbox szűrők, XP jutalom leírás)

## 🎯 Elnevezési konvenciók

| Funkció          | Class név             |
| ---------------- | --------------------- |
| Menü konténer    | `main-tabs`           |
| Fül gomb         | `tab-button`          |
| Aktív fül        | `tab-button active`   |
| Szűrő konténer   | `difficulty-selector` |
| XP szövegblokkok | `practice-info`       |

Ez a struktúra biztosítja a következetes és RPG-hangulatú navigációs élményt a MatekMágus teljes rendszerén belül.
