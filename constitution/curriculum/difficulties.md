# Tananyagok Nehézsége és Súlyai

Ez a dokumentum részletezi a tananyagok nehézségét és súlyozását, amely alapján az XP rendszer számítja a jutalmakat. 
A súlyok (`topicWeight`) és egyéb paraméterek az `xp_formula.md` fájlból származnak, itt pedig szövegesen magyarázzuk el őket.

A súlyok (`topicWeight`) és egyéb paraméterek az `xp_formula.md` fájlból, 
a szintenkénti XP-követelmények pedig az `xp_roadmap.md` fájlból származnak; 
itt szövegesen magyarázzuk el, mit jelentenek ezek a számok.

## Cél

- Átlátható leírás minden főtéma, altéma és témakör nehézségről.
- Segítség a fejlesztőknek a tartalom tervezésében és a diákok számára a tanulási út irányításában.
- Referencia a `topicWeight` értékek értelmezéséhez; a tényleges XP-számítás az `xp_formula.md` szerint történik.

## Nehézség Skálája (topicWeight)

- **1.0**: Alap / átlagos nehézség (könnyen érthető alapfogalmak).
- **1.1**: Kicsit nehezebb (némi gyakorlás szükséges).
- **1.2**: Közepesen nehéz (logikai gondolkodást igényel).
- **1.3**: Nehéz (összetett problémák).
- **1.4**: Nagyon nehéz (emelt szint, mély matematikai ismeretek).

---

## Főtémák Áttekintése

### 1. Alapozó Modulok
- **Nehézség**: Alap / átlagos (topicWeight: 1.0).
- **Leírás**: Alapvető matematikai fogalmak, amelyekre minden további téma épül. Könnyebb, mert gyakorlati példákon keresztül vezetnek be.
- **Főtéma**: Alapozó modulok (topicWeight: 1.0, baseXP: 300).

### 2. Algebra és Függvények
- **Nehézség**: Közepes, növekvő komplexitás (topicWeight: 1.2).
- **Leírás**: Algebrai műveletek, egyenletek és függvények. Nehezebb, mert absztrakciót igényel, de alapozza a magasabb matematikát.
- **Főtéma**: Algebra és Függvények (topicWeight: 1.2, baseXP: 300).

### 3. Geometria
- **Nehézség**: Közepes–nehéz, vizuális gondolkodás (topicWeight: 1.2).
- **Leírás**: Sík- és térgeometria, transzformációk. Nehéz a térbeli képzelőerő miatt, de érdekes példák segítenek.
- **Főtéma**: Geometria (topicWeight: 1.2, baseXP: 300).

### 4. Valószínűségszámítás és Statisztika
- **Nehézség**: Nehéz, logikai kihívások (topicWeight: 1.3).
- **Leírás**: Kombinatorika, valószínűség. Sok diáknak okoz nehézséget a valószínűségi gondolkodás, ezért magasabb súly.
- **Főtéma**: Valószínűségszámítás és Statisztika (topicWeight: 1.3, baseXP: 300).

### 5. Emelt Szintű Kiegészítések
- **Nehézség**: Nagyon nehéz, haladó matematika (topicWeight: 1.4).
- **Leírás**: Sorozatok, analízis elemek. Csak emelt szintű diákoknak, mély elméleti ismeretekkel.
- **Főtéma**: Emelt modulok (topicWeight: 1.4, baseXP: 300).

---

## Altémák és Témakörök Részletei

### Alapozó Modulok Altémái
- **Gondolkodási módszerek, Halmazok** (topicWeight: 1.1): Bevezetés a logikai gondolkodásba, alap halmazműveletek. Közepes nehézség, mert új gondolkodásmódot igényel.
- **Számelmélet és Számrendszerek** (topicWeight: 1.1): Oszthatóság, prímtényezők. Nehezebb a számok tulajdonságainak megértése.
- **Racionális számok** (topicWeight: 1.0): Törtek, százalékok. Könnyebb, gyakorlati alkalmazásokkal.
- **Hatvány, Gyök, Logaritmus** (topicWeight: 1.2): Absztrakt műveletek. Nehéz az exponenciális gondolkodás.

