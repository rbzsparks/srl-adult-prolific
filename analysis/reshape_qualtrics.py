"""Reshape a Qualtrics CSV export (wide embedded data) into long format: one row per trial.

Output columns follow EXPERIMENT_SPEC §6: participant-level columns repeated on every row, then
familiarization rows (phase = familiarization) and test rows (phase = test), plus the model coding:
    k = closeness   known scenes: ios - 1 (0-6); unfamiliar scenes: 0
    f = feature     word / face -> 'target'; incid -> 'incidental'
    correct (0/1)

Works with either export option ("Use numeric values" or "Use choice text"), with the 3-row Qualtrics header
(names / question text / ImportId JSON) or a plain 1-row header, and with legacy or NSTE (__js_-prefixed) fields.
Also reassembles full_data_json_1..N and checks it against the wide fields (prints mismatches).

Usage:
    python analysis/reshape_qualtrics.py qualtrics_export.csv -o long.csv [--include-incomplete] [--include-debug]
"""
import argparse
import csv
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
FIELDS_JS = os.path.join(HERE, '..', 'experiment', 'js', 'fields.js')


def load_fields():
    txt = open(FIELDS_JS, encoding='utf-8').read()
    start = txt.index('{', txt.index('window.SRL_FIELDS'))
    return json.loads(txt[start: txt.rindex('}') + 1])


def read_export(path):
    with open(path, newline='', encoding='utf-8-sig') as fh:
        rows = list(csv.reader(fh))
    header = rows[0]
    body = rows[1:]
    # Qualtrics exports have 2 extra header rows: question text, then {"ImportId": ...}
    if len(body) >= 2 and body[1] and body[1][0].startswith('{"ImportId"'):
        body = body[2:]
    recs = []
    for r in body:
        d = dict(zip(header, r))
        # Strip the NSTE prefix so both engines look the same.
        recs.append({(k[5:] if k.startswith('__js_') else k): v for k, v in d.items()})
    return recs


LONG_COLS = [
    # participant level
    'prolific_pid', 'study_id', 'session_id', 'response_id', 'category', 'list', 'test_block_order', 'surprise_test', 'name_label_shown', 'mouseview_on',
    'relationship_type', 'is_kin', 'ios', 'contact_freq', 'duration', 'name_length', 'name_flagged_title', 'name_suspect',
    'known_avatar', 'unfamiliar_avatar', 'avatar_diff_features', 'unfamiliar_name', 'audio_check_pass',
    'filler1_solved', 'filler1_moves', 'filler2_accuracy', 'fam_fast_advance_count', 'fam_timeout_count',
    'fullscreen_exits', 'tab_switches', 'reload_pre_fam', 'reloaded_post_fam', 'browser', 'screen_w', 'screen_h', 'total_ms',
    'expected_test', 'strategy', 'attention_check_1', 'attention_check_2', 'age', 'gender',
    # trial level
    'phase', 'trial_index', 'scene_set_id', 'condition', 'stranger_id', 'word', 'incidental_type', 'incidental_color',
    'viewing_time_ms', 'timed_out', 'label_audio_ms',
    'test_type', 'target_id', 'foil_ids', 'target_position', 'response_id_choice', 'correct', 'rt_ms',
    'k', 'f'
]
PCOLS_FROM_ED = ['category', 'list', 'test_block_order', 'surprise_test', 'name_label_shown', 'mouseview_on', 'relationship_type', 'is_kin', 'ios',
                 'contact_freq', 'duration', 'name_length', 'name_flagged_title', 'name_suspect', 'known_avatar', 'unfamiliar_avatar',
                 'avatar_diff_features', 'unfamiliar_name', 'audio_check_pass', 'filler1_solved', 'filler1_moves', 'filler2_accuracy',
                 'fam_fast_advance_count', 'fam_timeout_count', 'fullscreen_exits', 'tab_switches', 'reload_pre_fam',
                 'reloaded_post_fam', 'browser', 'screen_w', 'screen_h', 'total_ms']
NATIVE = {'prolific_pid': 'PROLIFIC_PID', 'study_id': 'STUDY_ID', 'session_id': 'SESSION_ID', 'response_id': 'ResponseId',
          'expected_test': 'expected_test', 'strategy': 'strategy', 'attention_check_1': 'attention_check_1',
          'attention_check_2': 'attention_check_2', 'age': 'age', 'gender': 'gender'}


def to_int(x):
    try:
        return int(float(x))
    except (TypeError, ValueError):
        return None


