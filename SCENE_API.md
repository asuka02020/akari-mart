# DIO 场景开发 API（AKARI MART / 雨夜 DIORAMA）

本文件是场景代码（`js/scene-night.js`、`js/scene-sakura.js`）与引擎（`js/core.js` + `js/renderer.js`）之间的契约。
**只允许修改自己的场景文件**，不要改 `core.js` / `renderer.js` / `index.html` / `css` —— 需要引擎能力时联系 Lead。

坐标系：**右手系、Y 向上、单位约等于米**。场景是"箱庭"（diorama）：底座顶面在 `y = 0`，
所有建筑/道路都在 y>0，底座侧壁从 y=0 往下约 2.2~2.6（切面土层）。场景大致以原点为中心，
建议底座顶面尺寸 26×18 ~ 30×20。相机默认目标点约 `[0, 3, 0]`。

---

## 1. 注册场景

```js
(function (global) {
  'use strict';
  const DIO = global.DIO;
  const G = DIO.G;

  // 每个场景自己的一张 2048×1024 图集（只画需要的区域，写好尺寸）
  const atlas = DIO.atlas(2048, 1024);
  atlas.define('sign_main', 900, 240, function (ctx, w, h) { /* 画布绘制 */ });

  DIO.registerScene({
    id: 'night',                       // 唯一 id（night / sakura）
    title: '雨夜便利店',                 // UI 用
    subtitle: 'RAINY NIGHT · AKARI MART',
    atlas: atlas,
    env: { /* 见 §4，环境/光照/地面；可在 build 返回值里覆盖 */ },
    views: [                           // 镜头预设，UI 会生成按钮；第一项是默认
      { label: '全景', az: 0.95, el: 0.44, radius: 40, target: [0, 3.2, 0] },
      { label: '店前', az: 0.30, el: 0.30, radius: 26, target: [0, 2.4, 2.0] },
      { label: '街道', az: 1.45, el: 0.36, radius: 33, target: [0, 2.0, 0] }
    ],
    params: [                          // 可选，UI 会自动生成控件
      { id: 'rain', label: '雨量', type: 'seg', options: [{ label: '小雨', value: 0.4 }, { label: '中雨', value: 1 }, { label: '大雨', value: 1.6 }], value: 1 }
    ],
    build: function (api) {
      // api.G / api.Batch / api.node / api.mat / api.atlas / api.DIO
      const root = DIO.node('root');
      const batch = new DIO.Batch();
      // ... 建模 ...
      batch.finish(root);
      return {
        root: root,
        update: function (t, dt) { /* 每帧：动画（雨、花瓣、列车、灯光呼吸） */ },
        onParam: function (id, value) { /* 控件变化 */ }
      };
    }
  });
})(window);
```

`build()` 返回值：
- `root`（必须）：`DIO.node()`，包含所有可见几何。
- `update(t, dt)`：`t` 是秒（可被"电影模式"seek 到任意时刻，**动画必须只用 t 的解析函数**，不要累加随机/帧率依赖）。
- `onParam(id, value)`：可选。
- `env`：可选，覆盖注册时的 env（见 §4）。

---

## 2. 建模 API

```js
const b = new DIO.Batch();          // 按材质合并，一个材质 = 一次 draw call
b.box(mat, [w,h,d], [x,y,z], [rx,ry,rz]?)          // 中心点定位
b.taper(mat, bw,bd, tw,td, h, pos, rot?)            // 上下不同截面的柱体
b.cyl(mat, r0, r1, h, seg, pos, rot?)
b.tube(mat, r, len, seg, 'x'|'y'|'z', pos, rot?)    // 横躺的圆柱（管道、车轮、滚筒）
b.sphere(mat, r, su, sv, pos, rot?, smooth?)
b.blob(mat, r, su, sv, jitter, seed, pos, rot?, flatTop?) // 抖动球体：树冠/花丛/云
b.disc(mat, r, seg, pos, rot?, axis?)               // 圆片（灯面、招牌圆盘）
b.plane(mat, w, h, pos, rot?, uvRect?, normal?)     // 竖直面片，法线默认 +z，uv 可映射图集
b.quad(m, p0,p1,p2,p3, uvRect?)                     // 任意四边形（给 4 个世界坐标点）
b.quadN(m, p0,p1,p2,p3, normal, uvRect?)
b.ringY(mat, ri, ro, seg, pos)                      // 水平圆环
b.raw(mat, geometry, pos, rot?, scale?, uvRect?)    // 复用自定义几何
b.lines(mat, segments, pos?, rot?)                  // 线段（电线、护栏线）；segments=[[a,b],...]
b.finish(root);                                     // 把所有批次挂到 root
```

