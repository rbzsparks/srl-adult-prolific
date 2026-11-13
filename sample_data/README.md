# Sample data (debug runs, placeholder audio, fillers shortened to 15 s, autopilot responses)

| File | What it is |
|---|---|
| `TEST001_close_A_*`, `TEST002_acquaintance_B_*` | two complete runs. `_trials.csv` = jsPsych trial-level CSV (participant columns repeated); `_qualtrics_fields.json` = exactly what would be written to Qualtrics embedded data |
| `LAYOUT_moderate_B_*` | a run reloaded during familiarization → `reloaded_post_fam = 1`, `reload_stage = fam`, no trial data |
| `mock_qualtrics_export.csv` | fake Qualtrics export (3-row header) built from the three runs by `tools/make_mock_export.py` |
| `sample_long_format.csv` | `analysis/reshape_qualtrics.py mock_qualtrics_export.csv --include-debug` → one row per trial, with `k` and `f` |
| `_preview/*.png` | rendered stimuli: novel objects, strangers + foils, incidental objects × 4 colors, and a scene's final frame |

Autopilot responses are random, so accuracy values are meaningless.
