"""Shared helpers for the audio tools: clip list (from stimuli.json + config.js), ffmpeg lookup, manifest I/O."""
import csv
import glob
import json
import os
import re
import shutil

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
EXP = os.path.join(ROOT, 'experiment')
MANIFEST = os.path.join(EXP, 'audio', 'audio_manifest.csv')
MANIFEST_COLS = ['clip_id', 'speaker_id', 'speaker_gender', 'speaker_age', 'text', 'pronunciation', 'file', 'duration_ms',
                 'is_placeholder', 'ipa', 'stress', 'notes', 'source']


def find_tool(name):
    p = shutil.which(name) or os.environ.get(name.upper())
    if p:
        return p
    hits = glob.glob(os.path.expandvars(r'%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg*\ffmpeg-*\bin\\' + name + '.exe'))
    if hits:
        return hits[0]
    raise SystemExit(f'{name} not found. Install ffmpeg (winget install Gyan.FFmpeg) or set {name.upper()}=<path>.')


def load_stimuli():
    with open(os.path.join(EXP, 'stimuli', 'stimuli.json'), encoding='utf-8') as f:
        return json.load(f)


def audio_check_words():
    with open(os.path.join(EXP, 'config.js'), encoding='utf-8') as f:
        m = re.search(r"AUDIO_CHECK_WORDS:\s*\[([^\]]*)\]", f.read())
    return re.findall(r"'([^']+)'", m.group(1))


def clips():
    """Every clip the experiment loads, with its text and speaker. Order = manifest order."""
    st = load_stimuli()
    words = st['words']
    nar = st['narrator']
    out = []
    gender = {'f': 'female', 'm': 'male'}

    def pron(w):
        return f"{w} = {words[w]['respelling']}"

    for s in st['scene_sets']:
        spk = s['voice']['speaker_id']
        g, a = gender[s['stranger']['gender']], s['stranger']['age']
        out.append(dict(clip_id='greet_' + s['id'], speaker_id=spk, speaker_gender=g, speaker_age=a, voice=s['voice'],
                        text='Hi! Good to see you!', pronunciation='', ipa='', stress='', word=None, kind='greet'))
        w = s['word']
        out.append(dict(clip_id='label_' + s['id'], speaker_id=spk, speaker_gender=g, speaker_age=a, voice=s['voice'],
                        text=f"Look! It's a {w}! A {w}!", pronunciation=pron(w), ipa=words[w]['ipa'], stress=words[w]['stress'],
                        word=w, kind='label',
                        notes='Keep clear pauses after "Look!" and after the first word token: the animation finds them to time the gaze shifts.'))
    for s in st['scene_sets']:
        w = s['word']
        out.append(dict(clip_id='test_word_' + w, speaker_id='narrator', speaker_gender=nar['gender'], speaker_age=nar['age'],
                        voice=nar['placeholder_voice'], text=f'Which one is the {w}?', pronunciation=pron(w), ipa=words[w]['ipa'],
                        stress=words[w]['stress'], word=w, kind='test_word'))
    out.append(dict(clip_id='test_face', speaker_id='narrator', speaker_gender=nar['gender'], speaker_age=nar['age'],
                    voice=nar['placeholder_voice'], text='Which of these people did you see?', pronunciation='', ipa='', stress='',
                    word=None, kind='test_face'))
    for s in st['scene_sets']:
        label = st['incidental_types'][s['incidental']]
        out.append(dict(clip_id='test_incid_' + s['incidental'], speaker_id='narrator', speaker_gender=nar['gender'],
                        speaker_age=nar['age'], voice=nar['placeholder_voice'], text=f'What color was the {label}?',
                        pronunciation='', ipa='', stress='', word=None, kind='test_incid'))
    for w in audio_check_words():
        out.append(dict(clip_id='check_' + w, speaker_id='narrator', speaker_gender=nar['gender'], speaker_age=nar['age'],
                        voice=nar['placeholder_voice'], text=w, pronunciation='', ipa='', stress='', word=None, kind='check'))
    return out


def read_manifest():
    if not os.path.exists(MANIFEST):
        return []
    with open(MANIFEST, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def write_manifest(rows):
    os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
    with open(MANIFEST, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=MANIFEST_COLS, extrasaction='ignore')
        w.writeheader()
        for r in rows:
            w.writerow(r)
