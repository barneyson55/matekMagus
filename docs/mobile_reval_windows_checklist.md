# MOBILE-REVAL-001 – Windows small-screen manual validation checklist

Target: validate mobile app shell + Quest Log drawer behavior on Windows desktop build in a small-screen viewport.

## Environment
- Windows desktop run (`npm run dev` or packaged app)
- Small-screen viewport preset (e.g. 360x740 and 390x844)
- Fresh app launch

## Steps
1. Open app shell at small viewport.
2. Open Quest Log drawer.
3. Verify drawer opens fully, no clipped controls, close button reachable.
4. Close drawer via close control.
5. Re-open drawer and navigate between at least two module entries.
6. Check no horizontal overflow on root/app shell/drawer.
7. Check module navigation remains usable after drawer close.
8. Repeat once after window resize (portrait-like -> wider mobile).

## Record
- Result: PASS / FAIL
- Notes: any overflow, clipped text, unreachable controls, stuck states
- Screenshot(s): optional but recommended for failures
