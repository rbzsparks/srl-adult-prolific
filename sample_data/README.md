# Sample data (v2.2.0 debug runs with Prototype.js loaded; fillers shortened to 5 s countdown + 15 s arithmetic; autopilot responses)

| File | What it is |
|---|---|
| `u12_auto1_close_A_*` | a complete **unique12** run, started without `design_version` (so `design_version_source = config_fallback`). `_trials.csv` = jsPsych trial-level CSV (participant columns repeated); `_qualtrics_fields.json` = exactly what would be written to Qualtrics embedded data |
| `r6_auto1_close_AY_*`, `r6_auto2_moderate_BX_*` | two complete **repeat6** runs (list A / stranger set Y; list B / set X) |
| `r6_reload_acquaintance_AX_*` | a repeat6 run reloaded during familiarization → `reloaded_post_fam = 1`, `reload_stage = fam`, no trial data |
| `mock_qualtrics_export.csv`, `mock_qualtrics_export_repeat6.csv` | fake Qualtrics exports (3-row header), one per survey, built by `tools/make_mock_export.py` (`--design repeat6`) |
| `sample_long_format.csv`, `sample_long_format_repeat6.csv` | `analysis/reshape_qualtrics.py <export> --include-debug` → one row per trial, with `serial_position` (and for repeat6 `presentation`, `lag`, `serial_position_2`), `k`, `f` and the unpacked `known_*` / `unfam_*` feature columns |
| `_preview/*.png` | rendered unique12 stimuli: novel objects, strangers + foils, incidental objects × 4 colors, a scene's final frame, the face test, and four designer sections |

Autopilot responses are random, so accuracy values are meaningless.
