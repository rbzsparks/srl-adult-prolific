# Linking the avatar to the person before the scenes (both versions: unique12 and repeat6)

## Purpose

Help participants treat the avatar as the real person they know before the scenes start. Do it in a way that treats the known avatar and the unfamiliar avatar the same. **Rule for everything here:** whatever the known avatar gets (screen time, training trials, name pairing), the unfamiliar avatar gets too. The one intended difference is what participants know about each person. Nothing in this setup mentions the scenes, objects, words or tests.

## New setup order

Steps 1, 3, 8, 9 and 11 exist already; the rest are new or changed.

1. Name entry (in JS, never saved) → relationship type → IOS → **contact frequency, now two questions** (changed, §0) → duration. *(otherwise unchanged)*
2. **Recall prompts** (new, §1)
3. Avatar designer, **with the participant's recall notes shown beside it** (§1)
4. Likeness rating → **optional one-time revision** (new, §2)
5. **Confirmation screen** (new, §2)
6. Generate the unfamiliar avatar from the *final* known avatar → **"This is Jordan" screen** (new, §3)
7. **Avatar–name matching task** (new, §4)
8. Audio check *(unchanged)*
9. 15 s get-ready screen *(unchanged)*
10. **Familiarization instructions with the new framing** (changed, §5) → scenes, with check-ins as in PERSON_CHECKINS.md
11. **Rating: how much the avatar felt like the person** (new, §6) → filler 2 → tests *(unchanged)*

The unfamiliar name ("Jordan" here) is whichever name the existing unfamiliar-name rule picks.

## §0. Contact frequency: two questions

The old single question didn't say whether texting counts. Replace it with two questions on one screen, using the same options for both:

1. **"How often do you see [name] in person?"**
2. **"How often do you talk with [name] in other ways (texting, messaging, phone or video calls)?"**
   - Clarification under question 2: "Count only messages or calls between you and [name] directly, including group chats where you message each other. Don't count just seeing their posts on social media."

**Options for both:** Every day or almost every day / A few times a week / About once a week / A few times a month / About once a month / A few times a year / Less than once a year.

**Data:** replace `contact_freq` with `contact_inperson` and `contact_remote`, coded 1–7 (1 = less than once a year, 7 = every day). Also add `contact_max` = the higher of the two. Update the reshape script and the README.

## §1. Recall prompts and notes

- **Screen 1:** "Take a moment to picture the last time you saw [name]: where you were and what they were like." Continue is enabled after 8 s.
- **Screen 2:** three short text boxes, max 150 characters each:
  - "Where were you?"
  - "What was [name] doing or wearing?"
  - "What does [name]'s face look like when they smile or laugh?"
- **Small text under the boxes:** "These notes stay in your browser, help you build the avatar, and are never saved or sent anywhere." This must be literally true:
  - Never write the text to Qualtrics embedded data, `full_data_json`, DataPipe or localStorage.
  - Clear it from memory once the designer step finishes.
  - At least one box needs some text to continue; all three are encouraged, not required.
- **In the designer:** show the notes in a side panel titled "Your notes (not saved)".
- **Record:** `recall_ms` (time on both screens), `recall_chars_1`–`recall_chars_3` (character counts only).

## §2. Likeness, revision and confirmation

- **Likeness rating** (existing): "How much does this avatar look like [name]?" (1–7).
- **Revision:** if the rating is 4 or lower, show "Would you like to adjust the avatar? You can make changes once." with **Adjust** and **Keep as is** buttons.
  - Adjust returns to the designer with the current settings, then asks for the likeness rating again.
  - Offer the revision only once.
  - **Record:** `likeness_1`, `revised` (0/1), `likeness_2` (blank if not revised), `designer_ms_2`.
- **Confirmation screen:** the final known avatar, large and centred, with the name beneath it and the text: "From here on, this avatar is [name]. Whenever you see it, picture [name]." Show the button **"OK, this is [name]"** after 3 s. **Record:** `confirm_ms`.

