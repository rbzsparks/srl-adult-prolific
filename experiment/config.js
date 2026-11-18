/* =====================================================================
 * config.js: every count, timing, code and [DECISION] flag lives here.
 * Edit this file, push to GitHub Pages, and the live study picks it up.
 * ===================================================================== */
window.SRL_CONFIG = {
  VERSION: '2.1.1',

  /* ---------- Qualtrics ---------- */
  // 'legacy' = classic layouts (Flat / Modern / Classic): Qualtrics.SurveyEngine.setEmbeddedData
  // 'nste'   = New Survey Taking Experience: Qualtrics.SurveyEngine.setJSEmbeddedData and
  //            __js_-prefixed fields in the survey flow. UNTESTED, see README.
  QUALTRICS_ENGINE: 'legacy',
  // Max characters per full_data_json_N chunk (Qualtrics limit is 20 KB per value).
  JSON_CHUNK_CHARS: 15000,
  JSON_CHUNKS: 4,

  /* ---------- Prolific ---------- */
  COMPLETION_CODE: 'COMPLETION_CODE',   // placeholder; also set in the .qsf end-of-survey redirect
  SCREENOUT_CODE: 'SCREENOUT_CODE',     // placeholder; used only by the device-check branch in Qualtrics

  /* ---------- Secondary backup: DataPipe -> OSF ---------- */
  DATAPIPE: {
    ENABLED: true,                       // skipped automatically in debug mode or while the ID is a placeholder
    EXPERIMENT_ID: 'DATAPIPE_EXPERIMENT_ID',
    URL: 'https://pipe.jspsych.org/api/data/'
  },

  /* ---------- [DECISION] flags ---------- */
  SURPRISE_TEST: true,          // true = incidental learning (no mention of a memory test)
  SHOW_NAME_LABEL: true,        // true = the known/unfamiliar person's name is shown as text beneath them in every scene.
                                // Per-participant override: URL / Qualtrics embedded field name_label=1 (show) or 0 (hide).
                                // Recorded as name_label_shown.
  MOUSEVIEW: false,             // blur-except-cursor spotlight + AOI dwell logging during scenes
  MOUSEVIEW_RADIUS: 0.08,       // spotlight radius as a fraction of stage width
  MOUSEVIEW_BLUR_PX: 12,
  TEST_BLOCK_ORDER_MODE: 'fixed',               // 'fixed' or 'counterbalanced' (random of 6 orders)
  TEST_BLOCK_ORDER_FIXED: ['word', 'face', 'incid'],
  CONFIDENCE_RATINGS: false,    // 1-4 confidence after each test trial
  AUDIO_CHECK_EXCLUDES: false,  // false = failed audio check is flagged only (never screened out)

  /* ---------- Timing (ms) ---------- */
  TIMING: {
    STRANGER_ENTER: 600,
    AFTER_ENTER_PAUSE: 300,
    RESPONSE: 900,              // other person's nonverbal response after greeting
    BEFORE_LABEL_PAUSE: 300,
    JOINT_ATTENTION_LAG: 300,   // other person's eyes follow stranger's gaze to the object
    OBJECT_PULSE: 300,
    SPACE_ENABLE_AFTER_LABEL: 1000,
    AUTO_ADVANCE_AFTER_LABEL: 15000,
    ISI: 500,
    FILLER1: 15000,             // "Get ready" countdown between the scene instructions and the first scene
    FILLER2: 45000,             // arithmetic verification after the scenes (retention delay)
    FILLER2_DEADLINE: 3000,     // response deadline per arithmetic problem (counts as an error if missed)
    TEST_ITI: 400
  },
  // Overrides applied when ?debug=1 (or Qualtrics embedded field debug=1)
  DEBUG_TIMING: {
    FILLER1: 5000,
    FILLER2: 15000
  },
  FILLER2_ENGAGEMENT_MIN: 0.70, // filler2_low_engagement = 1 when arithmetic accuracy is below this

  /* ---------- Device ---------- */
  DEVICE: {
    MIN_SCREEN_W: 1024,         // screen check (screen.width/height) runs in Qualtrics before consent
    MIN_SCREEN_H: 650,
    WINDOW_PROMPT_W: 1000,      // if the browser window is smaller, ask to maximize (never reject)
    WINDOW_PROMPT_H: 600
  },

  /* ---------- Stage (logical coordinates; scaled to fit the window) ---------- */
  STAGE_W: 1000,
  STAGE_H: 625,

  /* ---------- Closeness categories (between subjects; set by Qualtrics Randomizer) ---------- */
  CATEGORIES: {
    acquaintance: 'Think of an <b>acquaintance</b>: someone you know by name and see from time to time, but are not close to (for example, a coworker, classmate, neighbor, or distant relative).',
    moderate: 'Think of a <b>friend or family member you are somewhat close to</b>, but who is not one of your very closest people.',
    close: 'Think of one of your <b>closest friends or family members</b>: someone you feel very close to.'
  },
  NAME_INSTRUCTION: "Please type their first name, not a family title like 'Mom' or 'Grandpa.' Please do not name a romantic partner.",
  FAMILY_TITLES: ['mom', 'mum', 'mommy', 'mummy', 'mother', 'ma', 'mama', 'momma', 'dad', 'daddy', 'father', 'pa', 'papa', 'pop', 'pops',
    'grandma', 'grandpa', 'grandmother', 'grandfather', 'granny', 'gran', 'grandad', 'granddad', 'gramps', 'nana', 'nan', 'nanna',
    'abuela', 'abuelo', 'oma', 'opa', 'auntie', 'aunty', 'aunt', 'uncle', 'sis', 'sister', 'bro', 'brother', 'cousin',
    'son', 'daughter', 'niece', 'nephew', 'stepmom', 'stepdad', 'friend', 'boss', 'neighbor', 'neighbour', 'coworker'],

  RELATIONSHIP_TYPES: ['Friend', 'Parent', 'Sibling', 'Grandparent', 'Other relative', 'Coworker or classmate', 'Neighbor', 'Other'],
  KIN_TYPES: ['Parent', 'Sibling', 'Grandparent', 'Other relative'],
  CONTACT_FREQ: ['Daily', 'A few times a week', 'About once a week', 'A few times a month', 'About once a month', 'Less than once a month'],
  DURATION: ['Less than 1 year', '1–3 years', '3–5 years', '5–10 years', 'More than 10 years'],

  /* ---------- Unfamiliar person ---------- */
  UNFAMILIAR_NAMES: ['Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Avery', 'Quinn', 'Jamie', 'Rowan', 'Emery', 'Reese', 'Sasha'],
  // The unfamiliar person copies the group features and differs as an individual (rules in js/avatar_rules.js).
  AVATAR_UNFAM_K: 4,                       // identity sliders moved
  AVATAR_UNFAM_K_BALD_NO_FACIAL_HAIR: 5,   // identity sliders moved when the known person is bald with no facial hair
  AVATAR_UNFAM_STEP: 0.35,                 // move per identity slider (sliders run 0-1)
  AVATAR_UNFAM_COLOUR_MAX_STEPS: 2,        // largest hair-colour change on the natural scale

  /* ---------- Face-test foils ----------
   * Foils are FIXED in stimuli/stimuli.json. These two values are read by tools/make_foils.html when the foils are
   * (re)generated; changing them here does nothing until the foils are regenerated and the stimulus file redeployed. */
  FOIL_K: 4,                               // identity sliders moved per foil
  FOIL_STEP: 0.35,                         // foil difficulty: move per identity slider

  /* ---------- Audio check ---------- */
  AUDIO_CHECK_WORDS: ['window', 'garden'],

  /* ---------- Paths (relative to the experiment base URL) ---------- */
  AUDIO_DIR: 'audio/',
  STIMULI_JSON: 'stimuli/stimuli.json',

  /* ---------- Copy ---------- */
  ESTIMATED_MINUTES: 19
};
