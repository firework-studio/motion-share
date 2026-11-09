# Start a new live-demonstration tutorial film from this kit.
#   python3 kit/new_tutorial.py ../my-first-tutorial my-first-tutorial [seconds]
# Creates <project>/app-hyperframes (a HyperFrames project with the kit, the fonts, the host composition and the example
# film), <project>/voice/gen.py (voiceover), <project>/words.py (word times) and <project>/docs/ (the brief templates).
# Your character's pose images go into app-hyperframes/assets/host/ (see host/角色说明.md).
import json, pathlib, shutil, subprocess, sys

PACK = pathlib.Path(__file__).resolve().parents[1]
if len(sys.argv) < 3:
    sys.exit(__doc__ or "usage: python3 kit/new_tutorial.py <project dir> <name> [seconds]")
project, name = pathlib.Path(sys.argv[1]).resolve(), sys.argv[2]
seconds = float(sys.argv[3]) if len(sys.argv) > 3 else 13
app = project / "app-hyperframes"
if app.exists():
    sys.exit(f"{app} exists")
for d in ("voice", "docs"):
    (project / d).mkdir(parents=True, exist_ok=True)

subprocess.run(["npx", "hyperframes", "init", "app-hyperframes", "--non-interactive", "--resolution", "portrait"], cwd=project, check=True)
for f in ("meta.json", "package.json"):
    p = app / f
    if p.exists():
        p.write_text(p.read_text().replace('"app-hyperframes"', json.dumps(name)))

# the kit: motion helpers, styles, object shadows and icons, fonts
kit = app / "assets/kit"
kit.mkdir(parents=True, exist_ok=True)
for f in (PACK / "assets/svg").glob("*.svg"):
    shutil.copy(f, kit)
for f in ("live-kit.css", "live-kit.js"):
    shutil.copy(PACK / "kit" / f, kit)
shutil.copytree(PACK / "assets/fonts", app / "assets/fonts", dirs_exist_ok=True)

# the host: the composition, a cue plan and an empty mouth track (pose images are yours)
(app / "compositions").mkdir(exist_ok=True)
shutil.copy(PACK / "host/host.html", app / "compositions/host.html")
(app / "assets/host").mkdir(parents=True, exist_ok=True)
(app / "assets/host/plan.js").write_text(f"""// host cues: film time, side, pose (the poses you made; see host/角色说明.md)
window.HOST_PLAN = {{
  film: {{ src: "", duration: {seconds:g}, fps: 30, width: 1080, height: 1440 }},
  enter: 0.2, exit: 99, height: 560, margin: 0, halftone: true,
  cues: [{{ t: 0, side: "left", pose: "explain" }}],
}};
""")
(app / "assets/host/talk.js").write_text("window.HOST_TALK = null; // host/talk_track.py writes the mouth track from your voiceover\n")

# the starting film, the voice and word-time scripts, the brief templates
# the host stays commented out until your pose images are in assets/host/ (host/角色说明.md), so the example previews as is
html = (PACK / "kit/example.html").read_text().replace("DURATION", f"{seconds:g}")
html = "\n".join(f"      <!-- 做好主持人姿势图后去掉这一行的注释 {l.strip()} -->" if 'id="host"' in l else l for l in html.splitlines()) + "\n"
(app / "index.html").write_text(html)
shutil.copy(PACK / "templates/gen_voice.py", project / "voice/gen.py")
shutil.copy(PACK / "templates/words.py", project / "words.py")
for f in ("旁白稿模板.md", "逐帧拆解需求.md", "设计需求.md"):
    shutil.copy(PACK / "templates" / f, project / "docs" / f)
print(f"created {app}\nnext: write the voiceover in docs/旁白稿模板.md, then voice/gen.py; see SKILL.md")
