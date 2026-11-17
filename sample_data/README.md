# Sample data (v2.0.0 debug runs, fillers shortened to 15 s, autopilot responses)

| File | What it is |
|---|---|
| `v2_auto1_close_A_*`, `v2_auto2_moderate_B_*` | two complete runs (the second with `name_label=0`). `_trials.csv` = jsPsych trial-level CSV (participant columns repeated); `_qualtrics_fields.json` = exactly what would be written to Qualtrics embedded data |
| `v2_reload_acquaintance_A_*` | a run reloaded during familiarization → `reloaded_post_fam = 1`, `reload_stage = fam`, no trial data |
| `mock_qualtrics_export.csv` | fake Qualtrics export (3-row header) built from the three runs by `tools/make_mock_export.py` |
| `sample_long_format.csv` | `analysis/reshape_qualtrics.py mock_qualtrics_export.csv --include-debug` → one row per trial, with `k`, `f` and the unpacked `known_*` / `unfam_*` feature columns |
| `_preview/*.png` | rendered stimuli: novel objects, strangers + foils, incidental objects × 4 colors, a scene's final frame, the face test, and four designer sections |

Autopilot responses are random, so accuracy values are meaningless.
