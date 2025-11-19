# Színsémák

A felhasználók testreszabhatják a program színeit saját ízlésük szerint. Ez növeli az elkötelezettséget és a személyes érintettséget.

## Cél

- Könnyen változtatható színsémák definiálása.
- Konzisztens megjelenés biztosítása minden elemnél.

## Színséma Struktúra

Minden színséma tartalmazza ezeket a változókat:

- **Háttérszín**: Az oldal fő háttere (pl. #ffffff fehér).
- **Elsődleges szín**: Gombok, kiemelt elemek (pl. #007bff kék).
- **Másodlagos szín**: Határvonalak, inaktív elemek (pl. #6c757d szürke).
- **Szövegszín**: Normál szöveg (pl. #000000 fekete).
- **Sikeres szín**: Helyes válaszok, jó eredmények (pl. #28a745 zöld).
- **Hibás szín**: Rossz válaszok (pl. #dc3545 piros).

## Példa Színsémák

### 1. Alapértelmezett (Világos)
- Háttérszín: #ffffff
- Elsődleges szín: #007bff
- Másodlagos szín: #6c757d
- Szövegszín: #000000
- Sikeres szín: #28a745
- Hibás szín: #dc3545

### 2. Sötét Mód
- Háttérszín: #121212
- Elsődleges szín: #bb86fc
- Másodlagos szín: #3700b3
- Szövegszín: #ffffff
- Sikeres szín: #03dac6
- Hibás szín: #cf6679

### 3. Matematikai (Zöld-Kék)
- Háttérszín: #f0f8ff
- Elsődleges szín: #008000
- Másodlagos szín: #000080
- Szövegszín: #000000
- Sikeres szín: #32cd32
- Hibás szín: #ff4500

## Megvalósítás

- CSS változók használata (pl. --primary-color).
- Felhasználói beállítások menüben választható sémák.
- Opcionálisan saját színek megadása.