## §3. Introducing the unfamiliar person

- Generate the unfamiliar avatar now, from the final known avatar (after any revision).
- **Screen:** the unfamiliar avatar, at the same size and position as on the confirmation screen, with the name beneath it and the text: "This is Jordan. You haven't met Jordan before." Show the button **"OK, this is Jordan"** after 3 s. **Record:** `jordan_intro_ms`.

## §4. Avatar–name matching task

Based on the self/friend/stranger label-matching paradigm (Sui, He & Humphreys, 2012, *JEP: Human Perception and Performance*). Both pairings are trained equally.

- **Instructions:** "You'll see a person with a name below them. Press F if the name matches the person and J if it doesn't. Be quick and accurate." Counterbalance the keys across participants and record `match_keymap`.
- **Trial types** (6 each, 24 trials, random order, no more than 3 of one type in a row):
  - known avatar + known name (match)
  - unfamiliar avatar + Jordan (match)
  - known avatar + Jordan (mismatch)
  - unfamiliar avatar + known name (mismatch)
- **Trial structure:**
  1. Fixation cross, 500 ms.
  2. Avatar with the name below it, until response (max 2500 ms).
  3. Feedback, "Correct" or "Incorrect", 400 ms; "Too slow" on a timeout.
  4. 300 ms blank.
- **Length:** about 50–60 s including instructions.
- **Same layout for every trial:** avatar centred at a fixed size, name in the same font and position.
- **Trial data store labels only** (`known`/`unfamiliar` for the avatar and the name), never the typed name.
- **Qualtrics fields:**
  - `match_acc_<type>` and `match_rt_med_<type>` for each of the 4 types (median RT on correct trials only). Type names: `kk`, `uu`, `ku`, `uk`.
  - `match_acc_total`.
  - Trial-level data go in `full_data_json`.
- **Quality flag:** `match_flag` = 1 if total accuracy is under 75%. Flag only; never exclude or screen anyone out.

## §5. Familiarization instructions: framing

The greeting "Hi! Good to see you!" implies the stranger already knows the person on the right. So frame the scenes as people from their lives, not as meeting someone new. Same wording for both people:

> "Next you'll watch short moments from [name]'s and Jordan's days, as they run into people they know. Imagine you're really watching [name] and Jordan."

repeat6 adds: "Scenes may be shown more than once." Don't mention memory or tests. Keep the existing text about pressing space.

**[DECISION, Bobby to confirm]** Names under the avatars during scenes: recommend **showing the name under both people** (known name and Jordan) for the whole scene, as in UPDATES_v2. Without it, the avatar is the only reminder of who's on screen.

## §6. Rating after the scenes

- **Placement:** straight after the last familiarization trial, before filler 2.
- **Question:** "While watching the scenes, how much did the avatar feel like [name]?" (1 = not at all, 7 = completely). Shown with the known avatar.
- **Record:** `represent_rating`.

## Config

- `RECALL_ENABLED`, `REVISION_ENABLED`, `MATCHING_ENABLED`, all default `true`.
- `MATCH_TRIALS_PER_TYPE: 6`, `MATCH_MAX_RT_MS: 2500`.
- When a step is disabled, skip it and leave its fields blank. This lets pilots compare versions with and without these steps, using `represent_rating` and the likeness rating.

## Consent and README

- **Consent page:** "You'll type the first name of someone you know and some brief notes about them, to help you design an avatar. The name and notes are not saved."
- **README:** document the privacy handling (what's held in memory, when it's cleared, what's recorded). Include a test that runs a full session and searches every output field and the JSON for the typed name and the note text. The test must find neither.

## Duration

About 2 minutes extra (recall about 40 s, confirmation and introduction about 10 s, matching about 60 s, revision only for some participants). Update the estimate and the consent page for both versions.
