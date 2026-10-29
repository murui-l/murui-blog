export const meguminIntroduction = "吾名惠惠，红魔族第一的魔法师兼爆裂魔法的操纵者";

export const meguminPet = {
  repository: "https://github.com/murui-l/megumin-codex-pet",
  animation: "/images/megumin/pet-collapse.webp",
  poster: "/images/megumin/pet-prone.webp",
  width: 192,
  height: 208,
};

export const meguminQuotes = [
  {
    "id": "introduction",
    "text": "吾名惠惠，最强攻击魔法——爆裂魔法的操纵者！",
    "japanese": "我が名はめぐみん。最強の攻撃魔法“爆裂魔法”を操る者！",
    "sourceUrl": "https://konosuba.com/1st/story/?id=02&mode=detail",
    "sourceLabel": "第 1 季 · 第 2 话官方剧情介绍；中文整理译文"
  },
  {
    "id": "crimson",
    "text": "在红莲之中，燃烧殆尽吧！",
    "japanese": "燃え尽きろ。紅蓮の中で",
    "sourceUrl": "https://anime-maketto.com/550",
    "sourceLabel": "第 1 季 · 第 4 话台词整理；中文整理译文"
  },
  {
    "id": "nice",
    "text": "Nice 爆裂！",
    "japanese": "ナイス爆裂！",
    "sourceUrl": "https://anime-maketto.com/550",
    "sourceLabel": "第 1 季 · 第 4 话台词整理；中文整理译文"
  },
  {
    "id": "carry",
    "text": "那谁把我背回去呢？",
    "japanese": "そうしたらいったい誰が私をおぶって帰るんですか？",
    "sourceUrl": "https://www.lingq.com/ja/%E3%82%AA%E3%83%B3%E3%83%A9%E3%82%A4%E3%83%B3%E3%81%A7%E6%97%A5%E6%9C%AC%E8%AA%9E%E5%AD%A6%E7%BF%92/courses/580212/konosu-qing-rashiishi-jie-nizhu-fu-wo-3586176/",
    "sourceLabel": "LingQ 第 1 季 · 第 4 话转录台词；中文整理译文"
  },
  {
    "id": "passion",
    "text": "在爆裂魔法领域，我谁都不想输！",
    "japanese": "爆裂魔法のことに関しては私は誰にも負けたくないのです！",
    "sourceUrl": "https://w.atwiki.jp/niconicomugen/pages/9703.html",
    "sourceLabel": "惠惠角色词条中的台词节选；中文整理译文"
  },
  {
    "id": "explosion",
    "text": "Explosion！",
    "japanese": "エクスプロージョン!!",
    "sourceUrl": "https://konosuba.com/1st/story/?id=02&mode=detail",
    "sourceLabel": "第 1 季 · 第 2 话官方剧情介绍"
  },
  {
    "id": "destiny",
    "text": "这场邂逅，是世界所选择的命运。",
    "japanese": "この邂逅は世界が選択せし運命",
    "sourceUrl": "https://ameblo.jp/gsc-mikatan/entry-12239045101.html",
    "sourceLabel": "Good Smile Company 惠惠手办官方介绍中的台词；中文整理译文"
  },
  {
    "id": "daily-explosion",
    "text": "红魔族一天不放一次爆裂魔法，就会死掉的。",
    "japanese": "紅魔族は日に１度、爆裂魔法を撃たないと死ぬんです",
    "sourceUrl": "https://animemanga33.com/archives/52755",
    "sourceLabel": "第 1 季 · 第 4 话台词整理；中文整理译文"
  },
  {
    "id": "world-conquest",
    "text": "征服世界！",
    "japanese": "世界征服！",
    "sourceUrl": "https://animemanga33.com/archives/78418",
    "sourceLabel": "《爆焰》· 第 1 话台词整理；中文整理译文"
  },
  {
    "id": "demon-king",
    "text": "那……请让我成为魔王吧。",
    "japanese": "なら…私を魔王にして下さい",
    "sourceUrl": "https://animemanga33.com/archives/78418",
    "sourceLabel": "《爆焰》· 第 1 话台词整理；中文整理译文"
  },
  {
    "id": "only-love-explosion",
    "text": "我只钟情于爆裂魔法！",
    "japanese": "私は爆裂魔法しか愛せない！",
    "sourceUrl": "https://matomame.jp/user/FrenchToast/bb57ad4f51ae59ac61f3",
    "sourceLabel": "第 1 季 · 第 2 话台词整理；中文整理译文"
  },
  {
    "id": "explosion-path",
    "text": "一起踏上爆裂之道吧！",
    "japanese": "爆裂道を歩もうじゃありませんか！",
    "sourceUrl": "https://subculwalker.com/archives/49751/",
    "sourceLabel": "惠惠官方 LINE 语音贴图的台词报道；中文整理译文"
  }
];