### Algebra és Függvények Altémái
- **Algebrai kifejezések** (topicWeight: 1.1): Polinomok, azonosságok. Közepes, de sok gyakorlás kell.
- **Egyenletek, egyenlőtlenségek** (topicWeight: 1.2): Másodfokú egyenletek, paraméteres feladatok. Nehéz a megoldási stratégiák miatt.
- **Függvények általános tulajdonságai** (topicWeight: 1.2): Monotonitás, szélsőérték. Absztrakt, közepesen nehéz.
- **Nevezetes függvények** (topicWeight: 1.3): Trigonometrikus, exponenciális, logaritmikus függvények. Nehéz a grafikonok és tulajdonságok miatt.

### Geometria Altémái
- **Alapfogalmak és Háromszögek** (topicWeight: 1.2): Háromszögek, szögtételek. Közepes, vizuális jellegű.
- **Négyzetek és Sokszögek** (topicWeight: 1.2): Terület-, kerületszámítás. Közepes, gyakorlati.
- **A Kör** (topicWeight: 1.3): Kör tulajdonságai, szögek. Nehéz a geometriai kapcsolatok miatt.
- **Geometriai Transzformációk** (topicWeight: 1.3): Tükrözés, eltolás, forgatás, hasonlóság. Nehéz a koordinátageometriai leírás miatt.
- **Koordinátageometria** (topicWeight: 1.3): Vektorok, egyenesek, körök egyenlete. Nehéz az algebrai gondolkodás miatt.
- **Térgeometria** (topicWeight: 1.4): Hasábok, gúlák, forgástestek. Nagyon nehéz a térbeli képzelőerő és számolás együttese.

### Valószínűségszámítás és Statisztika Altémái
- **Kombinatorika** (topicWeight: 1.3): Permutációk, variációk, kombinációk. Nehéz a számolási stratégiák miatt.
- **Valószínűségszámítás** (topicWeight: 1.3): Klasszikus, feltételes, geometriai valószínűség. Nehéz a logikai kihívások miatt.
- **Statisztika** (topicWeight: 1.2): Középértékek, szóródás, adatelemzés. Közepes, de sok adatkezelés.

### Emelt Szintű Kiegészítések Altémái
- **Sorozatok** (topicWeight: 1.4): Számtani, mértani sorozatok, konvergencia. Nagyon nehéz a fogalmi mélység miatt.
- **Differenciálszámítás** (topicWeight: 1.4): Derivált, függvényvizsgálat. Nagyon nehéz az analízis-jelleg miatt.
- **Integrálszámítás** (topicWeight: 1.4): Határozatlan és határozott integrál, területszámítás. Nagyon nehéz a koncepció és technika együttese miatt.

---

## Témakörök Részletei (Teljes Lista)

### Alapozó Modulok Témakörök
- **Halmazműveletek** (topicWeight: 1.1): Venn-diagramok, alapműveletek. Könnyebb, vizuális megközelítéssel.
- **Logikai szita formula** (topicWeight: 1.1): Logikai gondolkodás, kivonásos számlálás. Közepes.
- **Skatulya-elv, párosítások** (topicWeight: 1.2): Kombinatorikai alapelv. Nehéz a gondolatmenet miatt.
- **Oszthatósági szabályok** (topicWeight: 1.0): Oszthatósági trükkök. Könnyebb, gyakorlati.
- **LNKO, LKKT** (topicWeight: 1.0): Legnagyobb közös osztó, legkisebb közös többszörös. Könnyebb technikai anyag.
- **Prímtényezős felbontás** (topicWeight: 1.1): Számok prímtényezős alakja. Közepes.
- **Számrendszerek** (topicWeight: 1.1): Bináris, decimális, átváltások. Közepes.
- **Törtek és műveletek** (topicWeight: 1.0): Törtek összeadása, kivonása, szorzása, osztása. Könnyebb, erősen gyakorlati.
- **Tizedes törtek, átváltások** (topicWeight: 1.0): Százalék–tört–tizedes átváltások. Könnyebb.
- **Százalékszámítás** (topicWeight: 1.1): Árengedmények, kamatok, arányok. Közepes.
- **Hatványozás azonosságai** (topicWeight: 1.2): Hatványozási szabályok. Nehéz, mivel szabálygyűjtemény.
- **Négyzetgyök, n-edik gyök** (topicWeight: 1.2): Gyökvonás, egyszerűsítések. Nehéz.
- **A logaritmus fogalma** (topicWeight: 1.3): Logaritmus definíciója, alapjai. Nagyon nehéz bevezető szinten.

