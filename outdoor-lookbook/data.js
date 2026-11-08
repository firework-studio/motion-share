// Every look and product on the page, in Chinese and English. Swap the pictures and names for your own; nothing else
// needs to change. Text written as { zh, en } follows the language switch; plain text is the same in both.
//   model: a cut-out full-body photo (transparent background, 2:3), feet near the bottom
//   pins:  where each item sits on the model, in % of the photo (x from the left, y from the top), same order as items
//   tryOn: other looks' first piece (the outer layer) this model can try on; model is the photo of her or him wearing it
//   base:  optional photo of the model without the outer layer; with it, the old layer leaves quickly while the new one arrives
//   cut:   the outer layer with its background removed, shown on the rack and while dragging
window.LOOKBOOK = {
  brand: "Firework Studio",
  currency: "¥",
  bundleOff: 0.1,
  lang: "zh",            // the language a first visit opens in; ?lang=en or the switch in the header changes it
  text: {
    zh: {
      nav: ["新品", "女装", "男装", "穿搭"], title: "试试这一身。", sub: "六套造型，从头搭到脚。点一套，再点标记点看单品。",
      look: "造型", hint: "点标记点，查看单品", inLook: "这一身", choose: "选择尺码",
      bundleTitle: "整套购买", bundleNote: (n, off) => `${n} 件一起买，立减 ${off}%`,
      addAll: "整套加入购物车", added: "已加入购物车", toast: (what) => `已加入购物车：${what}`,
      pieces: (n) => `${n} 件`, view: "查看", drag: "拖动", switch: "EN",
      rack: "换件外套", rackHint: "拖到身上试穿", wearing: "穿着中",
    },
    en: {
      nav: ["New", "Women", "Men", "Lookbook"], title: "Try the Look.", sub: "Six looks, styled head to toe. Tap a look, then a pin, to see the piece.",
      look: "LOOK", hint: "Tap a pin to shop the piece.", inLook: "In this look", choose: "Choose a size",
      bundleTitle: "Complete the look", bundleNote: (n, off) => `Bundle all ${n} and save ${off}%`,
      addAll: "Add full look to bag", added: "Added to bag", toast: (what) => `Added to bag: ${what}`,
      pieces: (n) => `${n} pieces`, view: "VIEW", drag: "DRAG", switch: "中",
      rack: "Swap the layer", rackHint: "Drag onto the look", wearing: "Wearing",
    },
  },
  looks: [
    {
      title: { zh: "雪山", en: "Summit" }, model: "assets/looks/look01.webp", base: "assets/looks/look01-base.webp",
      tryOn: [{ from: 2, model: "assets/looks/look01-try03.webp" }],
      pins: [[64, 33], [50, 20.5], [44, 60], [41, 90]],
      items: [
        { cat: { zh: "硬壳", en: "Shell" }, name: { zh: "Summit 硬壳冲锋衣", en: "Summit Hardshell Jacket" }, price: 2199, img: "assets/looks/look01-1.webp", cut: "assets/looks/look01-1-cut.webp", sizes: "XS S M L XL" },
        { cat: { zh: "抓绒", en: "Fleece" }, name: { zh: "Ridge 抓绒中层", en: "Ridge Fleece Mid-layer" }, price: 799, img: "assets/looks/look01-2.webp", sizes: "XS S M L XL" },
        { cat: { zh: "长裤", en: "Pants" }, name: { zh: "Scree 软壳长裤", en: "Scree Softshell Pant" }, price: 899, img: "assets/looks/look01-3.webp", sizes: "XS S M L XL" },
        { cat: { zh: "鞋履", en: "Footwear" }, name: { zh: "Alpine 登山靴", en: "Alpine Mountain Boot" }, price: 1599, img: "assets/looks/look01-4.webp", sizes: "36 37 38 39 40" },
      ],
    },
    {
      title: { zh: "雨林", en: "Rain" }, model: "assets/looks/look02.webp",
      tryOn: [],
      pins: [[58, 34], [42, 62], [42, 91], [64, 19]],
      items: [
        { cat: { zh: "雨衣", en: "Rain shell" }, name: { zh: "Canopy 轻量雨衣", en: "Canopy Rain Jacket" }, price: 1299, img: "assets/looks/look02-1.webp", cut: "assets/looks/look02-1-cut.webp", sizes: "S M L XL XXL" },
        { cat: { zh: "长裤", en: "Pants" }, name: { zh: "Moss 工装裤", en: "Moss Cargo Pant" }, price: 699, img: "assets/looks/look02-2.webp", sizes: "S M L XL XXL" },
        { cat: { zh: "鞋履", en: "Footwear" }, name: { zh: "Drift 越野跑鞋", en: "Drift Trail Runner" }, price: 999, img: "assets/looks/look02-3.webp", sizes: "40 41 42 43 44" },
        { cat: { zh: "背包", en: "Pack" }, name: { zh: "Leaf 15L 背包", en: "Leaf 15L Daypack" }, price: 599, img: "assets/looks/look02-4.webp", sizes: "15L" },
      ],
    },
    {
      title: { zh: "城市", en: "City" }, model: "assets/looks/look03.webp",
      tryOn: [],
      pins: [[38, 44], [50, 27], [55, 70], [60, 93]],
      items: [
        { cat: { zh: "外套", en: "Coat" }, name: { zh: "Commute 防水风衣", en: "Commute Waterproof Trench" }, price: 2499, img: "assets/looks/look03-1.webp", cut: "assets/looks/look03-1-cut.webp", sizes: "XS S M L XL" },
        { cat: { zh: "针织", en: "Knit" }, name: { zh: "Loom 针织衫", en: "Loom Knit Sweater" }, price: 599, img: "assets/looks/look03-2.webp", sizes: "XS S M L XL" },
        { cat: { zh: "长裤", en: "Trousers" }, name: { zh: "Stride 阔腿裤", en: "Stride Wide-leg Trouser" }, price: 699, img: "assets/looks/look03-3.webp", sizes: "XS S M L XL" },
        { cat: { zh: "鞋履", en: "Footwear" }, name: { zh: "Street 板鞋", en: "Street Court Sneaker" }, price: 899, img: "assets/looks/look03-4.webp", sizes: "36 37 38 39 40" },
      ],
    },
    {
      title: { zh: "露营", en: "Camp" }, model: "assets/looks/look04.webp",
      tryOn: [],
      pins: [[54, 31], [34, 40], [46, 65], [43, 91]],
      items: [
        { cat: { zh: "马甲", en: "Vest" }, name: { zh: "Grove 抓绒马甲", en: "Grove Fleece Vest" }, price: 699, img: "assets/looks/look04-1.webp", cut: "assets/looks/look04-1-cut.webp", sizes: "S M L XL XXL" },
        { cat: { zh: "衬衫", en: "Shirt" }, name: { zh: "Ember 法兰绒衬衫", en: "Ember Flannel Shirt" }, price: 499, img: "assets/looks/look04-2.webp", sizes: "S M L XL XXL" },
        { cat: { zh: "长裤", en: "Pants" }, name: { zh: "Trail 卡其裤", en: "Trail Khaki Pant" }, price: 599, img: "assets/looks/look04-3.webp", sizes: "S M L XL XXL" },
        { cat: { zh: "鞋履", en: "Footwear" }, name: { zh: "Base 徒步靴", en: "Base Hiking Boot" }, price: 1299, img: "assets/looks/look04-4.webp", sizes: "40 41 42 43 44" },
      ],
    },
    {
      title: { zh: "徒步", en: "Trail" }, model: "assets/looks/look05.webp",
      tryOn: [],
      pins: [[64, 30], [50, 33], [47, 56], [43, 93]],
      items: [
        { cat: { zh: "风衣", en: "Wind shell" }, name: { zh: "Breeze 轻量风衣", en: "Breeze Windbreaker" }, price: 899, img: "assets/looks/look05-1.webp", cut: "assets/looks/look05-1-cut.webp", sizes: "XS S M L XL" },
        { cat: { zh: "T 恤", en: "Tee" }, name: { zh: "Pace 短袖 T 恤", en: "Pace Tee" }, price: 399, img: "assets/looks/look05-2.webp", sizes: "XS S M L XL" },
        { cat: { zh: "短裤", en: "Shorts" }, name: { zh: "Glide 跑步短裤", en: "Glide Run Short" }, price: 399, img: "assets/looks/look05-3.webp", sizes: "XS S M L XL" },
        { cat: { zh: "鞋履", en: "Footwear" }, name: { zh: "Flow 越野跑鞋", en: "Flow Trail Shoe" }, price: 1099, img: "assets/looks/look05-4.webp", sizes: "36 37 38 39 40" },
      ],
    },
    {
      title: { zh: "冬季", en: "Down" }, model: "assets/looks/look06.webp",
      tryOn: [],
      pins: [[56, 30], [50, 9], [46, 64], [43, 91]],
      items: [
        { cat: { zh: "羽绒", en: "Insulation" }, name: { zh: "Thaw 羽绒服", en: "Thaw Down Jacket" }, price: 1899, img: "assets/looks/look06-1.webp", cut: "assets/looks/look06-1-cut.webp", sizes: "S M L XL XXL" },
        { cat: { zh: "帽子", en: "Beanie" }, name: { zh: "罗纹毛线帽", en: "Knit Rib Beanie" }, price: 199, img: "assets/looks/look06-2.webp", sizes: { zh: "均码", en: "One size" } },
        { cat: { zh: "长裤", en: "Pants" }, name: { zh: "Frost 收口裤", en: "Frost Tapered Jogger" }, price: 599, img: "assets/looks/look06-3.webp", sizes: "S M L XL XXL" },
        { cat: { zh: "鞋履", en: "Footwear" }, name: { zh: "Powder 雪地靴", en: "Powder Snow Boot" }, price: 1199, img: "assets/looks/look06-4.webp", sizes: "40 41 42 43 44" },
      ],
    },
  ],
};
