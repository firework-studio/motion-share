# 状态栏变形动画

一个约 8.7 秒的横屏动画（1920×1080）：黑圆鼓起、绕一圈缩成小点，炸开成手机状态栏（信号、Wi‑Fi、电池）；电池压成竖线、甩一圈弯成圆环，信号格变成小点追进缺口，拼成「连接中」图标；随后图标还原成状态栏，镜头轻推后拉开，原来状态栏一直在手机右上角；最后屏幕中央亮起 Firework 工作室的 logo。

用 [HyperFrames](https://hyperframes.heygen.com)（HTML 做视频）制作，图形全部是代码绘制的 SVG。

成片预览：[preview.mp4](preview.mp4)

## 运行

需要 Node.js 18 以上。在本文件夹中执行：

```bash
npx hyperframes preview                    # 浏览器里预览，可拖动时间轴逐帧看
npx hyperframes render --output out.mp4    # 导出视频
```

想要更细腻的边缘，可以按 4K 绘制再缩回 1080p：

```bash
npx hyperframes render --fps 60 --resolution landscape-4k --output out-4k.mp4
ffmpeg -i out-4k.mp4 -vf scale=1920:1080:flags=lanczos -c:a copy out.mp4
```

## 文件

| 文件 | 内容 |
| --- | --- |
| `index.html` | 根画面：时长、画面尺寸、音效的位置 |
| `compositions/replica.html` | 动画本身：所有图形的绘制与镜头 |
| `assets/data/replica.js` | 前 4.3 秒每个图形的逐帧轨迹（30 fps 采样，播放时平滑插值到 60 fps） |
| `assets/sfx/` | 三个音效：开场敲击、图标弹出、小球落位 |
| `assets/brand/` | Firework 工作室 logo |

## 常改的地方

都在 `compositions/replica.html` 里：

| 想改什么 | 改哪里 |
| --- | --- |
| 背景色 | `#root` 的 `background`（`#ddd7e4`） |
| 图形颜色 | `#cam`、`#phoneG` 的 `fill` 和 `stroke`（`#0b0b0b`） |
| 手机质感 | `window.PHONE_STYLE`：`ink` 线稿、`device` 真机、`porcelain` 白瓷 |
| 镜头节奏 | `LEAN`（轻推）、`REVEAL`（拉开）、`SETTLE`（缓推）三段的起止秒数 |
| 手机落定后的大小与位置 | `C_END`（缩放）、`TOP_END`（手机上沿离画面顶部的距离） |
| 屏幕上的时间 | `phone.clock.textContent`（`9:41`） |
| 结尾的 logo 和名字 | 换掉 `assets/brand/firework-mark.svg`，改 `sign.name.textContent`；位置和大小在 `SIGN` |
| 音效 | 替换 `assets/sfx/` 里的文件，或在 `index.html` 里改各个 `<audio>` 的 `data-start` 和 `data-volume` |

## 几个做法

- **逐帧轨迹**：前半段每一帧每个图形的位置、大小，弧线的圆心、半径和角度都存成数据，代码按数据重画，播放时在帧与帧之间平滑插值。
- **一个镜头的揭示**：状态栏一直放在手机右上角，只是镜头一开始贴得很近；状态栏还原后镜头先轻推、再拉开，手机从画面外进来，整个过程没有任何物体在「飞」。
- **不随镜头缩放的边框**：手机边框的粗细每帧按镜头倍数换算，镜头再近，边框也保持和圆环一样粗，进画面时只是一道线。
- **灵动岛**：不随镜头带进来，而是在镜头落定前从一个小点长出、再舒展成胶囊形。

## 许可

代码使用 MIT 协议，见仓库根目录的 `LICENSE`；音效由 ElevenLabs Sound Effects 生成。

制作：Firework 工作室

<sub>前半段动作参考 @bentomotion.studio</sub>
