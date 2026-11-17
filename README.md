# Social relevance and learning from strangers: adult Prolific experiment

jsPsych 8.2.1 experiment, embedded in a **Qualtrics** survey (classic layout), recruited on **Prolific**.
Participants name someone they know (closeness category assigned between subjects), rate closeness (IOS), contact
frequency and relationship duration, build an avatar of that person, do a sliding puzzle, watch 12 animated
scenes with audio, do an arithmetic filler, and then take surprise memory tests for words, faces and incidental objects.

Order of precedence for the design documents: `ANSWERS_ROUND2.md` > `UPDATES_v2.md` > `ANSWERS_FOR_CLAUDE_CODE.md` > `EXPERIMENT_SPEC.md`.

---

## Contents

1. [Files](#1-files)
2. [Run it locally](#2-run-it-locally)
3. [Deploy to GitHub Pages](#3-deploy-to-github-pages)
4. [Qualtrics setup](#4-qualtrics-setup)
5. [Prolific setup](#5-prolific-setup)
6. [Configuration and [DECISION] flags](#6-configuration-and-decision-flags)
7. [Procedure and timing](#7-procedure-and-timing)
8. [Counterbalancing and randomization](#8-counterbalancing-and-randomization)
9. [Stimuli](#9-stimuli)
10. [Audio](#10-audio)
11. [Data saving](#11-data-saving)
12. [Reshaping the Qualtrics export](#12-reshaping-the-qualtrics-export)
13. [Data dictionary](#13-data-dictionary)
14. [Data quality and exclusion support](#14-data-quality-and-exclusion-support)
15. [Privacy](#15-privacy)
16. [What the researcher still needs to supply](#16-what-the-researcher-still-needs-to-supply)
17. [Known limitations and untested paths](#17-known-limitations-and-untested-paths)

---

## 1. Files

```
experiment/                  ← publish this folder on GitHub Pages
  config.js                  all counts, timings, codes and [DECISION] flags
  index.html                 local runner (same code Qualtrics loads)
  css/experiment.css
  lib/jspsych.js             jsPsych 8.2.1 (vendored, so the study doesn't depend on a CDN)
  js/loader.js               loads everything from a base URL and starts the study
  js/main.js                 timeline, sections, reload handling, finishing
  js/screens.js              intro, name, relationship, IOS, contact, duration, audio check, messages
  js/designer.js             avatar designer (6 tabs, 16 sliders) + likeness rating
  js/people.js               shaded parametric figure renderer + animation rig (gaze, turn, mouth)
  js/avatar_rules.js         unfamiliar-person rule, natural hair-colour scale, similar styles, foil maker + checks
  js/objects.js              novel objects (12) and recolorable incidental objects (12)
  js/scene.js                animated familiarization scene, AOIs, MouseView option
  js/fillers.js              sliding puzzle; arithmetic verification
  js/tests.js                word / face / incidental tests
  js/stimuli.js              loads stimuli.json; lists, orders, foils
  js/audio.js                Web Audio preload, playback, amplitude lip-sync, pause segmentation
  js/data.js                 Qualtrics (legacy / NSTE), JSON chunks, DataPipe, local download
  js/progress.js             reload marker (localStorage), leave-page warning
  js/fields.js               THE list of embedded-data fields (shared with the Python tools)
  stimuli/stimuli.json       scene sets: stranger + foil feature vectors, foil change, object, word (+IPA), incidental type, voice
  stimuli/svg/               exported SVGs of every stimulus (see §9)
  audio/                     <clip_id>.mp3 + .ogg, audio_manifest.csv (recording script)
qualtrics/
  survey.qsf                 importable survey (flow, randomizer, fields, JS question, post-test, debrief, redirects)
  experiment_question.js     the JS in the experiment question (for pasting manually if needed)
  device_check_question.js   the JS in the device-check question
  embedded_data_fields.txt   every embedded-data field declared in the survey flow
analysis/
  reshape_qualtrics.py       Qualtrics export (wide) → long format, one row per trial
tools/
  dev_server.py              local server (also lets debug runs write into sample_data/)
  stimulus_sheet.html        preview every stimulus; "Export SVGs" writes experiment/stimuli/svg/
  scene_preview.html         play any scene in either condition; show the final frame + AOIs
  designer_preview.html      run the avatar designer + likeness question on their own; shows the unfamiliar person
  make_foils.html            (re)generate the frozen face-test foils from FOIL_K / FOIL_STEP; checks the 6 foil rules
  build_qsf.py               regenerates qualtrics/survey.qsf from config.js + fields.js
  make_placeholder_audio.py  placeholder TTS (Windows voices) → normalize
  normalize_audio.py         trim / −16 LUFS / limiter / 44.1 kHz mono / MP3 + OGG (rerun on final recordings)
  tts_sapi.ps1, audio_common.py
  make_mock_export.py        builds a fake Qualtrics export from debug runs (to test the reshape script)
sample_data/                 outputs of debug runs (see §12)
```

## 2. Run it locally

```bash
python tools/dev_server.py
```

Then open `http://localhost:8000/experiment/index.html?debug=1`. URL parameters:

| Parameter | Meaning |
|---|---|
| `PROLIFIC_PID`, `STUDY_ID`, `SESSION_ID` | as Prolific sends them |
| `category` | `acquaintance` \| `moderate` \| `close` (random if missing) |
| `list` | `A` \| `B` (random if missing) |
| `debug=1` | fillers shortened to 15 s; condition / stimulus IDs shown on screen; no DataPipe; data downloaded |
| `name_label` | `0` hides / `1` shows the name text beneath the person in scenes (overrides `SHOW_NAME_LABEL`) |
| `auto=1` | with `debug=1`: autopilot clicks through the whole study (~3–4 min) |
| `devsave=1` | with the dev server: write output files into `sample_data/` instead of downloading |
| `reset=1` | clear the reload marker for this PROLIFIC_PID (otherwise a second visit counts as a reload) |

Example full walkthrough: `…/index.html?debug=1&auto=1&devsave=1&PROLIFIC_PID=TEST001&category=close&list=A&reset=1`.

`tools/scene_preview.html` plays any scene in either condition (with sound) and shows the final frame and AOIs.

## 3. Deploy to GitHub Pages

**Status:** done on 2026-11-13. The repo is <https://github.com/rbzsparks/srl-adult-prolific> (public), Pages serves `main` / root, and the .qsf in `qualtrics/` already uses the base URL below. To update the live study, commit and `git push`; Pages redeploys in about a minute.

1. Create a public repo under `rbzsparks`, `srl-adult-prolific`, and push this folder.
2. Repo **Settings → Pages → Deploy from a branch → main / root**.
3. The experiment base URL is then `https://rbzsparks.github.io/srl-adult-prolific/experiment/`.
4. Rebuild the .qsf with that URL (or edit `BASE_URL` in the experiment question's JS after import):
   ```bash
   python tools/build_qsf.py --base-url https://rbzsparks.github.io/srl-adult-prolific/experiment/ --completion-code YOURCODE --screenout-code YOURCODE2
   ```
5. **Cross-origin check.** Qualtrics loads the scripts with `<script>` tags (no CORS needed) and the audio and
   `stimuli.json` with `fetch()`, which does need CORS. GitHub Pages sends `Access-Control-Allow-Origin: *`
   (checked 2026-11-13 on a github.io page). To confirm on your repo:
   ```bash
   curl -sI https://rbzsparks.github.io/srl-adult-prolific/experiment/audio/greet_s01.mp3 | grep -i access-control
   ```
   It should print `access-control-allow-origin: *`. Then do a Qualtrics preview with `debug=1` (see §4). The
   loading bar fills only if all 51 clips were fetched and decoded with the Web Audio API.
   `audio_load_errors` in the data counts any that failed.
   Without Qualtrics, `tools/remote_load_test.html` (served by `tools/dev_server.py`) loads the live study from
   GitHub Pages into a page on another origin, the same way the Qualtrics question does. Add `?auto=1` for an
   autopilot run. Tested 2026-11-13: all scripts loaded, 51/51 audio clips decoded, real playback, no errors.
6. **Caching.** GitHub Pages caches for about 10 minutes. The question JS appends `?v=<VERSION>` to every file,
   so bump `VERSION` in `config.js` and in the question JS (`VERSION = '…'`) when you change files mid-study.

## 4. Qualtrics setup

### 4.1 One-minute test that custom JavaScript is allowed (Harvard license)

1. Make a blank survey with one text/graphic question → **Question behavior → JavaScript**.
2. Paste:
   ```js
   Qualtrics.SurveyEngine.addOnload(function () { console.log('SRL JS test OK', this.questionId); alert('JavaScript works'); });
   ```
3. **Preview**. If an alert appears (and the console shows the line), custom JS is allowed. If the JavaScript
   option is missing or nothing happens, ask Harvard's Qualtrics admins to enable custom JavaScript for your account.

### 4.2 Import

**Create project → Survey → From a file → `qualtrics/survey.qsf`.**

Survey flow in the .qsf:

1. **Embedded Data**: `PROLIFIC_PID`, `STUDY_ID`, `SESSION_ID`, `debug`, `name_label` (from the URL), plus every field the experiment writes (379 fields in total; listed in `qualtrics/embedded_data_fields.txt`).
2. **Device check** (JS, before consent): mobile/tablet, no mouse/trackpad, or a screen smaller than 1024 × 650 physical pixels (either orientation; measured as CSS pixels × `devicePixelRatio`, so Windows display scaling or browser zoom doesn't fail an ordinary laptop) → message showing the detected reason and screen size → **End of Survey → redirect to `…/complete?cc=SCREENOUT_CODE`**. Qualtrics' preview has a **Mobile view** toggle; with it on, a phone-sized frame is shown, so preview with it off.
3. **Consent** (placeholder text, shows the ~20 min estimate). "I do not agree" → "Please return this study on Prolific" (no Next button, no code).
4. **Randomizer**: present 1 of 6, **evenly present** on. Each element sets `category` (acquaintance / moderate / close) × `list` (A / B).
5. **Experiment (JS)**: one question whose JS loads the experiment from `BASE_URL`; the Next button is hidden and clicked automatically when the participant finishes.
6. **Post-test questions**: expected a test? (Yes / No / Not sure), strategy (optional text), 2 experience items with 2 attention checks between them, technical problems (optional).
7. **Demographics**: age (number 18–110), gender. *(Confirm the list with the IRB.)*
8. **Debrief** (placeholder text).
9. **End of Survey → redirect to `https://app.prolific.com/submissions/complete?cc=COMPLETION_CODE`.**

### 4.3 Checklist after import

- [ ] **Look & Feel → Layout = Flat (or Modern)**, and **Survey options → "New survey taking experience" is OFF**. Qualtrics made the new experience the default for *new* surveys in June 2026. Importing a .qsf keeps the file's settings, but check anyway.
- [ ] **Survey flow → Randomizer → "Evenly present elements" is checked**, "Randomly present 1 of the following elements", with 6 elements.
- [ ] **The Embedded Data element is the first element in the flow**, above the Experiment block (otherwise values the JS sets are not saved).
- [ ] **Survey options → Back button is OFF.**
- [ ] **Both End of Survey redirects** have the right codes (screen-out branch and the final element) and use `https://app.prolific.com/submissions/complete?cc=…`.
- [ ] Experiment question JS: `BASE_URL` points at your GitHub Pages `experiment/` folder (with the trailing `/`).
- [ ] Replace the consent / debrief placeholders and confirm the demographics with the IRB.
- [ ] Preview with `?PROLIFIC_PID=test1&STUDY_ID=x&SESSION_ID=y&debug=1`, go through the whole survey, then check **Data & Analysis** that `ios`, `fam_01_view_ms`, `test_word_s01_correct` and `full_data_json_1` are filled.

If the .qsf import fails or loses something (the file was generated by script, and I could not test the import without a Qualtrics account), build those parts by hand.
Everything you need is in `qualtrics/`: the two JS files, the field list, and the flow above.

### 4.4 Qualtrics limits that matter

- **Embedded-data value size: 20 KB per value** (Qualtrics documentation). A bug in the new survey-taking experience capped values at 1,000 characters in January–February 2026. Qualtrics reported it fixed on 2026-02-25.
- The full trial-level backup is about 25 KB, so it's split across **`full_data_json_1..4`**, each at most 15,000 characters (configurable: `JSON_CHUNK_CHARS`, `JSON_CHUNKS`). That allows up to 60 KB. If it is ever larger, `full_data_json_truncated = 1`, but the wide fields and the DataPipe copy are still complete.
- Embedded data is saved only when the page is submitted (when the experiment clicks Next). A participant who closes the tab mid-experiment leaves no Qualtrics data from the JS block, but the **DataPipe** backups (after familiarization and after each test block) survive.

### 4.5 Newer engine ("nste") path: untested

Build and test with `QUALTRICS_ENGINE: 'legacy'` (the default). If Harvard forces the new survey-taking experience,
or Qualtrics retires the classic layouts:

1. Set `QUALTRICS_ENGINE: 'nste'` in `config.js`.
2. Rebuild the survey: `python tools/build_qsf.py --engine nste --base-url …`. Every field is then declared with the `__js_` prefix, and the device-check JS uses `setJSEmbeddedData`.

The experiment then calls `Qualtrics.SurveyEngine.setJSEmbeddedData(name, value)`, and the survey flow must declare
**`__js_<name>`** for every field: `__js_category`, `__js_list`, `__js_ios`, `__js_fam_01_view_ms`, …,
`__js_full_data_json_1`, and so on (the full list is `embedded_data_fields.txt` with each name prefixed). The flow's own
fields (`PROLIFIC_PID`, `STUDY_ID`, `SESSION_ID`, `debug`, and the Randomizer's `category` / `list`) keep their plain names.
`reshape_qualtrics.py` strips the `__js_` prefix automatically.

**This path has not been run on the new engine.** Before relying on it, check three things in a preview: that piped
text (`${e://Field/…}`) works inside the question JS, that `hideNextButton` and `clickNextButton` exist, and that the
fields appear in the data.

## 5. Prolific setup

- Study URL: `https://<your>.qualtrics.com/jfe/form/SV_xxx?PROLIFIC_PID={{%PROLIFIC_PID%}}&STUDY_ID={{%STUDY_ID%}}&SESSION_ID={{%SESSION_ID%}}`
- Device filter: **Desktop only**. Listing text: **"Requires audio (headphones or speakers)."**
- Completion code: the same `COMPLETION_CODE` as in the .qsf. Screen-out code (device check only): `SCREENOUT_CODE`.
- Duration estimate shown on the consent page: about 20 min (`ESTIMATED_MINUTES`; 17 before the v2 designer). Confirm it with the pilot (`total_ms`, `t_*_ms`, and Qualtrics `Duration`), then set pay at or above Prolific's recommended rate.

## 6. Configuration and [DECISION] flags

All in `experiment/config.js`.

| Setting | Default | Notes |
|---|---|---|
| `QUALTRICS_ENGINE` | `'legacy'` | `'nste'` = untested path, §4.5 |
| `COMPLETION_CODE`, `SCREENOUT_CODE` | placeholders | also set in the .qsf redirects (rebuild with `--completion-code` / `--screenout-code`) |
| `DATAPIPE.EXPERIMENT_ID` | placeholder | backup is skipped while it's a placeholder or in debug mode |
| `SURPRISE_TEST` | `true` | `false` adds "Afterwards, we will test your memory…" to the scene instructions; recorded as `surprise_test` |
| `SHOW_NAME_LABEL` | `true` | `true` (the default again since v2.0.0) shows the name text beneath the known / unfamiliar person in every scene; `false` hides it (the name is still used in the setup questions and scene instructions). Override per participant with `name_label=0/1`, from the URL or a Qualtrics embedded field (§8). Recorded as `name_label_shown` |
| `MOUSEVIEW` | `false` | blur-except-cursor spotlight + AOI dwell (`dwell_*_ms` in the JSON backup). Lightly tested only |
| `TEST_BLOCK_ORDER_MODE` | `'fixed'` | fixed `word → face → incid`; `'counterbalanced'` = random of the 6 orders; recorded as `test_block_order` |
| `CONFIDENCE_RATINGS` | `false` | 1–4 after each test trial (JSON backup only) |
| `AUDIO_CHECK_EXCLUDES` | `false` | failed audio check is flagged only |
| `TIMING.*` | spec values | stranger entry 600 ms; response 900 ms; SPACE enabled 1 s after the label audio ends; auto-advance 15 s after it ends; ISI 500 ms; fillers 30 s / 90 s |
| `DEBUG_TIMING` | fillers 15 s | applied with `debug=1` |
| `DEVICE` | 1024 × 650 screen; window prompt below 1000 × 600 | small windows get a "please maximize" prompt, never a rejection |
| `AVATAR_UNFAM_K`, `AVATAR_UNFAM_K_BALD_NO_FACIAL_HAIR`, `AVATAR_UNFAM_STEP`, `AVATAR_UNFAM_COLOUR_MAX_STEPS` | 4, 5, 0.35, 2 | unfamiliar-person rule (§9 People) |
| `FOIL_K`, `FOIL_STEP` | 4, 0.35 | read only by `tools/make_foils.html`; foils are frozen in `stimuli.json` (§9 People) |
| `UNFAMILIAR_NAMES` | Jordan, Taylor, Casey, Morgan, Riley, Avery, Quinn, Jamie (+4 spares) | first one that isn't a near-match of the typed name |
| `CATEGORIES`, `NAME_INSTRUCTION`, `FAMILY_TITLES` | from UPDATES_v2 | prompt text per category; titles that trigger the "first name, not a title" flag |

Not built (default "off" decisions with no implementation): spoken names (`AUDIO_NAMES`) and a spoken reply from the other person.

## 7. Procedure and timing

Inside the experiment block (Qualtrics handles consent, post-test, demographics and debrief):

| # | Screen | Section timer |
|---|---|---|
| 1 | Welcome → full screen + audio unlock (click); "please maximize" prompt if the window is under 1000 × 600 | `t_intro_ms` |
| 2 | Name entry (category prompt). Validation: 1–20 characters, letters / space / hyphen / apostrophe. Family titles are flagged (accepted on the 2nd attempt) | `t_setup_ms` |
| 3 | "How do you know [name]?" (relationship type → `is_kin`) | `t_setup_ms` |
| 4 | IOS (7 pictorial options) | `t_setup_ms` |
| 5 | Contact frequency (6 options) | `t_setup_ms` |
| 6 | Relationship duration (5 options) | `t_setup_ms` |
| 7 | Avatar designer: "Make an avatar that looks like [name]" (6 tabs: Skin → Face → Eyes → Nose & mouth → Hair → Extras; starts from a neutral face; "Reset this section"; no randomize) | `t_designer_ms`, `t_designer_<tab>_ms` |
| 7b | Likeness: "How much does this avatar look like [name]?" (1–7) | `t_designer_ms` |
| 8 | Sound check: "window", then "garden" on a second attempt. Case and spaces ignored; one letter off accepted | `t_audio_check_ms` |
| 9 | Filler 1: 3 × 3 sliding puzzle, fixed 30 s (a new puzzle appears if solved early) | `t_filler1_ms` |
| 10 | Scene instructions (surprise framing) + 12 scenes | `t_fam_ms` |
| 11 | Filler 2: arithmetic verification (Y/N), fixed 90 s (retention delay before the tests) | `t_filler2_ms` |
| 12 | "Questions about the scenes" → Word (12) → Face (12) → Incidental (12), each block with a short intro | `t_test_ms` |
| 13 | "Click Continue to answer a few final questions" (data written to Qualtrics here) | |

**Scene timeline** (identical in both conditions; only the right-hand avatar and its name differ):

1. The other person is on screen, their name beneath them (`SHOW_NAME_LABEL`, default shown; `name_label=0` hides it). Both figures are turned three-quarters toward each other. The novel object sits on a low table between them, below eye level, so a look at the object reads differently from a look at the partner. The stranger slides in from the left (600 ms, small walking bob) and the other person looks at them.
2. **Greeting audio**: "Hi! Good to see you!" The stranger's mouth is amplitude-driven, with a slight head bob.
3. **Response** (900 ms): the other person smiles, raises their eyebrows, tilts their head and does a small happy bounce.
4. **Label audio**: "Look! It's a *bosa*! A *bosa*!"
   - On "Look!": the stranger looks down at the object (eyes aimed at it, upper lids lowered, head tilted about 9° toward it), and the object slides forward with a 1.05× pulse (300 ms).
   - 300 ms later, the other person's eyes follow (joint attention).
   - On "It's a *bosa*!": the stranger looks back at the other person (head level, eyes straight across).
   - On "A *bosa*!": the stranger looks back at the object.
   - The three segment onsets are found **at runtime** from the clip's two longest pauses, so new recordings need no timing files. `label_segment_source` records `pauses`, or `proportional_fallback` if fewer than two pauses were found.
5. The other person nods twice while smiling at the object. In the final frame both look at the object.
6. "Press SPACE to continue" appears **1 s after the label audio ends**. **`view_ms` = keypress time − label-audio end.** The scene auto-advances 15 s after the label audio ends (`timed_out = 1`). Then a 500 ms blank.

**Measured in debug runs** (placeholder audio, fillers shortened): one scene ≈ 7.6–8.6 s with an immediate keypress.
The real-length experiment block is about 3 min setup + 3–5 min designer and likeness (v2) + 0.5 min sound check + 0.5 min puzzle +
2–4 min scenes + 1.5 min arithmetic + 3–4 min tests ≈ 13.5–18.5 min. With consent and post-test, about 18–21 min.
**Confirm with the pilot.**

**Final-frame AOIs** (stage coordinates, 0–1, `[x0, y0, x1, y1]`; also stored in the JSON backup as `aoi_norm`):
`stranger_face [0.12, 0.432, 0.29, 0.7456]`, `object [0.435, 0.6192, 0.565, 0.8272]`, `other_face [0.71, 0.432, 0.88, 0.7456]`, `incidental [0.788, 0.1344, 0.872, 0.2656]`.

**Stage scaling.** Every screen is drawn on a fixed 1000 × 625 logical canvas scaled to fit the window (letterboxed), so layout and AOIs are the same on every screen size.

## 8. Counterbalancing and randomization

- **Name text (optional factor):** to run with- and without-name versions, either
  - set `SHOW_NAME_LABEL` in `config.js` (applies to everyone), or
  - give participants `name_label=1` / `name_label=0`, for example with separate Prolific study URLs ending in `&name_label=0`, or inside the existing Qualtrics Randomizer elements (set embedded field `name_label` alongside `category` and `list`). The field is already declared in the survey flow.
  Each participant's value is recorded as `name_label_shown` (1/0) and `name_label_source` (config / override, in the JSON backup).
- **Between subjects:** `category` (3) × `list` (2) from the Qualtrics Randomizer (6 branches, evenly presented). If those fields are empty (piping failure), the experiment assigns them at random and records `assign_fallback = 1` in the JSON backup.
- **Lists:** list A: scene sets s01–s06 = known, s07–s12 = unfamiliar. List B: swapped. Scene sets are matched in pairs (s01/s07, s02/s08, …) on gender presentation, apparent age and skin-tone band. So within each list, the 6 known and the 6 unfamiliar scenes each have 3 female-presenting and 3 male-presenting strangers, covering the same 6 skin tones and the same age spread (2 young, 2 middle-aged, 2 older).
- **Per participant (seeded RNG; `seed` is recorded, so every assignment can be reconstructed):**
  - incidental color per object type
  - familiarization order (pseudorandom, at most 2 consecutive scenes of the same condition)
  - test order within each block
  - option positions
  - word-test foils
  - which features the unfamiliar avatar changes
- **Word-test foils:** 3 foils from the other 11 scene sets, with **at least one from each condition** (hard rule).
  - **Soft rule (as you asked):** all 4 options have different first vowels.
  - Each object is also used as a foil exactly 3 times, so foil familiarity is balanced.
  - A search finds an assignment meeting all of these. In every test run, the vowel rule was met for all 12 trials (`word_foil_vowel_relaxed = 0`). If a run ever has to relax it, the count is recorded, and each trial records `vowel_rule_met`. With 12 words in 5 vowel groups, every trial necessarily contains exactly one e-word and one i-word, so the rule only just fits.

## 9. Stimuli

`experiment/stimuli/stimuli.json` is the manifest and single source of truth (scene set → stranger and foil feature vectors, foil change,
object id, word, IPA, incidental type, voice). SVG exports of every stimulus are in `experiment/stimuli/svg/`
(`tools/stimulus_sheet.html` → "Export SVGs"). Runtime figures are drawn in code from the same renderer, so the files are for reference and figures.

### Words (final 12; stress on the first syllable in all audio)

| Word | Pronunciation | IPA | Scene set | Half |
|---|---|---|---|---|
| bosa | BOH-sah | ˈboʊ.sɑ | s01 | 1 |
| tefo | TEH-foh | ˈtɛ.foʊ | s02 | 1 |
| fiku | FEE-koo | ˈfi.ku | s03 | 1 |
| lufi | LOO-fee | ˈlu.fi | s04 | 1 |
| mavo | MAH-voh | ˈmɑ.voʊ | s05 | 1 |
| zibu | ZEE-boo | ˈzi.bu | s06 | 1 |
| daxa | DAK-sah | ˈdæk.sɑ | s07 | 2 |
| hosi | HOH-see | ˈhoʊ.si | s08 | 2 |
| pemo | PEH-moh | ˈpɛ.moʊ | s09 | 2 |
| keku | KEH-koo | ˈkɛ.ku | s10 | 2 |
| gimu | GEE-moo (hard g) | ˈɡi.mu | s11 | 2 |
| vuno | VOO-noh | ˈvu.noʊ | s12 | 2 |

**Word changes and lexicon check:**

- **Replacements:** toma → lufi, dobi → mavo, wazi → vuno, nepa → hosi.
- **Lexicon check method:** each word was run through Microsoft Word's US-English spell checker (`CheckSpelling`), plus a manual check for common names and brands.
- **Result:** 11 of the 12 words were not recognized. **"bosa" was recognized**, as a variant spelling of *boza* (a fermented drink). It is kept because it is a standard novel word in this literature (researcher decision, 2026-11-13).
- **Vowel groups:** the first-syllable onset + vowel is unique for every word. Shared first vowels are handled by the soft rule in §8.

### Incidental objects

There are 12 types, each in exactly one scene: mug, lamp, clock, bowl, picture frame, watering can, vase, book, teapot, candle, jar, bottle.
- **Colors:** Okabe–Ito colorblind-safe set: **green #009E73, orange #E69F00, blue #0072B2, pink #CC79A7**.
- **Why the spec's palette was replaced:** I checked discriminability with the Machado (2009) simulation and CIEDE2000. The spec's palette failed for deuteranopes: blue/purple had ΔE 1.9. The new set has a minimum pairwise ΔE of 10.9 (tritan), 12.2 (protan) and 15.9 (deutan).
- **Constants:** the object's position and size are the same in every scene, and only the main body takes the color.

### Novel objects

- **Originals:** bosa, daxa, tefo and gimu are the lab's original illustrations, copied verbatim.
- **New:** 8 were drawn in the same style.
- **Recognizability check:** after a first visual check, the new ones that looked like familiar things were redrawn (a party hat, a ring-stacking toy, a flower, a hand fan, an hourglass).
- **Still to do:** a quick naming check in the pilot ("does this look like anything you know?") is worthwhile.

### People (v2 avatars)

Designed and reviewed in `design/avatar_style_sheet.html` (shading levels, rules, strangers, foils, scene preview).

- **Renderer** (`js/people.js`): shaded parametric busts ("Level 2": soft light from the upper left, eye and lip highlights), one renderer for the designer, scenes and face test. A figure's static part is computed once and cached; animation redraws only eyes, brows and mouth.
- **Feature contrast across skin tones:** every facial feature is coloured relative to the skin it sits on (CIELAB lightness difference, dL*), so nothing is masked on darker or lighter skin: mouth seam dL* 24, eyes near-black, brows ≥ 25 and facial hair ≥ 22 (dark or brown hair is only ever pushed darker), age lines 10 / 13, stubble 6. A skin-coloured halo keeps the mouth separate from a dark mustache.
- **Animation:** gaze (eyes aimed at the actual target; upper lids lower when looking down), head roll and nod, a three-quarter turn toward the partner (features shift ~9% of face width; far eye and far side narrow), amplitude-driven mouth, smile, brow raise, bounce. Test faces are front-facing.
- **Designer** (`js/designer.js`): 6 tabs in a fixed order, 16 sliders:
  - Skin: 2-D picker (lightness × undertone: cool, neutral, warm, olive)
  - Face: width, jaw / chin; age (young / middle-aged / older)
  - Eyes: lid type (visible crease / hooded / monolid; eye opening identical for all three), size, tilt, spacing, iris colour (6), brow thickness, brow shape
  - Nose & mouth: nose width, length, lip fullness, mouth width
  - Hair: texture (straight / wavy / curly / coily), length (short / medium / long), style within those, colour (continuous natural scale), grey (range depends on age)
  - Extras: head covering (none / hijab / turban, with colour), facial hair (5), glasses (3), freckles, shirt colour
  - Slider ranges cover ordinary adult variation only; no option is tied to skin tone or group.
- **Shirt palettes:** the designer's shirt colours and the stranger shirt colours are disjoint palettes.
- **Unfamiliar person** (`js/avatar_rules.js`, seeded by the participant `seed`):
  - **Copies** skin lightness and undertone, age and grey, lid type, iris colour, freckles, hair texture and length, head covering, facial hair present / absent.
  - **Moves** `AVATAR_UNFAM_K` = 4 random identity sliders (face width, jaw, eye size / tilt / spacing, nose width / length, lip fullness, mouth width, brow thickness / shape) by ±`AVATAR_UNFAM_STEP` = 0.35, flipping direction at a bound.
  - **3 categorical changes**, each visible at scene size: a hair style from the similar-style list (same length and texture; long straight / wavy hair may go to shoulder length), a different shirt colour (always), and either a hair-colour change of 1–2 steps on the natural scale (black – dark brown – brown – light brown – blonde, auburn next to brown; never when grey would hide it) or glasses added / removed.
  - Special cases: head covering → covering colour + shirt + glasses; bald with facial hair → facial-hair style (stays present) + shirt + glasses; bald without facial hair → shirt + glasses + a 5th identity slider.
- **Strangers and foils:** 12 strangers (`stimuli.json`) keep the IDs, gender presentation, ages and skin-tone bands of v1, so the matched pairs, list balancing and recorded voices are unchanged. They span all three lid types and all four hair textures; none wears a head covering.
  - Each foil keeps its stranger's group features, clothing and glasses, moves `FOIL_K` = 4 identity sliders by `FOIL_STEP` = 0.35, and makes one hand-picked hair change (`foil_change`): a similar style or a one-step colour change.
  - Foil rules (checked by `tools/make_foils.html`, which refuses to save otherwise): every new style or colour is also worn by a stranger; each target style is used by at most 2 foils; 6 style and 6 colour changes, 3 of each per half and per gender; style targets from the similar-style list; colour changes one step and never on grey hair.
  - Foils are frozen in the file so every participant sees the same faces. To change difficulty: edit `FOIL_STEP`, open `tools/make_foils.html` through the dev server, save, bump `VERSION`, redeploy.

## 10. Audio

The audio is generated with **ElevenLabs** (Starter plan; model `eleven_v4`). The manifest's `source` column records the model, voice and take for every clip. The earlier Windows text-to-speech placeholders can still be rebuilt with `tools/make_placeholder_audio.py`, which sets `is_placeholder = 1`.

### 10.1 ElevenLabs workflow (`tools/elevenlabs_tts.py`)

- **API key:** read from `ELEVENLABS_API_KEY` or `%USERPROFILE%\.elevenlabs_api_key`, outside the repo. It is only ever sent in the `xi-api-key` header. Permissions needed: Text to Speech, Voices (read), Models (read). Add Speech to Text if you want automatic transcription checks.
- **Casting:** `experiment/audio/voice_casting.json` maps each speaker to an ElevenLabs voice, matched on gender and age. On a paid plan, Voice Library voices are used directly by ID and take no voice slots; the free plan refuses them through the API.

  | Speaker | Wanted | Voice |
  |---|---|---|
  | str01 / str07 | female, young | Sarah / Jessica |
  | str02 / str08 | male, young | Will / Liam |
  | str03 / str09 | female, middle-aged | Bella / Adeline (library) |
  | str04 / str10 | male, middle-aged | Chris / Eric |
  | str05 / str11 | female, older | Carol / Julie (library) |
  | str06 / str12 | male, older | Bill / Marv (library) |
  | narrator | female, middle-aged | Matilda |

- **Steps:**
  1. `python tools/elevenlabs_tts.py generate --takes 3` writes `audio_src/elevenlabs/takes/` (git-ignored). Novel words are sent as inline IPA, e.g. `It's a /ˈboʊsɑ/!`. Pauses come from punctuation ("Look! ... It's a … ! ... A … !") because v4 has no `<break>` tag.
  2. `python tools/audio_qc.py` checks every take's duration and pause structure (the same detector the gaze timing uses) and writes a suggested selection.
  3. Open `http://localhost:8001/tools/audio_review.html` (with `python tools/dev_server.py 8001`). Listen, choose one take per clip, tick "needs regeneration" for bad ones, and click **Save selection**.
  4. Regenerate flagged clips with `generate --only <clip_ids> --force`. If v4 keeps mispronouncing a word, add `--model-for-words eleven_flash_v2`, which uses exact SSML `<phoneme>` tags.
  5. `python tools/elevenlabs_tts.py finalize` copies the chosen takes and runs `normalize_audio.py`, writing to `experiment/audio/`. Then commit and push.
- **Pronunciation check is by ear.** ElevenLabs says inline IPA "can still vary by voice and phrase", which is why there are 3 takes per clip. Make sure each word sounds the same from the stranger and from the narrator (stress on the first syllable).

### 10.2 General

- **Recording script:** `experiment/audio/audio_manifest.csv`, 51 clips. Columns: `clip_id, speaker_id, speaker_gender, speaker_age, text, pronunciation, file, duration_ms, is_placeholder, ipa, stress, notes`. It contains:
  - per stranger (12 voices): `greet_sXX` ("Hi! Good to see you!") and `label_sXX` ("Look! It's a X! A X!")
  - narrator: `test_word_<word>`, `test_face`, `test_incid_<type>`, and `check_window` / `check_garden`
- **Swapping in human recordings** (optional):
  1. Record each clip and name it `<clip_id>.wav` (any format ffmpeg reads).
  2. Run `python tools/normalize_audio.py --src path/to/recordings`. It trims leading and trailing silence, normalizes to −16 LUFS integrated (iterating so the −1 dBFS limiter doesn't leave clips quiet), resamples to 44.1 kHz mono, writes MP3 + OGG over the old files, and updates `duration_ms` and `is_placeholder = 0` in the manifest.
  3. Nothing else changes. Lip-sync is computed from each file's amplitude envelope at load time, and the gaze timing comes from the label clip's two longest pauses.
- **Recording requirement:** label clips need a clear pause (≥ 100 ms, ideally 300–500 ms) after "Look!" and after the first "It's a X!".
- **Loudness:** every clip is normalized to −16 LUFS (within about 0.8 LU).
- **Playback:** all audio is preloaded with the Web Audio API before the study starts, and playback starts only after the participant's first click ("Start"). If audio can't play, the timeline still runs on the clip durations, and `audio_simulated_scenes` counts those scenes.

## 11. Data saving

- **Primary:** Qualtrics embedded data, set by `js/data.js` when the participant finishes the JS block.
  - Wide participant / familiarization / test fields (§13).
  - The complete trial-level JSON, split across `full_data_json_1..4`.
- **Secondary backup: DataPipe → OSF**, fully incremental. Saves happen after familiarization + filler 2, after each test block, and at the end. To set it up:
  1. Create an OSF project and component, and an OSF token.
  2. At pipe.jspsych.org, create an experiment, connect the component, and **enable data collection**. Condition assignment is not used; the Qualtrics Randomizer does it.
  3. Put the experiment ID in `DATAPIPE.EXPERIMENT_ID`.
  4. Files are named `<PROLIFIC_PID>_<ResponseID>_<stage>.json`.
- **Local / debug:** the jsPsych trial CSV and the field JSON are downloaded, or written into `sample_data/` with `devsave=1`.

## 12. Reshaping the Qualtrics export

Export from Qualtrics: **CSV, "Use numeric values"**. Then:

```bash
python analysis/reshape_qualtrics.py export.csv -o long.csv
```

- **Output:** one row per trial. Participant columns are repeated on every row; then `phase` (familiarization / test), the trial fields, and the model coding:
  - `k` = closeness: IOS − 1 for known scenes, 0 for unfamiliar
  - `f` = `target` (word, face) or `incidental`
  - `correct`
- **Default filters:** participants with `reloaded_post_fam = 1` and debug runs are dropped. Use `--include-incomplete` / `--include-debug` to keep them.
- **Cross-check:** the script also reassembles `full_data_json_*` and checks every test trial against the wide fields.
- **Tested on:** `sample_data/mock_qualtrics_export.csv`, a fake export with real Qualtrics' 3-row header built from two debug runs by `tools/make_mock_export.py`. Its output is `sample_data/sample_long_format.csv`.
- **R:** not provided. R isn't installed on the build machine, so an R version couldn't be checked for identical output.

## 13. Data dictionary

### Qualtrics native / survey fields

| Field | Meaning |
|---|---|
| `PROLIFIC_PID`, `STUDY_ID`, `SESSION_ID` | from the Prolific URL |
| `debug` | `1` if the URL had `debug=1` (set by the URL) |
| `name_label` | `0`/`1` if set by the URL or survey flow (blank = use `SHOW_NAME_LABEL`, default shown) |
| `category`, `list` | set by the Randomizer (also written back by the experiment) |
| `device_ok`, `device_reason`, `device_screen`, `device_window` | device check before consent (`reason`: mobile / no_mouse / small_screen; `device_screen` e.g. `1366x768 px (1093x614 at scale 1.25)`) |
| `consent` | 1 = agree, 2 = do not agree |
| `expected_test` | 1 Yes, 2 No, 3 Not sure |
| `strategy`, `tech_problems` | free text |
| `exp_easy`, `exp_sound` | 1–5 (strongly disagree → strongly agree) |
| `attention_check_1` | correct = **1** (Strongly disagree) |
| `attention_check_2` | correct = **4** (Somewhat agree) |
| `age`, `gender` (+ `gender_4_TEXT`) | demographics |
| `StartDate`, `EndDate`, `Duration (in seconds)` | Qualtrics timing (consent time ≈ `js_start_epoch_ms` − StartDate; post-test time ≈ EndDate − `js_end_epoch_ms`) |

### Participant-level fields written by the experiment

| Field | Meaning |
|---|---|
| `category` | acquaintance / moderate / close |
| `list` | A / B |
| `relationship_type` | Friend / Parent / Sibling / Grandparent / Other relative / Coworker or classmate / Neighbor / Other |
| `is_kin` | 1 if Parent, Sibling, Grandparent or Other relative |
| `ios` | 1–7 (Inclusion of Other in the Self) |
| `contact_freq` | Daily … Less than once a month (text) |
| `duration` | Less than 1 year … More than 10 years (text) |
| `name_length` | characters in the typed name (the name itself is never stored) |
| `name_flagged_title` | 1 if the first entry matched a family title (e.g. "Mom") |
| `name_suspect` | 1 if the name looks like a non-name (no vowels, "asdf", repeated letters…) |
| `known_avatar`, `unfamiliar_avatar` | feature vectors `key=value;…` in the order of `FEATURE_KEYS` (js/people.js); sliders 0–1 to 2 decimals. `reshape_qualtrics.py` unpacks them into `known_<key>` / `unfam_<key>` columns |
| `unfam_changes` | the unfamiliar person's categorical changes, `feature:from>to`, `|`-separated |
| `unfam_k`, `unfam_identity_dist` | identity sliders moved (4, or 5 when bald without facial hair) and their Euclidean distance |
| `likeness_rating`, `likeness_rt_ms` | "How much does this avatar look like [name]?" 1–7, and response time |
| `designer_edits`, `designer_resets`, `designer_tabs_visited` | designer edits (a released slider or a clicked option), section resets, sections opened (of 6) |
| `designer_edits_<tab>`, `t_designer_<tab>_ms` | per section: skin, face, eyes, nosemouth, hair, extras |
| `unfamiliar_name` | name shown under the unfamiliar person |
| `audio_check_pass` | 1 if either check word was typed correctly (one letter off accepted) |
| `audio_check_attempts` | 1–2 |
| `filler1_solved` | 1 if the first sliding puzzle was solved within the time limit (30 s) |
| `filler1_moves` | moves made on the first puzzle |
| `filler1_time_to_solve_ms` | time to solve the first puzzle (blank if unsolved) |
| `filler1_n_solved` | number of puzzles solved |
| `filler2_accuracy` | arithmetic accuracy (engagement check; flag < 0.70) |
| `filler2_n` | number of arithmetic items answered |
| `fam_fast_advance_count` | scenes advanced within 300 ms of SPACE being enabled |
| `fam_timeout_count` | scenes that auto-advanced |
| `fullscreen_exits`, `tab_switches` | counts during the JS block (timestamps are in the JSON `events`) |
| `total_ms` | duration of the JS block |
| `test_block_order` | e.g. `word>face>incid` |
| `reload_pre_fam` | reloads before familiarization (participant restarted the block) |
| `reloaded_post_fam` | 1 if reloaded during or after familiarization → **exclude** |
| `reload_stage` | stage at that reload (fam / post_fam / test / done) |
| `t_intro_ms` … `t_test_ms` | time per section (§7 table) |
| `js_start_epoch_ms`, `js_end_epoch_ms` | Unix ms at the start and end of the JS block |
| `exp_version`, `qualtrics_engine`, `surprise_test`, `mouseview_on`, `debug`, `seed` | run settings (`seed` reproduces every randomization) |
| `name_label_shown` | 1 = name text shown beneath the person in scenes, 0 = hidden |
| `browser`, `screen_w`, `screen_h`, `window_w`, `window_h`, `window_small_prompt` | display info |
| `audio_load_errors` | clips that failed to load (0 expected) |
| `audio_simulated_scenes` | scenes where audio could not play |
| `word_foil_vowel_relaxed` | word trials where the first-vowel rule had to be relaxed |
| `js_error` | first JS error message, if any |
| `full_data_json_1..4`, `full_data_json_n`, `full_data_json_truncated` | complete JSON backup in chunks; total length; 1 if it didn't fit |

### Familiarization fields: `fam_XX_*`, XX = 01–12 in presentation order

| Suffix | Meaning |
|---|---|
| `scene_set_id` | s01–s12 |
| `condition` | known / unfamiliar |
| `stranger_id` | str01–str12 |
| `word` | novel word |
| `incidental_type`, `incidental_color` | incidental object and its color (green / orange / blue / pink) |
| `view_ms` | **viewing time: label-audio end → SPACE** (≥ 1000 by design; 15000 if timed out) |
| `timed_out` | 1 if auto-advanced |
| `label_audio_ms` | duration of the label clip (total scene time ≈ entry + greeting + response + label + view) |

### Test fields: `test_<type>_<scene_set_id>_*`, type = word / face / incid

| Suffix | Meaning |
|---|---|
| `choice` | chosen option: object id (word), stranger/foil id (face), color (incid) |
| `correct` | 0/1 |
| `rt_ms` | option onset → click |
| `foils` | foil ids, `|`-separated (word: 3 objects; face: the foil; incid: the 3 other colors) |
| `position` | **target's** position (1-based, left to right) |

The JSON backup (`full_data_json_*`) adds, per test trial:
- `response_position`, `option_order`, `foil_conditions`, `foil_scene_sets`
- `responded_before_prompt_end`, `vowel_rule_met`, `block_index`, `confidence`

and per scene:
- `greet_audio_ms`, `label_segments_s`, `label_segment_source`, `audio_simulated`, `scene_total_ms`
- `dwell_*_ms` (MouseView)

It also has every arithmetic trial (`filler2`), all fullscreen and visibility events with timestamps (`events`), and the design
(`fam_order`, `incidental_colors`, `aoi_norm`, `assign_fallback`, `finish_reason`).

### Long format (output of `reshape_qualtrics.py`)

The participant columns above, plus:
- `phase`, `trial_index`, `scene_set_id`, `condition`, `stranger_id`, `word`, `incidental_type`, `incidental_color`
- familiarization rows: `viewing_time_ms`, `timed_out`, `label_audio_ms`
- test rows: `test_type`, `target_id`, `foil_ids`, `target_position`, `response_id_choice`, `correct`, `rt_ms`
- model coding: `k` (closeness: IOS − 1 for known, 0 for unfamiliar) and `f` (target / incidental)

## 14. Data quality and exclusion support

These are recorded, not enforced: the preregistered rules decide.

- **Attention checks:** `attention_check_1` (should be 1) and `attention_check_2` (should be 4).
- **Engagement:** `filler2_accuracy` < 0.70.
- **Familiarization:** `fam_fast_advance_count` > 6 or many `fam_timeout_count`.
- **Display:** `fullscreen_exits`, `tab_switches` (with timestamps in the JSON).
- **Name:** `name_flagged_title`, `name_suspect`.
- **Audio:** `audio_check_pass`, `audio_load_errors`, `audio_simulated_scenes`.
- **Reloads:** `reloaded_post_fam` → exclude; `reload_pre_fam` → keep, but note it.
- **Manipulation check:** IOS by `category`.

## 15. Privacy

- **The typed name never leaves the browser.** It lives only in memory and is shown on screen.
  - It is not in any data field, the JSON backup, DataPipe, localStorage or the jsPsych data.
  - The name input has no `name` attribute, so the Qualtrics form can't submit it.
  - Debug runs were checked: the name appears nowhere in the output files.
- **No photo uploads.** The person is represented only by the designer avatar.
- **localStorage** holds only `{stage, reload_pre_fam}` under a key built from PROLIFIC_PID + STUDY_ID.
- **External calls:** no third-party analytics. The only external requests are to GitHub Pages (code and audio) and, if enabled, DataPipe.

## 16. What the researcher still needs to supply

- [ ] IRB-approved **consent** and **debrief** text (placeholders in the .qsf); confirm the **demographics** list.
- [ ] Prolific **completion code** and **screen-out code** (`config.js` + rebuild the .qsf).
- [ ] **GitHub repo** name → base URL → rebuild the .qsf (§3).
- [ ] **DataPipe** experiment ID + OSF component (§11).
- [ ] Confirm **custom JavaScript** is enabled on Harvard's Qualtrics (§4.1).
- [ ] **Approve the ElevenLabs audio**: listen to every clip in `tools/audio_review.html`, especially the 12 novel words from both stranger and narrator (§10.1).
- [ ] **Avatar review**: as suggested in the style sheet, have a few people from the communities represented look at the designer (`tools/designer_preview.html`) and the strangers (`tools/stimulus_sheet.html`) before launch.
- [ ] **Payment**, after the pilot measures the median duration.
- [ ] **Pilot (~20 participants)**: check that face and word accuracy fall around 65–75% and incidental accuracy is above 25% but not near ceiling. Tuning knobs:
  - foil similarity (`FOIL_STEP` in config.js → `tools/make_foils.html` → redeploy)
  - filler length (`TIMING.FILLER1/2`)
  - auto-advance time
  - number of word tokens in the label clip

## 17. Known limitations and untested paths

- **The .qsf has not been imported into a real Qualtrics account.** It was generated by script from the QSF format as I know it. Survey options such as the layout theme may not carry over, so use the checklist in §4.3.
- **The NSTE engine path is untested** (§4.5).
- **Browser testing so far:** the full study was run end to end in the Claude desktop app's Chromium-based browser (autopilot runs, reload tests, layout checks). It has not yet been tried in Firefox or Safari. Safari decodes the MP3 files; OGG is the fallback.
- **MouseView** is implemented (blur mask + AOI dwell) but was not part of the end-to-end tests.
- **Prototype.js:** Qualtrics' classic layouts load Prototype.js, whose `Array.prototype.toJSON` makes `JSON.stringify` turn arrays into strings. All of the experiment's serialization goes through `SRL.data.stringify`, which removes it for the call. This was tested by simulating the Prototype patch in the browser, not inside Qualtrics itself.
- **The experiment draws over the Qualtrics page** as a full-window overlay (`z-index` max), so Qualtrics theme CSS can't distort it. Qualtrics' own header and footer are hidden underneath until the participant clicks Continue.
- **Synthetic voices:** ElevenLabs audio is far more natural than the old placeholders, but novel-word pronunciation via inline IPA can vary between takes. It is checked by ear, not automatically. Check ElevenLabs' current terms for how the generated audio may be used and credited in publications.
- **Gaze direction:** eyes and head are aimed at the actual target, and the object sits below eye level so object looks and partner looks differ. It reads clearly in still frames and the style-sheet preview, but it's worth a look in the pilot.
- **Designer duration:** the v2 designer is longer than v1; the 20-minute estimate is a guess until the pilot (`t_designer_ms`, `t_designer_<tab>_ms`).
- **v2 has not been loaded from GitHub Pages yet** (it was built on the `avatar-v2` branch and tested locally); run `tools/remote_load_test.html` after merging and deploying.
