# 现场演示教程片 · Skill

把一条你喜欢的短视频，变成一条讲你自己内容的教程片：逐帧拆原片、写旁白、配音，再一段段做出画面。这是 Firework 工作室做教程短视频用的整套系统。

## 怎么用

**Claude Code**：把整个 `tutorial-film-skill` 文件夹复制到 `~/.claude/skills/`（所有项目可用）或项目里的 `.claude/skills/`。新开一个对话，说“照这条视频的节奏，做一条讲 X 的教程片”，它会按 `SKILL.md` 一步步带你做。

**Cursor、Trae、Codex 等**：把文件夹放进项目，对话时让它“先读 tutorial-film-skill/SKILL.md，再按流程做”。

需要：Node.js 18+、Python 3、ffmpeg；配音用 ElevenLabs（或换成任意能给出逐字时间的配音服务）。

## 六步

1. 装一个 AI 编程工具（Claude Code、Cursor、Trae 都行）
2. 建一个文件夹，素材、配音、成片都放在里面
3. 新开一个对话，选本地、选这个文件夹
4. 让它查一遍环境，缺什么它自己装
5. 丢给它一条喜欢的视频，说一句话：照这个节奏，做一条讲我自己的片子
6. 哪里不对，截图圈出来告诉它

## 里面有什么

| 路径 | 内容 |
| --- | --- |
| `SKILL.md` | 给 AI 读的完整流程和规则 |
| `kit/live-kit.js` | 动作函数：落下、盖章、字幕、步骤数字、光标与点击、打字、划线、文件落进文件夹、片尾落款 |
| `kit/live-kit.css` | 物件样式：对话框、输入条、文件、帧条、数据表、代码编辑器、文件夹等 |
| `kit/example.html` | 13 秒示例片，每个零件用一次 |
| `kit/new_tutorial.py` | 一条命令建好新工程 |
| `templates/` | 旁白稿、逐帧拆解、设计需求三份模板，配音脚本，逐字时间脚本 |
| `assets/svg/` | 物件的点阵投影和图标 |
| `assets/fonts/` | Noto Sans SC、Noto Serif SC、JetBrains Mono（OFL，可商用） |

## 许可

代码使用 MIT 协议（仓库根目录 `LICENSE`）。字体沿用 SIL Open Font License 1.1，见 `assets/fonts/OFL.txt`。
