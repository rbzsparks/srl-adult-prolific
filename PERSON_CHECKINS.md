# Person check-ins during familiarization (both versions: unique12 and repeat6)

## Purpose

Keep each participant's idea of the known person tied to the avatar throughout the scenes. The check-ins **never mention the scenes, the objects, the words, the strangers or anything that is tested**, so they can't act as rehearsal for the tests.

## Design

- **3 check-ins**, after familiarization trials 3, 6 and 9, in both versions. None after trial 12: that one goes straight to the filler, as now.
- **Each check-in asks the same question about both people,** one question per screen: first about one person, then about the other. Which person comes first is random at each check-in.
  - The person-in-each-scene condition doesn't determine when a check-in appears, so check-ins don't predict which condition comes next.
- **Each screen shows that person's avatar** (same size and position for both avatars) with their name and the question. Answering while looking at the avatar is what ties the person to it.
- **Self-paced, no time limit.** Each check-in takes about 10 s, about 30–40 s in total.
- **Timing:** a check-in comes after the participant presses space to end a scene, so it never affects `view_ms`. Leave a 500 ms blank before the next scene.

## Questions

There are 3 questions, each used once per participant. Which question goes with which check-in is randomized across participants (Latin square over the 3 positions).

| id | Question (same wording for both people) | Options |
|---|---|---|
| `feel` | "How do you think [name] is feeling these days?" | Not great / Okay / Good / Great / Not sure |
| `evening` | "Would [name] rather spend a free evening at home or out somewhere?" | At home / Out somewhere / Not sure |
| `dayoff` | "With a day off tomorrow, would [name] plan it or play it by ear?" | Plan it / Play it by ear / Not sure |

- Header on every check-in screen, for both people: **"Quick question. Your best guess is fine."**
- "Not sure" is always the last option. Present the other options in the order shown.
- **Before finalizing, check all questions and options against every tested item:** the 12 novel words and objects, all incidental object types used in either version (mug, vase, lamp, clock, book, candle, and the unique12 set) and their colours. No question may mention or imply any of these, or colours, objects, meeting people, or learning. Replace any question that fails the check and tell me.

## Instructions text

Add to the familiarization instructions, before the first scene:

> "Every few scenes, we'll ask a quick question about [name] and about Jordan. There are no right answers."

Don't mention memory or tests.

## Data (Qualtrics embedded data)

For each check-in k = 1–3:
- `checkin_k_qid`, `checkin_k_first` (known/unfamiliar), `checkin_k_after_trial`.
- `checkin_k_known_resp`, `checkin_k_known_rt_ms`, `checkin_k_unf_resp`, `checkin_k_unf_rt_ms`.

Store only the option chosen; no free text.

Include check-ins in `full_data_json` and the long-format reshape (one row per check-in response, with person, question, response and RT).

## Config

- `CHECKINS_ENABLED: true | false` (default true), `CHECKIN_AFTER_TRIALS: [3, 6, 9]`.
- When disabled, nothing is shown and the fields are left blank.
- The switch lets us pilot with and without check-ins and compare the post-scene rating "How much did the avatar feel like [name]?" between the two.

## Duration

Add about 40 s to the estimate for both versions.
