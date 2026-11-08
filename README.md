# motion-share

Firework 工作室分享的动效工程。每个文件夹都能单独运行：视频工程是 [HyperFrames](https://hyperframes.heygen.com) 工程（用 HTML 做视频），网页工具直接在浏览器里打开。

## 工程

| 工程 | 内容 |
| --- | --- |
| [status-bar-to-phone](status-bar-to-phone) | 手机状态栏变形成「连接中」图标，再还原、镜头拉开揭示手机 |
| [qr-tree](qr-tree) | 网页工具：二维码上长出一棵四季小树，点一下变成能扫的二维码 |
| [glass-logo](glass-logo) | 网页工具：水珠胀开成带彩色折射的玻璃图标，可换成自己的 logo |
| [refracted-text](refracted-text) | 网页工具：金属质感的字母依次升起，光带在表面流动，可改字 |
| [swarm-build](swarm-build) | 网页动效：一群光标把网页一层层搭出来，给元素加 `data-b` 就能用在自己的页面上 |
| [outdoor-lookbook](outdoor-lookbook) | 网页模板：服装品牌 Lookbook 购物页，3D 轮播、标记点、拖到身上试穿、中英文切换，改 `data.js` 即可换成自己的品牌 |

## 怎么用

视频工程需要 Node.js 18 以上。进入工程的文件夹：

```bash
npx hyperframes preview                    # 浏览器里预览
npx hyperframes render --output out.mp4    # 导出视频
```

网页工具的运行方法见各自的 README。每个工程的 README 里写了常改的地方和用到的做法。

## 许可

代码使用 MIT 协议（`LICENSE`）。