所有 `pos` 都是**包围盒中心**（`box`/`cyl`/`sphere`/`taper` 等），`plane` 是面片中心。
`rot` 是欧拉角（弧度，Rz·Ry·Rx）。`uvRect` 用 `atlas.uv('区域名')` 获取，
`atlas.uvSub('区域名', x, y, w, h)` 可以取区域内的子矩形（0..1）。

节点层级用于**会动的部件**（列车、旋转招牌、秋千、风铃）：

```js
const trainNode = DIO.node('train');
trainNode.position = [x, y, z];
root.add(trainNode);
const tb = new DIO.Batch();
tb.box(M.trainBody, [9, 2.6, 2.4], [0, 1.3, 0]);
tb.finish(trainNode);
// update 里： trainNode.position[0] = ...; 之后引擎会调用 root.update(null)
```

> `update()` 之后引擎会自动 `root.update(null)`，因此节点矩阵会刷新。

---

## 3. 材质与图集

```js
G.mat(color, {
  emissive: '#...', emissiveStrength: 1,   // 自发光（招牌、灯泡、窗户）
  spec: 0.2,                               // 高光强度
  alpha: 1,                                // 不透明度
  additive: true,                          // 加色混合（光晕、雨、灯带），不写深度
  unlit: true,                             // 不受光照（招牌贴图、屏幕、光晕）
  radial: true,                            // 面片边缘 alpha 渐隐（配合 additive 做光晕）
  billboard: true,                         // 面片始终朝向相机（光斑/萤火/光晕卡片），忽略节点旋转
  tex: true,                               // 采样本场景图集
  texAlpha: true                           // 用贴图 alpha 做透明（花瓣/镂空）
});
DIO.glow.material(color, alpha, radial?)   // 缓存的加色光晕材质，配 b.plane(...) 使用
DIO.shadow.material(alpha)                 // 缓存的柔和接触阴影材质（不发光、径向渐隐）
```

灯箱光晕建议同时放三层：贴图灯箱本体（unlit+tex）、灯箱后/前的 billboard 加色光斑、
地面上的斜置加色光池（rotation 约 [-1.35, 0, 0]，radial，alpha 0.2~0.4）。
接触阴影：在物体底部放 `b.plane(DIO.shadow.material(0.45), w, d, [x,0.015,z], [-Math.PI/2,0,0])`。

- **招牌/文字**：`G.mat('#ffffff', { unlit: true, tex: true })` + `b.plane(..., uvRect)`。
- **玻璃窗**：`G.mat('#a9c8d8', { alpha: 0.22, spec: 0.7 })`，需要能看到室内时把室内几何放在窗后。
- **光晕**：`b.plane(DIO.glow.material('#ffd9a0', 0.5), w, h, pos, rot)`，加色、自动径向衰减。
- 自发光强度参考：招牌 0.8~1.6、窗户 0.3~0.8、灯泡 1.5、路灯 1.2。过高会整片过曝。
- 图集尺寸 2048×1024，区域按定义顺序自动排版（4px padding），总量别超过 3/4 面积；
  文字用 `DIO.text(ctx, str, {x,y,size,color,weight,font,align,letterSpacing})`，
  字体 `DIO.fonts.jp`（日文）或 `DIO.fonts.en`（拉丁）。
