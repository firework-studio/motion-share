---
name: tutorial-film
description: 做一条“现场演示”风格的 AI 教程短视频（竖版，约 60 秒）：从一条喜欢的参考视频出发，逐帧拆解，写旁白、配音、做会说话的主持人，再用 HyperFrames（HTML 做视频）一段段做出画面。用户说“照这个视频做一条教程片”“帮我做一条讲 X 的短视频”时使用。
---

# 现场演示教程片

一条片子里，每一句旁白都是一个正在发生的操作：光标点、拖、打字、发送，东西落下、被圈出、盖章。左下角的主持人跟着说话、换手势。本包提供动作函数、物件样式、模板和主持人流水线。

## 准备（第一次）

1. Node.js 18+、Python 3、ffmpeg。缺什么先装什么，一步步告诉用户怎么点。
2. HyperFrames：`npx hyperframes --version` 能跑即可。
3. 配音：ElevenLabs 的 API key 和一个声音（或用户自己的克隆声音），放进环境变量 `ELEVENLABS_API_KEY`、`ELEVENLABS_VOICE_ID`。不要把 key 写进任何文件。

## 流程

按顺序做，每一段在浏览器预览里给用户确认后再做下一段。

1. **建工程**：`python3 kit/new_tutorial.py <项目文件夹> <英文名> <秒数>`。它生成 HyperFrames 工程、示例片、配音脚本和模板。
2. **拆参考视频**：用户丢进来一条喜欢的视频。按 `templates/逐帧拆解需求.md` 逐段量：每个动作的起止帧、位置大小、缓动、对应的旁白。能直接看视频就看；不能就用 ffmpeg 抽帧（`ffmpeg -i ref.mp4 -vf fps=10 f_%04d.jpg`）再量。参考视频只作测量依据，里面的人物、截图、品牌不进成片。
3. **写旁白**：用 `templates/旁白稿模板.md`。口吻“我带你做”，每句回答上一句的疑问，全程一个例子。用户确认后填进 `voice/gen.py` 的 `LINES`，一次生成整段。
4. **取时间**：`python3 words.py` 列出每句起止，`python3 words.py 关键词` 查某个词的起点。画面上的每个动作都挂在旁白的字上。
5. **做主持人**：按 `host/角色说明.md` 出用户自己角色的姿势图、口型与眨眼图层、点阵影子，写 `assets/host/plan.js` 的换姿势时间，然后去掉 `index.html` 里主持人那一行的注释。
6. **一段段做画面**：在 `app-hyperframes/index.html` 写物件和一个 `render(T)`，用 `assets/kit/live-kit.js` 的函数把动作表逐行落实（见下）。做完一段：`npx hyperframes check`，按关键时间 `npx hyperframes snapshot --at <秒>` 截图，和参考视频同一时刻并排对照，再给用户看。
7. **改**：用户说哪里不对（最好截图圈出来），就只改那里，改完截图确认。
8. **渲染**：用户确认整片后 `npx hyperframes render --quality delivery --workers 1 --output renders/成片.mp4`（多进程渲染会让静止的字周期性抖动），再把响度标准化到约 -14 LUFS。

## render(T) 的写法

所有状态都由成片时间 `T` 算出：拖到任意一帧都对，不用 setTimeout，不靠上一帧的状态。

```js
const K = LiveKit, { $, P, Eout, lerp, place, show, land } = K;
function render(T) {
  K.subtitles(T, [["s1", [0.4, 1.0, 1.6], 3.0]]);        // 页面 id、每个词出现的时间、换页时间
  K.stepBadge($("#step"), T, [0.4, 8.4], 11.4);          // 步骤数字弹出后缩到角标
  const L = land(T, 1.2);                                 // 1.2 秒落下（8 帧回弹）
  show($("#file"), T < 1.2 ? 0 : L.a);
  place($("#file"), 380, 400 + L.y, 230, 280, -5, L.s);
  K.stamp($("#stamp1"), T, 6.4, 8.2);                    // 6.4 秒盖章，8.2 秒退场
  K.cursor($("#cur"), $("#ring"), T, path, { clicks: [1.8, 3.2], from: 1.2, until: 11.4 });
  K.signature(T, 11.4);                                  // 片尾落款
}
K.mount(render, 13);
```

| 函数 | 作用 |
| --- | --- |
| `P(T, a, b)` | T 在 [a, b] 里的进度 0–1 |
| `Eout` / `Eio` | 先快后稳（物件到位）/ 两头慢（光标移动） |
| `kf(T, [[t, v], ...])` | 分段关键帧 |
| `route(T, [[t, x, y], ...])` | 光标路径；弧线写成 `["bez", 起, 止, P0, P1, P2, P3]` |
| `land(T, t0)` | 8 帧落下：透明度、缩放、y 偏移 |
| `stamp(el, T, t0, tOut)` | 6 帧盖章 |
| `subtitles(T, pages)` | 一行字幕逐词出现、换页 |
| `stepBadge(el, T, starts, end)` | 步骤数字弹出后缩到右上角 |
| `cursor(cur, ring, T, path, opts)` | 光标、按压、点击环 |
| `typed(T, segs)` | 打字到当前时刻的文字 |
| `drawStroke(path, T, t0, t1)` | 沿 SVG 路径划线、画圈、打勾 |
| `intoFolder(T, t0, t1, t2, from, apex, to)` | 文件飞到文件夹口上方，换到正面后面，落进去 |
| `signature(T, t0)` | 画面淡出，标志与名字同时淡入并停留 |

## 让它不像 AI 做的

- **联动**：东西落地、盖章时，周围要有回应。容器轻跳一下，主持人顺势沉一下、往那边倾一点，一小团点阵烟尘或几根短射线，重的时刻画面轻震两三帧。一张“节拍表”同时驱动这几样，就自然对齐了。
- **克制**：一次只做一件事，做完就收（半秒内）；红色只给最重要的字。
- **不定格**：两拍之间主持人缓慢摆动，镜头有 ±2 px、1% 的慢速推拉。
- **因果**：点了才弹出，拖进去才有结果，发送后才有回应。
- 文件落进文件夹，要先到文件夹口上方，再换到正面后面落下，否则会穿帮。
- 展示录屏或截图时停在干净的状态，不要定格在过渡中途。
