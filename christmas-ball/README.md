# 圣诞彩球红团子

一支 17.5 秒的横屏动画（1920×1080，60 fps）。四滴红液滴聚拢、长成小红书图标，图标放出一颗收藏星钻进红团子，团子一路变成八颗圣诞彩球：雪白、拐杖糖、松绿针织、冰块、红绿格、冬青、酒红丝绒、月光银。每次换皮，新材质从一侧漫进来，身体跟着受力凹陷、压扁、回弹。最后圣诞彩带炸开，团子吊在红绳上落进 REDnote 的 o，挂上松枝；松枝一抬，结被扯开，团子缩回一个小红点。

非官方概念动画，灵感来自 Krea 的一支小球动画，形变节奏按原片逐帧测量。

用 [HyperFrames](https://hyperframes.heygen.com)（HTML 做视频）制作。团子是 WebGL 球体，材质贴在球面上实时渲染；液滴融合用距离场；挂绳是物理模拟。

成片预览：[preview.mp4](preview.mp4)

## 运行

需要 Node.js 18 以上。在本文件夹中执行：

```bash
npx hyperframes preview                    # 浏览器里预览，可拖动时间轴逐帧看
npx hyperframes render --fps 60 --output out.mp4    # 导出视频
```

## 三种画面

改 `assets/mode.js` 里的 `FILM_MODE`，可以导出三种画面：

| 值 | 画面 |
| --- | --- |
| `film` | 成片 |
| `trace` | 成片上叠加丝滑的运动路线：团子球心、液滴、收藏星 |
| `timeline` | 仿剪辑软件的时间轴：图层、属性关键帧、表达式、Graph Editor 曲线、音频波形，跟着画面实时走（画在画面左上 1313×1011 的区域） |

## 常改的地方

| 想改什么 | 改哪里 |
| --- | --- |
| 彩球的顺序和出现时间 | `assets/xhs.js` 里的 `SKINS`：每行是首帧、材质编号、擦入帧数、进入方向、光晕色 |
| 彩球的样子 | `assets/body-gl.js` 里 `material()` 中编号 50–61 的分支，一种材质一段 |
| 角落的说明和落版副句 | `index.html` 里的 `#unofficial`；`assets/xhs.js` 里 `drawSubline` 的文字 |
| 爆开的颜色 | `assets/xhs.js` 里的 `RAY_COL` 和 `DISCS` |
| 绳子和蝴蝶结的颜色 | `assets/xhs.js` 里 `drawRibbon` |

## 文件

| 文件 | 内容 |
| --- | --- |
| `index.html` | 根画面：时长、帧率、音轨 |
| `assets/xhs.js` | 整支动画：时间线、团子的形变与表情、液滴、收藏星、爆开、落版、挂绳、幕后画面 |
| `assets/body-gl.js` | 团子的球体着色器：轮廓、材质、换皮擦入、受力凹陷 |
| `assets/icon-gl.js` | 液滴融合成图标的距离场着色器 |
| `assets/data.js` | 逐帧测量的轮廓、转头与眼睛数据 |
| `assets/audio/bed.wav` | 配乐与音效 |

## 素材与许可

代码使用 MIT 协议（见上一级的 `LICENSE`）。

| 素材 | 来源与许可 |
| --- | --- |
| Inter Bold | [rsms/inter](https://rsms.me/inter/)，SIL Open Font License（`assets/fonts/Inter-OFL.txt`） |
| Noto Sans SC（子集） | [notofonts/noto-cjk](https://github.com/notofonts/noto-cjk)，SIL Open Font License（`assets/fonts/NotoSansSC-OFL.txt`） |
| 小红书字标路径 | [Simple Icons](https://simpleicons.org)，CC0；商标归其所有者 |
| 配乐与音效 | 用 ElevenLabs Music / Sound Effects 生成（付费方案，可商用） |

小红书、REDnote 及其标识归其所有者所有；本动画为非官方概念作品，与小红书无合作关系。