export type MeguminSpell = {
  id: string;
  lines: string[];
  japanese?: string[];
  japaneseKind?: "translation" | "original-excerpt";
  title?: string;
  note?: string;
  excerpt?: boolean;
  sourceUrl: string;
  sourceLabel: string;
};

export const meguminSpells: MeguminSpell[] = [
  {
    "id": "deep-crimson",
    "title": "深红闪光",
    "lines": [
      "向那比黑更黑比暗更暗的深渊中",
      "祈求吾之深红闪光",
      "觉醒之时已然降至",
      "堕入无谬境界的真理啊",
      "化作无穷的扭曲现界吧",
      "起舞吧 起舞吧 起舞吧！",
      "吾之魔力奔流所求之物即崩坏",
      "无人能及之崩坏",
      "森罗万象皆归尘土",
      "从深渊前来吧！",
      "Explosion！"
    ],
    "note": "站主收藏的咏唱译文，对应初登场时的巨蛙战。不同字幕版本的措辞会有差异。",
    "sourceLabel": "第 1 季 · 第 2 话",
    "sourceUrl": "https://konosuba.com/1st/story/?id=02&mode=detail",
    "japanese": [
      "黒よりも黒く、闇よりも暗い、その深淵へ",
      "我が深紅の閃光を祈り求める",
      "目覚めの時は、すでに訪れた",
      "謬りなき境界へと堕ちた真理よ",
      "果てなき歪みとなり、この現世に姿を現せ",
      "舞え、舞え、舞え！",
      "我が魔力の奔流が求めるもの、それは崩壊",
      "誰も及び得ぬ崩壊",
      "森羅万象よ、塵に還れ",
      "深淵より来たれ！",
      "エクスプロージョン！"
    ],
    "japaneseKind": "translation"
  },
  {
    "id": "white-world",
    "lines": [
      "以吾之深红涌流，",
      "颠覆这纯白的世界吧！",
      "Explosion！"
    ],
    "sourceUrl": "https://punimochi.site/konozuba-eisyou/",
    "sourceLabel": "第 1 季 · 第 7 话 · 咏唱节选",
    "excerpt": true,
    "japanese": [
      "我が深紅の奔流をもって、",
      "この真っ白な世界を覆せ！",
      "エクスプロージョン！"
    ],
    "japaneseKind": "translation"
  },
  {
    "id": "awaken-and-pierce",
    "lines": [
      "时机已至！",
      "此刻，从沉睡中觉醒，",
      "以吾之狂气现于此世吧！",
      "贯穿吧！Explosion！"
    ],
    "sourceUrl": "https://matomame.jp/user/FrenchToast/b356dc0206df318943aa",
    "sourceLabel": "第 2 季 · 第 5 话 · 咏唱节选",
    "excerpt": true
  },
  {
    "id": "crimson-resonance",
    "lines": [
      "可怜的野兽啊，与深红黑炎共鸣，",
      "化为血潮，偿还吧！",
      "贯穿吧！Explosion！"
    ],
    "sourceUrl": "https://dakunes.seesaa.net/article/448801568.html",
    "sourceLabel": "第 2 季 · 第 10 话 · 咏唱节选",
    "excerpt": true
  },
  {
    "id": "light-and-night",
    "lines": [
      "被光明笼罩的漆黑啊，",
      "披覆黑夜的爆炎啊。",
      "……",
      "Explosion！"
    ],
    "japanese": [
      "光に覆われし漆黒よ。",
      "夜を纏いし爆炎よ。",
      "……",
      "エクスプロージョン！"
    ],
    "sourceUrl": "https://ciatr.jp/topics/311334",
    "sourceLabel": "第 1 季 · 第 3 话 · 咏唱节选",
    "excerpt": true,
    "japaneseKind": "original-excerpt"
  },
  {
    "id": "universal-heat",
    "lines": [
      "吾为万象升温之理，",
      "亦是崩坏与破坏之别名。",
      "……",
      "Explosion！"
    ],
    "japanese": [
      "我は万象昇温の理。",
      "崩壊破壊の別名なり。",
      "……",
      "エクスプロージョン！"
    ],
    "sourceUrl": "https://frequ.jp/571",
    "sourceLabel": "第 1 季 · 第 4 话 · 咏唱节选",
    "excerpt": true,
    "japaneseKind": "original-excerpt"
  },
  {
    "id": "beginning-and-ending",
    "lines": [
      "那是起始之炎，",
      "那是终结之炎。",
      "……",
      "Explosion！"
    ],
    "japanese": [
      "それは始まりの炎、",
      "それは終わりの炎。",
      "……",
      "エクスプロージョン！"
    ],
    "sourceUrl": "https://mandarabatake.hatenablog.com/entry/2023/05/05/000000",
    "sourceLabel": "《为美好的世界献上爆焰！》· 第 5 话 · 咏唱节选",
    "excerpt": true,
    "japaneseKind": "original-excerpt"
  }
];

