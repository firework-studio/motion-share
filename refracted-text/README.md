# 金属字

一个网页小工具：一行粗体字母依次升起，表面是磨砂金属，一道光带在字上缓缓流动；移动鼠标可以拨动光带。

- 四种配色：原色、冰蓝、玫瑰、香槟金。
- 输入框里直接改字（最多 10 个字符），中文会用系统的粗体字。
- 点击画面重播。

纯网页，用 WebGL 绘制，不需要安装任何东西。

成片预览：[preview.mp4](preview.mp4)

## 运行

浏览器打开本地文件时，字体和脚本会被拦截，所以需要起一个本地服务。在本文件夹中执行任一条：

```bash
python3 -m http.server 8000     # 然后打开 http://localhost:8000
npx serve .                     # 或者用 Node.js
```

## 文件

| 文件 | 内容 |
| --- | --- |
| `index.html` | 页面和下方的控制条：输入框、配色 |
| `main.js` | 全部绘制：字形、倒角、环境反射、光带与升起的节奏 |
| `fonts/` | Russo One 字体及其许可 |

## 常改的地方

| 想改什么 | 改哪里 |
| --- | --- |
| 默认文字 | `index.html` 里 `input.value`（`FIREWORK`） |
| 配色 | `index.html` 里的 `SETS`：`beam` 光带，`warm`、`cool` 环境反射的冷暖，`bg` 背景色 |
| 字体 | `main.js` 里的 `FONT`，并在 `index.html` 的 `@font-face` 换成你的字体文件 |

## 许可

代码使用 MIT 协议，见仓库根目录的 `LICENSE`。字体 Russo One 使用 SIL Open Font License 1.1，见 `fonts/OFL-RussoOne.txt`。
