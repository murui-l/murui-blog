# 电台歌词组件来源

2026-10-23：使用 react-lrc 3.2.1（https://github.com/mebtte/react-lrc）完成逐行滚动，样式由本站设计；只使用展示组件，继续复用小窝播放器与现有歌词接口。不复制 Apple Music 或 AMLL 的源码。未获取逐字时间轴时仅逐行高亮，不制造逐字同步效果。

组件仅在歌词区域可见、页面前台且未启用减少动态模式时挂载；其余情况显示静态歌词。

## 原始 MIT 许可

MIT License

Copyright (c) 2020 Mebtte Pan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
