# Tananyag Roadmap

Ez a dokumentum tartalmazza a teljes tananyag szerkezetét, amely alapján a matekMagus alkalmazás épül. A roadmap hierarchikusan szervezi a főtémákat, altémákat és témaköröket, hogy átlátható legyen a tanulási út. A szerkezet az index.html fájlból és a temakorok szöveges fájlból származik, ahol a topicId-k és nevek definiáltak.

## Cél

- Átlátható tanulási út biztosítása a diákok számára.
- Segítség a fejlesztőknek a modulok tervezésében és implementálásában.
- Hivatkozás az XP rendszerre (lásd xp_progress_plan.md) és a nehezségekre (lásd difficulties.md).

## Tananyag Hierarchia

### 1. Alapozó Modulok (alapozo_modulzaro)
- **Leírás**: Bevezető matematikai alapok, amelyek minden további témára épülnek.
- **Altémák**:
  - Gondolkodási módszerek, Halmazok (gondolkodas_temazaro)
    - Halmazműveletek (halmazmuveletek)
    - Logikai szita formula (logikai_szita)
    - Skatulya-elv, párosítások (skatulya_elv)
  - Számelmélet és Számrendszerek (szamelmelet_temazaro)
    - Oszthatósági szabályok (oszthatosag)
    - LNKO, LKKT (lnko_lkkt)
    - Prímtényezős felbontás (primtenyezok)
    - Számrendszerek (szamrendszerek)
  - Racionális számok (racionalis_szamok_temazaro)
    - Törtek és műveletek (tortek)
    - Tizedes törtek, átváltások (tizedes_tortek)
    - Százalékszámítás (szazalekszamitas)
  - Hatvány, Gyök, Logaritmus (hatvany_temazaro)
    - Hatványozás azonosságai (hatvanyozas)
    - Négyzetgyök, n-edik gyök (gyokvonas)
    - A logaritmus fogalma (logaritmus)

### 2. Algebra és Függvények (algebra_modulzaro)
- **Leírás**: Algebrai kifejezések, egyenletek és függvények általános elmélete.
- **Altémák**:
  - Algebrai kifejezések (algebrai_kif_temazaro)
    - Műveletek polinomokkal (polinomok)
    - Nevezetes azonosságok (nevezetes_azonossagok)
    - Algebrai törtek (algebrai_tortek)
  - Egyenletek, Egyenlőtlenségek (egyenletek_temazaro)
    - Lineáris egyenletek (linearis_egyenletek)
    - Másodfokú egyenlet (masodfoku_egyenlet)
    - Viète-formulák (viete_formulak)
    - Paraméteres másodfokú egyenletek (parameteres_masodfoku)
    - Abszolútértékes, gyökös stb. (specialis_egyenletek)
  - Függvények általános tulajdonságai (fuggvenyek_alt_temazaro)
    - Értelmezési tartomány, értékkészlet (fuggveny_alapok)
    - Monotonitás, szélsőértékek (fuggveny_jellemzes)
    - Paritás (páros, páratlan) (paritas)
    - Függvénytranszformációk (fuggveny_transzformaciok)
  - Nevezetes függvények (nevezetes_fuggvenyek_temazaro)
    - Lineáris függvény (linearis_fuggveny)
    - Másodfokú függvény (masodfoku_fuggveny)
    - Hatványfüggvények (hatvanyfuggvenyek)
    - Exponenciális és logaritmus fv. (exp_log_fuggveny)
    - Trigonometrikus fv. (trigonometrikus_fuggvenyek)
    - Abszolútérték, gyök fv. (specialis_fuggvenyek)

### 3. Geometria (geometria_modulzaro)
- **Leírás**: Sík- és térgeometria, transzformációk és koordinátageometria.
- **Altémák**:
  - Alapfogalmak és Háromszögek (haromszogek_temazaro)
    - Nevezetes vonalak (nevezetes_vonalak)
    - Háromszög-egyenlőtlenség (haromszog_egyenlotlenseg)
    - Pitagorasz, befogó, magasság (szogtetelek)
    - Szinusz-tétel, Koszinusz-tétel (szinusz_koszinusz_tetel)
  - Négyzetek és Sokszögek (sokszogek_temazaro)
    - Terület- és kerületszámítás (terulet_kerulet)
    - Húrnégyszögek, érintőnégyszögek (specialis_negyszogek)
  - A Kör (kor_temazaro)
    - Kerületi és középponti szögek (keruleti_szogek)
    - Látókörív (latokoriv)
    - Kör és egyenes, kör és kör (kor_helyzetek)
  - Geometriai Transzformációk (geo_transzform_temazaro)
    - Tengelyes és középpontos tükörzés (tukrozes)
    - Eltolás, elforgatás (eltolas_forgatas)
    - Középpontos hasonlóság (hasonlosag)
  - Koordinátageometria (koordinatageometria_temazaro)
    - Vektorok (skaláris szorzat) (vektorok)
    - Pont, szakasz, egyenes (egyenes_egyenlete)
    - Kör egyenlete (kor_egyenlete)
    - Két alakzat metszéspontja (alakzatok_metszespontja)
  - Térgeometria (tergeometria_temazaro)
    - Hasábok, gúlák F, V (hasabok_gulak)
    - Forgástestek (henger, kúp, gömb) (forgastestek)

### 4. Valószínűségszámítás és Statisztika (valstat_modulzaro)
- **Leírás**: Kombinatorika, valószínűség és statisztikai alapok.
- **Altémák**:
  - Kombinatorika (kombinatorika_temazaro)
    - Permutációk (permutaciok)
    - Variációk (variaciok)
    - Kombinációk (kombinaciok)
    - Binomiális tétel (binomialis_tetel)
  - Valószínűségszámítás (valszam_temazaro)
    - Klasszikus valószínűségi modell (klasszikus_valoszinuseg)
    - Geometriai valószínűség (geometriai_valoszinuseg)
    - Feltételes valószínűség (felteteles_valoszinuseg)
  - Statisztika (statisztika_temazaro)
    - Adatok ábrázolása (adatok_abrazolasa)
    - Középértékek (kozepertekek)
    - Szóródási mutatók (szorodas)

### 5. Emelt Szintű Kiegészítések (emelt_modulzaro)
- **Leírás**: Haladó témák, mint sorozatok és analízis elemek.
- **Altémák**:
  - Sorozatok (sorozatok_temazaro)
    - Számtani és mértani sorozatok (szamtani_mertani)
    - Kamatoskamat-számítás (kamatoskamat)
    - Konvergencia (konvergencia)
  - Differenciálszámítás (differencial_temazaro)
    - Határértékek, folytonosság (hatarertek)
    - A derivált fogalma (derivalt_fogalma)
    - Deriválási szabályok (derivalasi_szabalyok)
    - Függvényvizsgálat deriválttal (fuggvenyvizsgalat)
  - Integrálszámítás (integral_temazaro)
    - A határozatlan integrál (hatarozatlan_integral)
    - A határozott integrál (hatarozott_integral)
    - Newton-Leibniz formula (newton_leibniz)
    - Terfogatszámítás integrállal (terfogatszamitas)

## Megvalósítás és Hivatkozások
- Minden topicId egyedi és az index.html-ben definiált.
- A nevek és szerkezet a temakorok fájlból származnak.
- XP súlyok és nehezségek: lásd xp_progress_plan.md és difficulties.md.
- A roadmap alapján lehet tervezni a modulokat és a tanulási utat.
