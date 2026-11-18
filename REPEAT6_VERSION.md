# Repeat-6 version: 6 unique scenes, each shown twice

Build this as a second version of the study, alongside the current 12-unique version. Everything not mentioned here is the same as the current build: the avatar designer, audio, animation, unfamiliar-avatar rule, fillers (15 s get-ready + 45 s arithmetic), post-test, Qualtrics/Prolific setup.

## 1. Version switch

- `config.js`: `DESIGN_VERSION: "unique12" | "repeat6"`. Record `design_version` in the data.
- Deliver **a separate .qsf** for repeat6 (it will run as its own Prolific study). Both versions share one codebase.

## 2. Scene sets

6 scene sets, SS1–SS6. Each has a fixed **novel object + word**, a fixed **incidental object type + colour**, and a **stranger slot**.

**Words:** bosa, daxa, tefo, gimu, **lufi, mavo**.
- Why these two: lufi is the only word whose vowel pattern (u–i) and onset (l) don't overlap with the four kept words. Mavo shares only its first vowel with daxa.
- The other options all overlap more:
  - zibu and fiku have the same vowel pattern as gimu (i–u).
  - pemo has the same vowel pattern as tefo (e–o).
  - hosi has the same first vowel and the same s as bosa.
  - keku shares a first vowel with tefo and a final u with gimu, and its onset is the voiceless twin of gimu's g.
  - vuno shares a first vowel with lufi.
- **Object drawings:** use the two drawings most different in shape and colour from the bosa/daxa/tefo/gimu objects and from each other, and label them lufi and mavo. If the drawings currently labelled lufi and mavo aren't the most distinct, reassign the labels. Show me the 6 objects side by side before building.

**Incidental objects:** use 6 types. Keep mug and vase, and choose the 4 other types most different from them and from each other. Colours are assigned as in the current spec. **A repeated scene shows the same incidental object in the same colour both times.**

## 3. Conditions, lists and strangers

- **3 known + 3 unfamiliar scene sets per participant.**
- **Lists:** list A has SS1, SS3, SS5 known and SS2, SS4, SS6 unfamiliar; list B swaps them. Every word and incidental object appears in both conditions across lists.
- **Strangers come in matched pairs** (same gender presentation and age band). Each pair fills one known slot and one unfamiliar slot, so the two conditions always have identical stranger demographics: pair 1 → SS1/SS2, pair 2 → SS3/SS4, pair 3 → SS5/SS6.
- **Stranger set (new between-subjects factor).** Two sets, so all 12 strangers are used across participants and gender is balanced overall:
  - **Set X:** s01/s07 (young women), s04/s10 (middle-aged men), s05/s11 (older women)
  - **Set Y:** s02/s08 (young men), s03/s09 (middle-aged women), s06/s12 (older men)
  - Check these pairings against the current stranger file and fix them if any pair doesn't match on gender presentation and age band.
- **Qualtrics Randomizer: 12 branches** (category 3 × list 2 × stranger set 2), evenly presented. Record `stranger_set`.
- **Foils:** use the hand-picked foils from the 12-stranger set. Within each pair, one foil changes hair style and the other changes hair colour. Then style and colour foils are balanced across conditions over the two lists.

## 4. Familiarization order (12 trials)

- **Block 1:** all 6 scene sets in random order. **Block 2:** all 6 again in a new random order. No scene repeats until all 6 have been shown.
- **Constraints**, enforced by re-sampling until all hold:
  1. The first trial of block 2 is not the last scene set of block 1 (no back-to-back repeats).
  2. Within each block, no more than 2 consecutive scenes from the same condition.
  3. The last 2 trials of block 2 are one known and one unfamiliar scene, in random order.
- **Second showings are identical** to the first: same stranger, audio clips, object, word, incidental object and colour, animation and timing.
- The same unfamiliar avatar and unfamiliar name are used in all 6 unfamiliar trials.

## 5. Tests (18 trials)

Fixed test order as before: Word → Face → Incidental.

- **Word (6 trials, 4 choices):** the target plus 3 foil objects from the other 5.
  - Each object appears as a foil exactly 3 times across the 6 trials.
  - daxa and mavo never appear in the same trial.
  - Each target appears in each of the 4 screen positions about equally often across participants.
  - Record the foils and positions.
- **Face (6 trials, 2 choices):** stranger vs. their fixed foil, with the left/right position counterbalanced.
- **Incidental (6 trials, 4 choices):** "What color was the [object]?", as before.

## 6. Data (Qualtrics embedded data)

Same fields as unique12, with these changes:

- **Participant:** add `design_version`, `stranger_set`.
- **Familiarization `fam_01`–`fam_12`:** add `presentation` (1 or 2), `serial_position` (1–12) and `lag` (trials since that scene set's first showing; blank for presentation 1). `view_ms` is recorded separately for each showing.
- **Tests:** keyed by `scene_set_id` (SS1–SS6), so there are 6 trials per test type.
- Update the reshape script so long-format output has one row per familiarization trial (with `presentation`) and one row per test trial. Test the script on both versions.

## 7. Duration

- Familiarization is still 12 trials, so it takes about as long as before. The tests drop from 36 to 18 trials.
- Update the duration estimate and the consent page.

## 8. README

Describe both versions, the order constraints and the stranger-set pairings. Include a short check script that generates 1,000 orders and confirms that every constraint holds and that foil appearances and positions are balanced.
