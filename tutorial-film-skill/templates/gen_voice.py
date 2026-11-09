# Voiceover in one take (so the sentences flow), with per-character times for timing the film.
# Writes 旁白.mp3 and 旁白.alignment.json next to this script.
#   export ELEVENLABS_API_KEY=...      your key (never paste it into the project files)
#   export ELEVENLABS_VOICE_ID=...     a voice from your library, or your own cloned voice
#   python3 voice/gen.py
# Any other TTS works too: what the film needs is the audio and the start time of each character.
import base64, json, os, sys, urllib.request

key, voice = os.environ.get("ELEVENLABS_API_KEY"), os.environ.get("ELEVENLABS_VOICE_ID")
if not key or not voice:
    sys.exit("set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID first")
# one entry per sentence; each sentence answers the question the last one raised
LINES = [
    "第一句。",
    "第二句。",
]
req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_192",
    data=json.dumps({"text": "".join(LINES), "model_id": "eleven_multilingual_v2", "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}}).encode(),
    headers={"xi-api-key": key, "Content-Type": "application/json"})
r = json.load(urllib.request.urlopen(req, timeout=180))
here = os.path.dirname(os.path.abspath(__file__))
open(os.path.join(here, "旁白.mp3"), "wb").write(base64.b64decode(r["audio_base64"]))
json.dump(r.get("alignment"), open(os.path.join(here, "旁白.alignment.json"), "w"), ensure_ascii=False)
print("ok")
