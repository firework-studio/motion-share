# Start a new live-demonstration tutorial film from this kit.
#   python3 kit/new_tutorial.py ../my-first-tutorial my-first-tutorial [seconds]
# Creates <project>/app-hyperframes (a HyperFrames project with the kit, the fonts and the example film), <project>/voice/gen.py (voiceover), <project>/words.py (word times) and <project>/docs/ (the brief templates).
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

# the starting film, the voice and word-time scripts, the brief templates
html = (PACK / "kit/example.html").read_text().replace("DURATION", f"{seconds:g}")
(app / "index.html").write_text(html)
if not (project / "voice/gen.py").exists(): shutil.copy(PACK / "templates/gen_voice.py", project / "voice/gen.py")  # never overwrite work already there
if not (project / "words.py").exists(): shutil.copy(PACK / "templates/words.py", project / "words.py")  # never overwrite work already there
for f in ("旁白稿模板.md", "逐帧拆解需求.md", "设计需求.md"):
    if not (project / "docs" / f).exists(): shutil.copy(PACK / "templates" / f, project / "docs" / f)
print(f"created {app}\nnext: write the voiceover in docs/旁白稿模板.md, then voice/gen.py; see SKILL.md")
