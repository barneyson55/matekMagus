# Windows Installer + Auto-Update

Ez a dokumentum a Windows telepítő és az automatikus frissítés használatát rögzíti.

## Parancsok (PowerShell)

### Tiszta telepítés
```powershell
npm ci
```

### App futtatása fejlesztésben
```powershell
npm start
```

### Windows telepítő build (NSIS + portable)
```powershell
npm run dist:win
```

### Frissítés publikálása GitHub Releases-re
```powershell
$env:GH_TOKEN = "YOUR_GITHUB_TOKEN"
npm run publish:win
Remove-Item Env:GH_TOKEN
```

Megjegyzés: a `GH_TOKEN` ne kerüljön verziókezelésbe; repo scope szükséges.

## Auto-update működés
- Automatikus frissítés **csak** telepített (NSIS) build esetén működik.
- A portable build **nem** támogat csendes auto-update-et; kézi letöltést igényel.

## „Új verzió kiadása” lépések
1) Emeld a verziót a `package.json` fájlban.
2) Build + publikálás: `npm run publish:win`.
3) Ellenőrizd a GitHub Release asseteket:
   - `latest.yml`
   - `*.blockmap`
   - NSIS telepítő `.exe`
4) Telepíts egy korábbi verziót, indítsd el az appot, és ellenőrizd, hogy a frissítés automatikusan feltelepül.

## Kimenet
- A build artefaktok a `dist/` mappába kerülnek.