### Algebra és Függvények Témakörök
- **Műveletek polinomokkal** (topicWeight: 1.1): Polinomösszeadás, kivonás, szorzás. Közepes.
- **Nevezetes azonosságok** (topicWeight: 1.1): (a+b)², (a-b)², stb. Közepes, sok gyakorlattal beépül.
- **Algebrai törtek** (topicWeight: 1.1): Törtek algebrai kifejezésekkel. Közepes.
- **Lineáris egyenletek** (topicWeight: 1.1): Egyszerűbb egyenletek és egyenletrendszerek. Közepes.
- **Másodfokú egyenlet** (topicWeight: 1.3): Másodfokú megoldóképlet, diszkrimináns. Nehéz.
- **Viète-formulák** (topicWeight: 1.2): Gyökök és együtthatók kapcsolata. Nehéz, de strukturált.
- **Paraméteres másodfokú egyenletek** (topicWeight: 1.3): Paraméterrel ellátott másodfokú egyenletek. Nehéz.
- **Abszolútértékes, gyökös, stb. egyenletek** (topicWeight: 1.3): Speciális alakú egyenletek. Nehéz.
- **Értelmezési tartomány, értékkészlet** (topicWeight: 1.1): Függvény alapfogalmak. Közepes.
- **Monotonitás, szélsőérték** (topicWeight: 1.2): Függvények növekedése, csökkenése, lokális és globális szélsőérték. Nehéz.
- **Paritás (páros/páratlan)** (topicWeight: 1.0): Páros és páratlan függvények. Könnyebb.
- **Függvénytranszformációk** (topicWeight: 1.2): Eltolás, tükrözés, nyújtás, zsugorítás. Nehéz.
- **Lineáris függvény** (topicWeight: 1.1): y = mx + b típusú függvények. Közepes.
- **Másodfokú függvény** (topicWeight: 1.3): Parabolák, tengely, csúcs. Nehéz.
- **Hatványfüggvények** (topicWeight: 1.2): xⁿ típusú függvények. Nehéz.
- **Exponenciális és logaritmus függvények** (topicWeight: 1.3): aˣ, logₐx. Nehéz.
- **Trigonometrikus függvények** (topicWeight: 1.4): szinusz, koszinusz, tangens. Nagyon nehéz.
- **Abszolútérték-függvény** (topicWeight: 1.2): |x| és variációi. Nehéz.