export type MeguminArtwork = {
  id: string;
  title: string;
  src: string;
  width: number;
  height: number;
  description: string;
  sourceLabel: string;
  sourceUrl?: string;
};

export const meguminArtworks: MeguminArtwork[] = [
  {"id":"megumin-chomusuke-rest","title":"惠惠与豆助的休息时光","src":"/images/megumin/megumin-chomusuke-rest.webp","width":776,"height":1174,"description":"惠惠与豆助的休息时光，站主提供","sourceLabel":"站主提供"},
  {"id":"megumin-library-magic","title":"书架前的魔法师","src":"/images/megumin/megumin-library-magic.webp","width":700,"height":971,"description":"书架前的魔法师，站主提供","sourceLabel":"站主提供"},
  {"id":"megumin-night-room","title":"抱着枕头的惠惠","src":"/images/megumin/megumin-night-room.webp","width":1000,"height":787,"description":"抱着枕头的惠惠，站主提供","sourceLabel":"站主提供"},
  {"id":"megumin-sunset-staff","title":"夕阳下的惠惠与法杖","src":"/images/megumin/megumin-sunset-staff.webp","width":938,"height":1187,"description":"夕阳下的惠惠与法杖，站主提供","sourceLabel":"站主提供"},
  {"id":"megumin-chomusuke-wink","title":"惠惠与豆助的眨眼瞬间","src":"/images/megumin/megumin-chomusuke-wink.webp","width":754,"height":1000,"description":"惠惠与豆助的眨眼瞬间，站主提供","sourceLabel":"站主提供"},
  {"id":"megumin-sunny-wink","title":"阳光下的惠惠","src":"/images/megumin/megumin-sunny-wink.webp","width":764,"height":1200,"description":"阳光下的惠惠，站主提供","sourceLabel":"站主提供"},
  {"id":"megumin-kazuma-carry","title":"和真抱起惠惠","src":"/images/megumin/megumin-kazuma-carry.webp","width":903,"height":1179,"description":"和真抱起惠惠，站主提供","sourceLabel":"站主提供"},
  {"id":"megumin-new-year-party","title":"伙伴们的新年合影","src":"/images/megumin/megumin-new-year-party.webp","width":800,"height":705,"description":"伙伴们的新年合影，站主提供","sourceLabel":"站主提供"},
  {"id":"megumin-cat-ears","title":"猫耳惠惠与豆助","src":"/images/megumin/megumin-cat-ears.webp","width":1200,"height":1745,"description":"猫耳惠惠与豆助，站主提供","sourceLabel":"站主提供"},
  {"id":"megumin-red-dress","title":"戴着魔法帽的惠惠","src":"/images/megumin/megumin-red-dress.webp","width":1349,"height":2400,"description":"戴着魔法帽的惠惠，站主提供","sourceLabel":"站主提供"},
  {"id":"megumin-starlit-magic","title":"星空下的爆裂魔法师","src":"/images/megumin/megumin-starlit-magic.webp","width":1579,"height":2400,"description":"星空下的爆裂魔法师，站主提供","sourceLabel":"站主提供"},
  {"id":"megumin-hot-spring","title":"温泉中的惠惠与豆助","src":"/images/megumin/megumin-hot-spring.webp","width":1999,"height":2400,"description":"温泉中的惠惠与豆助，站主提供","sourceLabel":"站主提供"},
  {"id":"megumin-kazuma-piggyback","title":"背上的惠惠","src":"/images/megumin/megumin-kazuma-piggyback.webp","width":1500,"height":2069,"description":"背上的惠惠，站主提供","sourceLabel":"站主提供"},
  {"id":"megumin-rain-shelter","title":"惠惠与豆助一起避雨","src":"/images/megumin/megumin-rain-shelter.webp","width":1697,"height":2400,"description":"惠惠与豆助一起避雨，站主提供","sourceLabel":"站主提供"},
  {"id":"megumin-cow-pajamas","title":"惠惠的斑点睡衣","src":"/images/megumin/megumin-cow-pajamas.webp","width":744,"height":1052,"description":"惠惠的斑点睡衣，站主提供","sourceLabel":"站主提供"},
  {"id":"megumin-sleepy-morning","title":"刚睡醒的惠惠","src":"/images/megumin/megumin-sleepy-morning.webp","width":1697,"height":2400,"description":"刚睡醒的惠惠，站主提供","sourceLabel":"站主提供"},
  {"id":"megumin-kazuma-birthday","title":"惠惠与和真的生日合影","src":"/images/megumin/megumin-kazuma-birthday.webp","width":1855,"height":2400,"description":"惠惠与和真的生日合影，站主提供","sourceLabel":"站主提供"},
  {"id":"megumin-rain-window","title":"雨窗后的惠惠","src":"/images/megumin/megumin-rain-window.webp","width":1697,"height":2400,"description":"雨窗后的惠惠，站主提供","sourceLabel":"站主提供"},
  {"id":"megumin-reaching-hands","title":"伸出双手的惠惠","src":"/images/megumin/megumin-reaching-hands.webp","width":1697,"height":2400,"description":"伸出双手的惠惠，站主提供","sourceLabel":"站主提供"},
  { id: "magic", title: "深红色的觉醒", src: "/images/megumin/practice.webp", width: 700, height: 394, description: "橙金色魔法环亮起，惠惠举起法杖，迎向那道憧憬已久的光。", sourceLabel: "《爆焰》· 第 5 话官方剧照", sourceUrl: "https://konosuba.com/bakuen/story/?mode=story5" },
  { id: "bakuen", title: "最后一声，Explosion！", src: "/images/megumin/bakuen.webp", width: 700, height: 394, description: "红色眼瞳与闪耀的魔法阵，把这一刻的光芒留在小屋里。", sourceLabel: "《爆焰》· 第 12 话官方剧照", sourceUrl: "https://konosuba.com/bakuen/story/?mode=story12" },
  { id: "adventure", title: "和豆助一起去冒险", src: "/images/megumin/adventure.webp", width: 700, height: 394, description: "熟悉的帽子、披风、法杖，还有陪在身边的小小豆助。", sourceLabel: "《爆焰》· 第 12 话官方剧照", sourceUrl: "https://konosuba.com/bakuen/story/?mode=story12" },
  { id: "crimson", title: "红魔族也有小小慌张", src: "/images/megumin/crimson.webp", width: 650, height: 366, description: "帅气的魔法师，也会露出这样可爱的表情。", sourceLabel: "第 1 季 · 第 6 话官方剧照", sourceUrl: "https://konosuba.com/1st/story/?id=06&mode=detail" },
  {"id":"smile","title":"惠惠在晴天的树林前微笑","src":"/images/megumin/smile.webp","width":700,"height":394,"description":"惠惠在晴天的树林前微笑","sourceLabel":"《爆焰》动画官网第 1 话","sourceUrl":"https://konosuba.com/bakuen/story/?mode=story1"},
  {"id":"school","title":"戴着魔女帽的惠惠站在魔法学园的同学们中间","src":"/images/megumin/school.webp","width":700,"height":394,"description":"戴着魔女帽的惠惠站在魔法学园的同学们中间","sourceLabel":"《爆焰》动画官网第 1 话","sourceUrl":"https://konosuba.com/bakuen/story/?mode=story1"},
  {"id":"hello","title":"惠惠戴着魔女帽向前伸出手","src":"/images/megumin/hello.webp","width":700,"height":394,"description":"惠惠戴着魔女帽向前伸出手","sourceLabel":"《爆焰》动画官网第 6 话","sourceUrl":"https://konosuba.com/bakuen/story/?mode=story6"},
  {"id":"afterglow","title":"惠惠与芸芸站在金色爆裂魔法的余光前","src":"/images/megumin/afterglow.webp","width":700,"height":394,"description":"惠惠与芸芸站在金色爆裂魔法的余光前","sourceLabel":"《爆焰》动画官网第 6 话","sourceUrl":"https://konosuba.com/bakuen/story/?mode=story6"},
  {"id":"home","title":"惠惠在家中对妹妹微笑","src":"/images/megumin/home.webp","width":700,"height":394,"description":"惠惠在家中对妹妹微笑","sourceLabel":"《爆焰》动画官网第 6 话","sourceUrl":"https://konosuba.com/bakuen/story/?mode=story6"},
  {"id":"exhausted","title":"戴着眼罩的惠惠脱力躺在地上","src":"/images/megumin/exhausted.webp","width":700,"height":394,"description":"戴着眼罩的惠惠脱力躺在地上","sourceLabel":"《爆焰》动画官网第 10 话","sourceUrl":"https://konosuba.com/bakuen/story/?mode=story10"},
  {"id":"street","title":"惠惠与芸芸站在冒险者街道上","src":"/images/megumin/street.webp","width":700,"height":394,"description":"惠惠与芸芸站在冒险者街道上","sourceLabel":"《爆焰》动画官网第 10 话","sourceUrl":"https://konosuba.com/bakuen/story/?mode=story10"},
  {"id":"wagon","title":"惠惠抱着法杖躺在木制拖车里","src":"/images/megumin/wagon.webp","width":700,"height":394,"description":"惠惠抱着法杖躺在木制拖车里","sourceLabel":"《爆焰》动画官网第 10 话","sourceUrl":"https://konosuba.com/bakuen/story/?mode=story10"},
];
