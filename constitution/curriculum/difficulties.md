# Tananyagok Nehézsége és Súlyai

Ez a dokumentum részletezi a tananyagok nehézségét és súlyozását, amely alapján az XP rendszer számítja a jutalmakat. A súlyok (topicWeight) és egyéb paraméterek az xp_progress_plan.md fájlból származnak, itt magyarázzuk el őket részletesen.

## Cél

- Átlátható leírás minden főtéma, altéma és témakör nehézségről.
- Segítség a fejlesztőknek a tartalom tervezésében és a diákok számára a tanulási út irányításában.

## Nehézség Skálája

- **1.0**: Alap / átlagos nehézség (könnyen érthető alapfogalmak).
- **1.1**: Kicsit nehezebb (némi gyakorlás szükséges).
- **1.2**: Közepesen nehéz (logikai gondolkodás igényel).
- **1.3**: Nehéz (összetett problémák).
- **1.4**: Nagyon nehéz (emelt szint, mély matematikai ismeretek).

## Főtémák Áttekintése

### 1. Alapozó Modulok (domainWeight ≈ 1.0)
- **Nehézség**: Alacsony, bevezető szint.
- **Leírás**: Alapvető matematikai fogalmak, amelyekre minden további téma épül. Könnyebb, mert gyakorlati példákon keresztül vezetnek be.
- **Főtéma**: Alapozó modulok (topicWeight: 1.0, baseXP: 150).

### 2. Algebra és Függvények (domainWeight ≈ 1.2)
- **Nehézség**: Közepes, növekvő komplexitás.
- **Leírás**: Algebrai műveletek, egyenletek és függvények. Nehezebb, mert absztrakciót igényel, de alapozza a magasabb matematikát.
- **Főtéma**: Algebra és Függvények (topicWeight: 1.2, baseXP: 180).

### 3. Geometria (domainWeight ≈ 1.2–1.3)
- **Nehézség**: Közepes-nehéz, vizuális gondolkodás.
- **Leírás**: Sík- és térgeometria, transzformációk. Nehéz a térbeli képzelőerő miatt, de érdekes példák segítenek.
- **Főtéma**: Geometria (topicWeight: 1.2–1.3, baseXP: hasonlóan 180-as szinten).

### 4. Valószínűségszámítás és Statisztika (domainWeight ≈ 1.3)
- **Nehézség**: Nehéz, logikai kihívások.
- **Leírás**: Kombinatorika, valószínűség. Sok diáknak okoz nehézséget a valószínűségi gondolkodás, ezért magasabb súly.
- **Főtéma**: Valószínűségszámítás (topicWeight: 1.3, baseXP: magasabb).

### 5. Emelt Szintű Kiegészítések (domainWeight ≈ 1.4)
- **Nehézség**: Nagyon nehéz, haladó matematika.
- **Leírás**: Sorozatok, analízis elemek. Csak emelt szintű diákoknak, mély elméleti ismeretekkel.
- **Főtéma**: Emelt modulok (topicWeight: 1.4, baseXP: legmagasabb).

## Altémák és Témakörök Részletei

### Alapozó Modulok Altémái
- **Gondolkodási módszerek, Halmazok** (topicWeight: 1.1): Bevezetés a logikai gondolkodásba, alap halmazműveletek. Közepes nehézség, mert új gondolkodásmódot igényel.
- **Számelmélet és Számrendszerek** (topicWeight: 1.1): Oszthatóság, prímtényezők. Nehéz a számok tulajdonságainak megértése.
- **Racionális számok** (topicWeight: 1.0): Törtek, százalékok. Könnyebb, gyakorlati alkalmazásokkal.
- **Hatvány, Gyök, Logaritmus** (topicWeight: 1.2): Absztrakt műveletek. Nehéz az exponenciális gondolkodás.

### Algebra és Függvények Altémái
- **Algebrai kifejezések** (topicWeight: 1.1): Polinomok, azonosságok. Közepes, de sok gyakorlás kell.
- **Egyenletek, egyenlőtlenségek** (topicWeight: 1.2): Másodfokú egyenletek, paraméteres. Nehéz a megoldási stratégiák miatt.
- **Függvények általános tulajdonságai** (topicWeight: 1.2): Monotonitás, szélsőérték. Absztrakt, közepesen nehéz.
- **Nevezetes függvények** (topicWeight: 1.3): Trigonometrikus, exponenciális. Nehéz a grafikonok és tulajdonságok miatt.

## Példák Témakörökre
- **Halmazműveletek** (topicWeight: 1.1): Venn-diagramok, alapműveletek. Könnyebb, vizuális.
- **Másodfokú függvény** (topicWeight: 1.3): Parabolák, csúcspont. Nehéz a geometriai kapcsolatok miatt.
- **Trigonometrikus függvények** (topicWeight: 1.4): Szögfüggvények, identitások. Nagyon nehéz, sok formula.

## Megvalósítás és Finomítás
- A súlyok kézzel állítandók, tesztelés alapján módosítandók.
- Hivatkozás az xp_progress_plan.md-re a pontos számokért.
- Cél: A nehézség tükrözze a valódi tanulási kihívásokat, motiválva a diákokat.
