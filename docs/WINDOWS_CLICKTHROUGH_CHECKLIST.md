# Windows Manual Click-through Checklist

Use this checklist for a quick, manual UI sanity pass on native Windows (10/11).
Scope: app shell, module load, navigation, settings, results, achievements.

## Test metadata
- Date:
- Tester:
- Windows version:
- App build (dev/packaged) + version:
- Notes:

## Preflight
- [ ] Launch from the intended build (dev or packaged) and note which.
- [ ] Optional clean profile: set `MATEK_MESTER_USER_DATA` to a fresh folder or delete `progress.json` and `settings.json` in userData.

## App shell (header + Quest Log)
- [ ] App opens without crash; app shell renders (header, Quest Log, main content).
- [ ] Header shows MatekMester title, XP bar, avatar, buff icons, hamburger.
- [ ] Quest Log lists modules; quick links show `Eredményeim` and `Achievementek`.
- [ ] Disclosure arrows (▶/▼) render correctly on Windows.
- [ ] Settings button (gear) is visible in the bottom-right.

## Module load
- [ ] Click a module in Quest Log; iframe loads the correct module title.
- [ ] Tabs are present: Elmélet, Vizuális modell, Teszt, Gyakorlás (and extra Elmélet tabs if any).
- [ ] If module is NOT_ACCEPTED, `Küldetés elfogadása` button appears.
- [ ] Clicking `Küldetés elfogadása` updates Quest Log state to ACTIVE (no muted styling, button disappears).
- [ ] Switch to another module and back; no blank or stuck iframe.

## Navigation
- [ ] Hamburger toggles Quest Log show/hide; layout adjusts without overlap.
- [ ] Avatar opens Character Sheet; returning via Quest Log or list links works.
- [ ] `Eredményeim` quick link opens results view and can return to a module.
- [ ] `Achievementek` quick link opens achievements view and can return to a module.

## Settings
- [ ] Open Settings overlay from the gear button; focus moves into the overlay.
- [ ] Switch between categories (Skin/Theme, UI, Sound, Gameplay) without errors.
- [ ] Change one setting; `Mentés` applies, `Mégse` discards.
- [ ] Closing the overlay returns to the same module/tab as before.

## Results (Eredményeim)
- [ ] Results view loads without errors (empty state is acceptable).
- [ ] If results exist, latest entries show correct labels and formatting.
- [ ] Navigation back to a module preserves shell state.

## Achievements (Achievementek)
- [ ] Achievements view loads without errors.
- [ ] Locked/unlocked states render correctly; XP bonus summary shows if present.
- [ ] If an achievement unlocks during the session, the toast appears and can be dismissed.

## Issues
- [ ] None
- Notes:
