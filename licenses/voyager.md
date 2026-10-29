# 页脚旅行者 1 号离线估算

## 来源与许可

- 上游：[Fomalhaut 的 Voyager 1 数据模型](https://github.com/fomalhaut1998/hexo-theme-fomalhaut/blob/67c53510a426bdc932564998f8b331fde8b1aef5/source/js/data/voyager1.js)。
- 固定提交：`67c53510a426bdc932564998f8b331fde8b1aef5`；上游文件 blob：`6281e77e73e9873115cccf4ec7c2964df28b4094`。
- 上游文件原始大小 7,575 字节，219 个数值系数：探测器三轴各 47 个，地球三轴各 26 个。
- Copyright 2023–2026 Fomalhaut。使用 Apache-2.0；完整许可保留于 [voyager-Apache-2.0.txt](voyager-Apache-2.0.txt)。
- 部署随附完整许可副本：[public/licenses/voyager-Apache-2.0.txt](../public/licenses/voyager-Apache-2.0.txt)，生产可从 [/licenses/voyager-Apache-2.0.txt](https://muruiwen.cn/licenses/voyager-Apache-2.0.txt) 访问；与本目录许可逐字相同。
- 天文数据参考：[NASA/JPL Horizons](https://ssd.jpl.nasa.gov/horizons/)、[官方 API 说明](https://ssd-api.jpl.nasa.gov/doc/horizons.html)。上游描述其为 DE440 / Jacobson 2022 旅行者轨道数据的离线拟合。本次没有重新拟合轨道或引入 NASA 图片、标识。

## 本地改动（2026-10-23）

数值系数与计算基底保持上游值，重写为无副作用 TypeScript 模块：
- `getVoyagerEstimate(ms)` 接收 UTC Unix 毫秒，返回地心几何距离（km）、AU、距离除以光速的单程光时（s）。
- 不保留上游全局变量、DOM、格式化 HTML、计时器或网络依赖。
- 拒绝非有限时间；只在 TDB 儒略日 2461041.5～2488069.5（约 2026-01-01～2100-01-01）内计算，端点包含。
- 修正上游窗外钳位仍进行外推的行为：窗外直接返回 `null`，由界面隐藏该行。
- 沿用上游固定加 69.184 秒的时间尺度近似；它不是完整 TDB 转换，也不预测未来闰秒。
- 使用 AU=149,597,870.7 km，光速=299,792.458 km/s。
- 页脚须标“估算”；不能描述为实时遥测，不展示未经核对的未来精度承诺。

## 独立核验

核验日期：2026-10-23（北京时间）。只读请求 NASA/JPL Horizons 官方 API；网站运行时不发出这个请求。响应声明目标为 `Voyager 1 (spacecraft) (-31)`、中心为 `Earth (399), BODY CENTER`、来源 `Voyager_1_ST+refit2022_m`、输出 `GEOMETRIC cartesian states`。响应生成标识为 `API_USER Thu Oct 22 10:11:44 2026 Pasadena, USA`。

参数：`COMMAND=-31`，`CENTER=500@399`，`TIME_TYPE=UT`，`TLIST_TYPE=CAL`，`EPHEM_TYPE=VECTORS`，`VEC_CORR=NONE`，`VEC_TABLE=6`，`OUT_UNITS=KM-S`，`CSV_FORMAT=YES`。

[复现两日期只读查询](https://ssd.jpl.nasa.gov/api/horizons.api?format=text&COMMAND=%27-31%27&OBJ_DATA=%27NO%27&MAKE_EPHEM=%27YES%27&EPHEM_TYPE=%27VECTORS%27&CENTER=%27500%40399%27&TLIST=%272026-01-01%2000%3A00%3A00%27%2C%272026-10-23%2000%3A00%3A00%27&TLIST_TYPE=%27CAL%27&TIME_TYPE=%27UT%27&VEC_TABLE=%276%27&VEC_CORR=%27NONE%27&CSV_FORMAT=%27YES%27&OUT_UNITS=%27KM-S%27)

| UTC 时刻 | JPL 地心距离 km | 本地估算 km | 绝对差 km | JPL 单程光时 s | 本地单程光时 s |
|---|---:|---:|---:|---:|---:|
| 2026-01-01 00:00:00 | 25,430,712,714.17156 | 25,430,708,468.040184 | 4,246.131376 | 84,827.72676746777 | 84,827.71260389808 |
| 2026-10-23 00:00:00 | 25,832,969,193.49596 | 25,832,962,579.183224 | 6,614.312736 | 86,169.50995310217 | 86,169.48789012973 |

原始响应中的两条数据行：

```text
2461041.500000000, A.D. 2026-Jan-01 00:00:00.0000, 8.482772676746777E+04, 2.543071271417156E+10, 7.029713633046613E+00
2461336.500000000, A.D. 2026-Oct-23 00:00:00.0000, 8.616950995310217E+04, 2.583296919349596E+10, 3.459841508029718E+01
```

两个采样的距离相对差约 0.000017% 与 0.000026%，单程光时差小于 0.023 秒。此检查只确认两个日期的量级及移植一致性，不能证明整个 2026～2100 窗口的最大误差；未来轨道预测与固定时差近似也有不确定性。公式中的距离 / 光速与官方单程光时仅用于页脚展示，不作导航或科研用途。

测试保存官方两个采样，离线检查误差在 12,000 km / 0.05 s 内，另检查单位换算、原模型数值点、无效时钟、TDB 两端点及窗外拒绝。测试不访问网络或数据库。

