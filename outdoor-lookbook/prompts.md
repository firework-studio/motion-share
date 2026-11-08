# 出图提示词

这个页面里的模特图、单品图和试穿图都用 ChatGPT 生成。下面是实际使用的提示词，换成你自己的造型描述就能出一套风格统一的图。

## 1. 模特全身图（每套一张，2:3，1024×1536）

六套共用同一段提示词，只替换 `<造型描述>`。背景、灯光、机位、人物占画面的比例和上下留白都写死，这样六张图抠完背景后，人物大小和脚底位置天然一致，轮播里才能站在同一条线上。

```
Full-body fashion lookbook photo of <造型描述>.
Pure white seamless studio background (#F5F5F3), soft even overhead light, a faint soft contact shadow under the feet.
The model stands relaxed and faces the camera, arms down or one hand in a pocket, neutral calm expression.
Eye-level camera, 50 mm lens, the whole body from head to shoes visible, the body fills about 80% of the frame height with equal space above the head and below the feet, centered.
Photorealistic, natural skin texture, sharp fabric detail, no logos, no text, no props.
Vertical 2:3, 1024×1536.
```

本页六套的 `<造型描述>`：

| # | 造型描述 |
| --- | --- |
| 01 | a young Asian woman in her twenties with long hair in a low ponytail, wearing a bright orange technical hardshell jacket zipped halfway with a light grey fleece collar showing underneath, slim black softshell trousers and brown leather mountaineering boots |
| 02 | a young Southeast Asian man in his twenties with short curly hair, wearing an olive green lightweight rain jacket, beige relaxed cargo trousers, black trail running shoes and a small black 15-litre backpack on both shoulders |
| 03 | a European woman around thirty with a short bob, wearing a long oat-coloured waterproof trench coat open over a cream knit sweater, mid-grey wide-leg trousers and clean white sneakers |
| 04 | an Asian man around thirty with a buzz cut, wearing a forest green fleece vest over a red and black plaid flannel shirt, khaki straight trousers and dark brown hiking boots |
| 05 | a young Black woman in her twenties with braids tied up, wearing an open sky blue lightweight windbreaker over a white T-shirt, black running shorts and white and blue trail running shoes |
| 06 | a young European man in his twenties wearing a light grey knit beanie, a black matte down puffer jacket, charcoal tapered joggers and black snow boots |

## 2. 单品图（每件一张，1:1，1024×1024）

在同一个对话里上传刚出好的模特图，再发：

```
Using the attached photo as the reference, create a product photo of only the <单品> worn by the model, with exactly the same colour, material, cut and details.
Shown alone as a ghost-mannequin product shot (for shoes: a single pair at a three-quarter angle), centered on a pure white background (#FFFFFF) with a soft shadow.
E-commerce catalogue style, sharp, no model, no logos, no text. Square 1:1, 1024×1024.
```

`<单品>` 依次填：

| # | 单品 1 | 单品 2 | 单品 3 | 单品 4 |
| --- | --- | --- | --- | --- |
| 01 | orange hardshell jacket | light grey fleece mid-layer | black softshell trousers | brown mountaineering boots |
| 02 | olive green rain jacket | beige cargo trousers | black trail running shoes | black 15-litre backpack |
| 03 | oat-coloured trench coat | cream knit sweater | mid-grey wide-leg trousers | white sneakers |
| 04 | forest green fleece vest | red and black plaid flannel shirt | khaki trousers | dark brown hiking boots |
| 05 | sky blue windbreaker | white T-shirt | black running shorts | white and blue trail running shoes |
| 06 | black down puffer jacket | light grey knit beanie | charcoal joggers | black snow boots |

外套类单品（冲锋衣、雨衣、风衣、马甲、羽绒服）在第一句末尾加 `, without any layers underneath`，避免里层的衣服出现在外套图里。

## 3. 试穿图（模特换上另一套的外套）

新开对话，按顺序上传两张图：第一张是模特图，第二张是要换上的外套单品图，再发：

```
Edit the first photo. Replace only her orange hardshell jacket with the oat-coloured long trench coat from the second photo, worn open over the same light grey fleece. Keep everything else exactly the same: the same person, face, hair, expression, pose, hands, the black trousers, the brown boots, the lighting, the white background, the framing and the size of the figure.
Photorealistic, no logos, no text. Vertical 2:3, 1024×1536.
```

把其中的外套名称和里层衣物换成对应的内容。检查脸、发型、姿势、裤子和鞋与原图一致，人物大小和位置不变；不一致就重出。

## 4. 抠图与检查

- 模特图和试穿图抠成透明底，放进 `assets/looks/`；在 `data.js` 里改对应的路径，页面代码不用改。
- 六张模特图的人物大小、脚的位置、背景亮度应一致；不一致的重出。
- 单品图与模特身上的颜色、款式一致。
- 画面中不要出现任何真实品牌标志。
