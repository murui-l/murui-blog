# 小窝寻物盒、星光小窗与翻页回忆册

日期：2026-10-18。

- cmdk 1.1.1，MIT：https://github.com/dip/cmdk 。本站用 Command 的键盘筛选能力，外层是原生 dialog，主题与公共内容索引由本站实现。完整许可见 keepsakes-cmdk-MIT.txt。
- @tsparticles/engine 4.4.0 与 @tsparticles/slim 4.4.0，MIT：https://github.com/tsparticles/tsparticles 。只在电台星窗点亮时按需加载，限制在局部容器，隐藏/离屏暂停，关闭与离页销毁。完整许可见 keepsakes-particles-MIT.txt。
- @gullabs/flipbook-core 3.2.2，MPL-2.0（包含上游 Nodlik MIT 声明）。未修改的核心来自 npm 对应版本：https://www.npmjs.com/package/@gullabs/flipbook-core/v/3.2.2 。其 Covered Software 源码及维护记录公开于 https://github.com/gul-labs/flipbook ，包含 packages/core；完整许可和上游声明见 keepsakes-flipbook-LICENSE.txt，应用回忆册内也提供源码入口。只调用公开 API，不复制或修改引擎源码。

原 StPageFlip/page-flip 2.0.7 因 destroy 后仍有持续绘制循环，未用于最终实现。html-to-image 和纪念票按站主最新要求移除，最终依赖与页面均不包含纪念票。

新交互仅使用已有公开文章/相册 DTO，不读取成员私密随笔，不新增 API、表结构或迁移。图库原图、署名与水印不变；回忆册使用完整比例图片，只按每册最多20张分批展示。新弹窗按需加载，按普通页面路由关闭；原明信片、留言、背景、标签和共享音频保持。