### Geometria Témakörök
- **Nevezetes vonalak** (topicWeight: 1.2): Magasság-, súly-, szögfelező-vonal. Közepes.
- **Háromszög-egyenlőtlenség** (topicWeight: 1.2): Oldalak közötti kapcsolatok. Közepes.
- **Pitagorasz, befogó, magasság** (topicWeight: 1.2): Derékszögű háromszög tételei. Közepes.
- **Szinusz-tétel, Koszinusz-tétel** (topicWeight: 1.3): Oldalak és szögek kapcsolata általános háromszögben. Nehéz.
- **Terület- és kerületszámítás** (topicWeight: 1.2): Sokszögek, szabályos alakzatok. Közepes.
- **Húrnégyszögek, érintőnégyszögek** (topicWeight: 1.2): Speciális négyszögek köri kapcsolatokkal. Közepes.
- **Kerületi és középponti szögek** (topicWeight: 1.3): Körön lévő szögek viszonyai. Nehéz.
- **Látókörív** (topicWeight: 1.3): Körív és hozzá tartozó szögek. Nehéz.
- **Kör és egyenes, kör és kör** (topicWeight: 1.3): Metszéspontok, érintők. Nehéz.
- **Tengelyes és középpontos tükörzés** (topicWeight: 1.3): Tükrözések síkban. Nehéz.
- **Eltolás, elforgatás** (topicWeight: 1.3): Transzformációk síkban. Nehéz.
- **Középpontos hasonlóság** (topicWeight: 1.3): Nagyítás, kicsinyítés. Nehéz.
- **Vektorok (skaláris szorzat)** (topicWeight: 1.3): Vektor fogalma, műveletek, skaláris szorzat. Nehéz.
- **Pont, szakasz, egyenes (koordinátageometria)** (topicWeight: 1.3): Egyenes egyenlete, szakaszok. Nehéz.
- **Kör egyenlete** (topicWeight: 1.3): Kör algebrai leírása. Nehéz.
- **Két alakzat metszéspontja** (topicWeight: 1.3): Egyenes–egyenes, egyenes–kör, kör–kör metszéspontjai. Nehéz.
- **Hasábok, gúlák F, V** (topicWeight: 1.4): Felszín, térfogat számítás térbeli testekre. Nagyon nehéz.
- **Forgástestek (henger, kúp, gömb)** (topicWeight: 1.4): Forgástestek felszíne, térfogata. Nagyon nehéz.

### Valószínűségszámítás és Statisztika Témakörök
- **Permutációk** (topicWeight: 1.3): Rendezések. Nehéz.
- **Variációk** (topicWeight: 1.3): Rendezett kiválasztások. Nehéz.
- **Kombinációk** (topicWeight: 1.3): Rendezetlen kiválasztások. Nehéz.
- **Binomiális tétel** (topicWeight: 1.3): (a+b)ⁿ kifejtése. Nehéz.
- **Klasszikus valószínűségi modell** (topicWeight: 1.3): Esetszámolás, kedvező/összes eset. Nehéz.
- **Geometriai valószínűség** (topicWeight: 1.3): Hossz, terület, térfogat alapú valószínűségek. Nehéz.
- **Feltételes valószínűség** (topicWeight: 1.3): Események kapcsolatai. Nehéz.
- **Adatok ábrázolása** (topicWeight: 1.2): Diagramok, grafikonok. Közepes.
- **Középértékek** (topicWeight: 1.2): Átlag, medián, módusz. Közepes.
- **Szóródási mutatók** (topicWeight: 1.2): Terjedelem, variancia, szórás. Közepes.

### Emelt Szintű Kiegészítések Témakörök
- **Számtani és mértani sorozatok** (topicWeight: 1.4): Sorozatok általános tagja, összegképletek. Nagyon nehéz.
- **Kamatoskamat-számítás** (topicWeight: 1.4): Pénzügyi sorozatok. Nagyon nehéz.
- **Konvergencia** (topicWeight: 1.4): Határérték sorozatoknál. Nagyon nehéz.
- **Határértékek, folytonosság** (topicWeight: 1.4): Függvények határértéke, folytonosság fogalma. Nagyon nehéz.
- **A derivált fogalma** (topicWeight: 1.4): Differenciálhányados, geometriai értelmezés. Nagyon nehéz.
- **Deriválási szabályok** (topicWeight: 1.4): Alap deriválási szabályok. Nagyon nehéz.
- **Függvényvizsgálat deriválttal** (topicWeight: 1.4): Monotonitás, szélsőérték derivált segítségével. Nagyon nehéz.
- **A határozatlan integrál** (topicWeight: 1.4): Primitív függvény. Nagyon nehéz.
- **A határozott integrál** (topicWeight: 1.4): Terület integrállal. Nagyon nehéz.
- **Newton–Leibniz formula** (topicWeight: 1.4): Kapcsolat a deriválás és integrálás között. Nagyon nehéz.
- **Térfogatszámítás integrállal** (topicWeight: 1.4): Forgástestek térfogata integrállal. Nagyon nehéz.


## Megvalósítás és Finomítás
- A konkrét XP értékek és szorzók az `xp_formula.md` fájlban vannak rögzítve.
- A szintenkénti XP-követelmények és szintnevek az `xp_roadmap.md` fájlban találhatók.
