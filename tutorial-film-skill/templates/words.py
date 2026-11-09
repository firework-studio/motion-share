# Sentence and word times of the voiceover, in film time (the voice starts at 0.4 s).
#   python3 agent-workdir/words.py                 → every sentence with its start and end
#   python3 agent-workdir/words.py 高级感 逐帧量     → the start of each given word
import json, os, sys
OFF = 0.4
here = os.path.dirname(os.path.abspath(__file__))
a = json.load(open(os.path.join(here, "voice/旁白.alignment.json")))  # written by voice/gen.py
chars, st, en = a["characters"], a["character_start_times_seconds"], a["character_end_times_seconds"]
text = "".join(chars)
if len(sys.argv) > 1:
    for w in sys.argv[1:]:
        i = text.find(w)
        print(w, "—" if i < 0 else f"{st[i] + OFF:.2f}")
else:
    s, t0 = "", None
    for c, a0, a1 in zip(chars, st, en):
        t0 = a0 if t0 is None else t0
        s += c
        if c in "。？！":
            print(f"{t0 + OFF:6.2f}–{a1 + OFF:6.2f}  {s.strip()}"); s, t0 = "", None
