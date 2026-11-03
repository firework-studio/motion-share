# motion-share

Firework 工作室分享的动效工程。每个文件夹是一个完整的 [HyperFrames](https://hyperframes.heygen.com) 工程（用 HTML 做视频），下载后即可运行、修改、导出视频。

## 工程

| 工程 | 内容 |
| --- | --- |
| [status-bar-to-phone](status-bar-to-phone) | 手机状态栏变形成「连接中」图标，再还原、镜头拉开揭示手机 |

## 怎么用

需要 Node.js 18 以上。进入某个工程的文件夹：

```bash
npx hyperframes preview                    # 浏览器里预览
npx hyperframes render --output out.mp4    # 导出视频
```

每个工程的 README 里写了常改的地方和用到的做法。

## 许可

代码使用 MIT 协议（`LICENSE`）。
