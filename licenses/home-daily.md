# 首页动画与每日内容

本次页面交互由本站以 React 实现。打字节奏与头像过渡参考 Yuimi-chaya 的 Fuyukawa Kagari 主题：
https://github.com/Yuimi-chaya/Yuimi-chaya.github.io
没有引入其图片、音乐、角色或 Astro 运行时，也没有引入其滚轮拦截逻辑。

## 每日心情签

30 条心情文案由本站原创，按 Asia/Shanghai 日期生成当天稳定结果。
内容为每日随机心情签，不代表站主或访客实际心情。

## 历史日期资料

日期索引参考 LyLme/LyToday 的 common/data/history_today/01.json 至 12.json：
https://github.com/LyLme/LyToday
该项目以 Apache-2.0 发布，其说明将历史资料来源标为百度百科（2024-01-17 数据快照）。
本站仅提取事件的年份、日期和最小事实，不复制百科长篇介绍、HTML 或图片；人物和事件链接保留在每则卡片中。
常见错年、错误归日、重复人物描述、战争/灾难/死亡内容通过人工审阅替换或修正。补充记录给出独立百科或事件官方来源，不以代码许可证代替第三方资料的权利说明。

10 月 13 日内容独立依据帕丁顿官方时间线整理：
https://www.paddington.com/jp/back-in-1958/timeline/
日期为 1958-10-13，《A Bear Called Paddington》首次出版。
每条日期资料包含 source 字段供读者核对，使用本地静态文件，不在访问时调用外部历史服务。

维护时应核对新增事件的日期和年份，优先使用官方机构、原出版者或其他可核对的资料。旧历日期要明确注明，不能默认为现代公历。