- 贴图坐标已处理翻转，不用自己翻。

**建模硬性约束**
- 总三角形 < 60k；材质数（≈ draw call）建议 < 180。
- 不要做共面重叠（z-fighting）：贴片离底面板至少 0.06（引擎使用 24-bit 深度，远景仍建议 ≤ 0.06 的余量；
  16-bit 回退时 0.02 不够）。
- 所有几何必须在 y≥0 以上（底座除外）；底座切面 < 0。
- 别用超大平面做"天空/远景背景"（天空由引擎着色器绘制）；远景用实体小方块/剪影。
- `billboard: true` 的面片可以合批：引擎会把面片中心编码进法线，顶点着色器按相机方向展开，
  因此一个 batch 里的多张光晕卡不会塌缩到节点原点。billboard 会忽略面片旋转，只保留尺寸与位置。
- 渲染管线在 mesh 端和 composite 端各有一次 tonemap，颜色会整体抬灰。如果需要精确控制颜色，
  可以在场景里自行做 inverse 预补偿（参考 `scene-sakura.js` 的 `grade()` / `gradeSky()`）。

---

## 4. 环境 `env`（可写在注册对象里，也可由 build 返回）

```js
env: {
  sky: {
    top: '#0a1122', mid: '#16233c', bot: '#2a3a56',   // 垂直渐变
    glowAPos: [0.5, 0.42], glowACol: '#16233c', glowASize: 0.52,  // 径向光晕 A（城市辉光/太阳）
    glowBPos: [0.78, 0.18], glowBCol: '#1d1410', glowBSize: 0.34, // 光晕 B（暖色）
    haze: 0.45, hazeColor: '#2b3a58',                 // 地平线雾带
    stars: 0.0, clouds: 0.0, cloudColor: '#0d1220',   // 星星 0~1，云 0~1
    exposure: 1.0
  },
  key:     { dir: [0.42, 0.82, 0.38], color: '#4f6a9c' },  // 主光方向(指向光源)/颜色
  fill:    { dir: [-0.6, 0.25, 0.75], color: '#8a5a3a' },  // 补光
  ambient: '#1b2438',
  rim:     { color: '#7d9ad0', strength: 0.45 },
  fog:     { near: 45, far: 130, color: '#0b1220' },
  ground:  {                                    // 引擎自动生成"湿地面"（反射）
    size: [42, 30], center: [0, 0], color: '#1a1d26',
    puddle: '#0a0e16', tint: '#c9d4e8', wet: 0.85, reflect: 0.8
  },
  reflection: 0.9,     // 平面反射总强度 0~1（0 关闭）
  bloom: 0.85,         // 辉光强度
  bloomThreshold: 0.66,
  vignette: 0.9,
  grain: 0.028,
  exposure: 1.0
}
```

- `ground` 会自动画一整块水平地面（含雨水坑/涟漪/反射）。**地面以上不要重复铺大地面板**；
  道路/人行道/斑马线用小贴片叠在 y=0.01~0.03（材质用 unlit 或普通材质）。
  水坑反射的清晰区域由噪声+wet 决定，湿润感主要来自反射。
- 底座侧壁（y<0）用普通材质，引擎在反射 pass 中会自动跳过 maxY≤0 的网格。

---

## 5. 粒子（引擎提供，解析式、可 seek）

```js
const rain = new DIO.Rain({
  count: 1600, area: [40, 30], height: 16,
  len: [0.6, 1.6], speed: [17, 27], wind: [1.5, 0.4],
  color: '#b9d2f2', alpha: 0.26, seed: 11
});
root.add(rain.node);
rain.update(t);          // 每帧调用（可改 rain.material.alpha 做雨量）

const petals = new DIO.Flakes({
  count: 300, area: [24, 18], height: 10,
  size: [0.1, 0.2], speed: [0.8, 1.6], sway: [0.4, 1.2],
  spin: [-2, 2], uv: atlas.uv('petal'), color: '#ffffff', alpha: 0.95, seed: 23
});
root.add(petals.node);
petals.update(t);
```

