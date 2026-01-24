# Module Consistency Check

This project expects every questable module to expose the same tab structure and
emit a consistent test result payload. A lightweight script validates this
without adding new dependencies.

## Script

Run from the repo root:

```
node scripts/check_module_consistency.js
```

Optional flags:

- `--allow-missing`: ignore missing module files referenced by `index.html`.

The script exits with a non-zero status if it finds missing tabs or payload
fields (or missing files, unless `--allow-missing` is used).

## Required Tabs

Each module referenced by `index.html` should include tabs that cover:

- Theory (labels containing `Elmelet` or `Kulcsfogalmak`/`Fogalmak`/`Alapok`)
- Visual model (labels containing `Vizualis`)
- Test (labels containing `Teszt`)
- Practice (labels containing `Gyakorlas`)

## Expected `testResult` Payload

Modules should post a `testResult` message containing a `result` object with
(at minimum) these fields:

- `topicId`
- `topicName`
- `difficulty`
- `grade`
- `percentage`
- `timestamp`
- `questions`

Note: `main.js` treats `percentage` and `grade` as numbers and `timestamp` as an
ISO string when building result history. Keep payload types consistent.