def reshape(recs, F, include_incomplete=False, include_debug=False):
    out, problems = [], []
    for d in recs:
        if not d.get('category'):
            continue  # screened out / never reached the experiment
        if d.get('debug') == '1' and not include_debug:
            continue
        if d.get('reloaded_post_fam') == '1' and not include_incomplete:
            continue
        base = {c: d.get(c, '') for c in PCOLS_FROM_ED}
        for c, src in NATIVE.items():
            base[c] = d.get(src, '')
        ios = to_int(d.get('ios'))
        fam = {}
        for i in range(1, F['fam_count'] + 1):
            p = f"{F['fam_prefix']}{i:02d}_"
            if not d.get(p + 'scene_set_id'):
                continue
            row = dict(base, phase='familiarization', trial_index=i, scene_set_id=d[p + 'scene_set_id'], condition=d[p + 'condition'],
                       stranger_id=d[p + 'stranger_id'], word=d[p + 'word'], incidental_type=d[p + 'incidental_type'],
                       incidental_color=d[p + 'incidental_color'], viewing_time_ms=d[p + 'view_ms'], timed_out=d[p + 'timed_out'],
                       label_audio_ms=d[p + 'label_audio_ms'])
            fam[row['scene_set_id']] = row
            out.append(row)
        # Test rows: ordered by block, then scene set (the JSON backup has the exact presentation order).
        order = (d.get('test_block_order') or 'word>face>incid').split('>')
        tests, n = [], 0
        for t in order:
            for sid in F['scene_set_ids']:
                p = f'test_{t}_{sid}_'
                if d.get(p + 'correct', '') == '':
                    continue
                n += 1
                fi = fam.get(sid, {})
                cond = fi.get('condition', '')
                k = (ios - 1) if (cond == 'known' and ios is not None) else (0 if cond == 'unfamiliar' else '')
                tests.append(dict(base, phase='test', trial_index=n, scene_set_id=sid, condition=cond, stranger_id=fi.get('stranger_id', ''),
                                  word=fi.get('word', ''), incidental_type=fi.get('incidental_type', ''), incidental_color=fi.get('incidental_color', ''),
                                  test_type=t, target_id={'word': '', 'face': fi.get('stranger_id', ''), 'incid': fi.get('incidental_color', '')}[t],
                                  foil_ids=d[p + 'foils'], target_position=d[p + 'position'], response_id_choice=d[p + 'choice'],
                                  correct=d[p + 'correct'], rt_ms=d[p + 'rt_ms'], k=k, f='incidental' if t == 'incid' else 'target'))
        out.extend(tests)
        # Cross-check against the JSON backup; also fills the word-test target object id.
        js = ''.join(d.get(f"{F['json_prefix']}{i}", '') for i in range(1, F['json_chunks'] + 1))
        if js:
            try:
                j = json.loads(js)
                byk = {(t['test_type'], t['scene_set_id']): t for t in j.get('test', [])}
                for r in tests:
                    jt = byk.get((r['test_type'], r['scene_set_id']))
                    if jt is None or str(jt['correct']) != str(r['correct']) or str(jt['rt_ms']) != str(r['rt_ms']):
                        problems.append(f"{base['prolific_pid']}: mismatch {r['test_type']} {r['scene_set_id']}")
                    elif r['test_type'] == 'word':
                        r['target_id'] = jt['target_id']
            except json.JSONDecodeError:
                problems.append(f"{base['prolific_pid']}: full_data_json could not be parsed (truncated={d.get('full_data_json_truncated')})")
    return out, problems


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('export')
    ap.add_argument('-o', '--out', default='long_format.csv')
    ap.add_argument('--include-incomplete', action='store_true', help='keep participants with reloaded_post_fam = 1')
    ap.add_argument('--include-debug', action='store_true', help='keep debug=1 runs')
    a = ap.parse_args()
    F = load_fields()
    recs = read_export(a.export)
    out, problems = reshape(recs, F, a.include_incomplete, a.include_debug)
    with open(a.out, 'w', newline='', encoding='utf-8') as fh:
        w = csv.DictWriter(fh, fieldnames=LONG_COLS, extrasaction='ignore')
        w.writeheader()
        for r in out:
            w.writerow(r)
    n_p = len({(r['prolific_pid'], r['response_id']) for r in out})
    print(f'{len(recs)} responses read -> {n_p} participants, {len(out)} rows written to {a.out}')
    for p in problems:
        print('CHECK:', p, file=sys.stderr)


if __name__ == '__main__':
    main()