---

## 6. 预览 / 截图 / 调参

```powershell
# 全页截图（file:// 直接跑，无需服务器）
node tools/shot.js --url "akari-mart/index.html#scene=night&ui=0" --out ref/night-a.png --w 1600 --h 900 --wait 4000
```

URL hash 参数：`scene=night|sakura`、`ui=0` 隐藏 UI、`view=0..N` 镜头预设、
`az=` `el=` `r=` `tx=` `ty=` `tz=` 直接指定相机（弧度/距离）、`t=` 指定动画时间（配合 film=1）、
`rain=` 雨量参数、`tour=1` 电影巡游、`film=1` 定格模式。

- 改完场景文件刷新即可（静态页面无缓存问题）。
- 控制台错误会打印在 shot.js 输出里；有异常必须修掉。
- 截图频率建议：先低分辨率 1200×700 快速迭代，最后 1600×900 / 2560×1440 出图。
- 引擎性能：headless SwiftShader 渲染一帧 1~3 秒属正常，不是页面性能问题。

---

## 7. 美术要求（两个场景统一风格）

**总体风格**：卡通低多边形箱庭、干净大色块、明确的明暗层次、亚像素级细节不要、
招牌文字要能看清、画面要有"温度"（灯光/暖色点缀）和明确的视觉中心。

### night — 雨夜便利店 · AKARI MART
- 底座 28×20，2.4 厚，切面可以看到沥青层/砂石层/土层三色分层（略带斜面更好）。
- 便利店占据左后方（大致 x ∈ [-9, 2], z ∈ [-6, 0]），玻璃立面朝 +z；
  室内要能看到：货架（分层摆彩色商品）、收银台、暖色天花灯带、地砖反光。
- 门头：白色发光灯箱（图集文字 "アカリマート / AKARI MART / 24時間営業" + 星标），
  灯箱上沿绿色色带，下方一条橙色装饰线；雨棚；门口暖光外溢在地面上（加色光晕）。
- 门口右侧：2 台自动贩卖机（红白/蓝白，贴图做饮料格）、冰柜、伞桶、垃圾桶、自行车 2 辆、黄色盲道砖带。
- 街道：右侧柏油路 + 黄色中线 + 斑马线，路缘石、护栏、路障锥、蓝色路牌（港町 二丁目）、
  行人信号灯、2~3 根电线杆（横担、绝缘子、变压器桶、下垂电线横跨天空）、路灯。
- 边缘：左侧/后方暗色公寓楼剪影（零星亮窗）、右侧小拉面店（红灯笼/红招牌）、
  右下角一棵大樱花树（深色树干、粉色花团，被灯光照到），落樱少量。
- 天空：深蓝紫到青蓝，地平线有城市暖光；轻云；不要大面积星空。
- 雨：两层（近处亮/远处淡），地面反射招牌和灯光，花瓣在雨中飘。
- 情绪：安静、温暖、潮湿、电影感。

### sakura — 樱花车站 · 桜坂駅
- 底座 28×18，草坡切面（草皮 + 泥土 + 岩层）。
- 单线铁道横穿画面（略斜），左侧山体隧道口（拱门 + 山体），中间站台 + 站房 + 雨棚 + 站名牌，
  右侧平交道口（黑白警示杆、红灯、栏杆）、小卖店/自动贩卖机、民居 2~3 栋（瓦屋顶）。
- 一列 2 节通勤列车停靠/缓慢进出站（动画），车头灯亮。
- 樱花树 5~7 棵（粉色团状树冠，深色枝干），花瓣飘落；草地、田垄、栅栏、电线杆、白云。
- 天空：淡奶油色到底部，上部粉紫；柔和太阳光晕；云；无星星。
- 光照：明亮柔和，暖白色主光 + 粉色补光，轻辉光，轻雾。
- 情绪：春日、治愈、明亮、动画电影感。
