/** MiniMax 歌词曲风：大类 + 子类。提示词学的是抖音/B站高播写法，不抄现成歌词。 */

export const DEFAULT_GENRE_GROUP = 'pop';
export const DEFAULT_GENRE_SUB = 'gufeng';

function s(id, zh, en, bpm, styleEn, instruments, prompt, flags = {}) {
  return { id, zh, en, bpm, styleEn, instruments, prompt, flags };
}

const GUFENG_COUPLET_RULES = [
  '对仗必须工整：主歌两行一组，上下句字数必须完全相同，七言对七言。',
  '同一位置词性相对：名对名、动对动、声对色、你对我。正例：油灯把人影拉斜 / 衣扣还差最末颗。',
  '禁止合掌（上下句意思重复），禁止上句七字下句十字，禁止「铜镜，映眉，初上妆」这种碎句，碎了就无法对仗。',
  '副歌前三句排比：结构、字数相同，衬词啊~固定嵌在同一位置，例如：你一望啊~我开口 / 你一笑啊~我噤声。第四句改成更短的口语钩子打断排比：空座啊~还在等。'
].join('\n');

function g(id, zh, en, prompt, flags, subs) {
  return { id, zh, en, prompt, flags, subs };
}

const POP = g(
  'pop',
  '流行音乐',
  'Pop',
  [
    '本分类要对齐抖音/B站高播流行：先写副歌记忆核，再写主歌去解释它。主歌讲一件具体事，预副歌把情绪抬起来，副歌第一句必须能单独截成 8 秒卡点。',
    '一句记忆核 + 一个画面，不要空洞抒情。副歌开口音多、记忆核突出、整段至少 6 行，好跟唱。每段至少一句金句。',
    '编曲学高播华语流行制作：Intro 1 件主奏；Verse 近、干、少层；Pre-chorus 加一层；Chorus 突然变宽；Bridge 抽层；末次 Chorus 更大。乐器 3-5 件写角色。'
  ].join('\n'),
  {},
  [
    s('gufeng', '古风', 'Gufeng', '72-96',
      'A cinematic Chinese Gufeng theatrical ballad, Yu-mode pentatonic minor, 80 BPM, opera-house night on phone speakers. Intro: guzheng harmonics only, no kit. Verse: dry close-mic + pipa, mp. Pre-chorus: dizi + woodblock lift, mf. Chorus: jinghu/erhu LEAD glissando doubles the hook, palatial drum hits, hall strings, ff. Bridge: drums out, erhu solo. Final chorus wetter and bigger.',
      'jinghu or erhu lead with glissando, pipa or guzheng sparse accompaniment, dizi counter-melody, palatial drums and gong, hall reverb strings at chorus only',
      [
        '词法学抖音高播戏腔古风（青衣、牵丝戏、赤伶同类），只学结构，禁止复述其成句、歌名或典故原句。',
        '一场核心隐喻贯穿全曲：傀儡与牵线、听戏与台上人、油灯与空座，三选一写透。道具只服务这场戏（油灯、衣扣、戏箱、盘铃、空座），不要每句换月、江、酒、桥。',
        '七言为骨：主歌写成完整的 7 字句，两句一组连着写，不要切成「红台，空候，锣鼓响」。换气用换行。半文半白，能唱能懂；全曲最多一个成语当刺，禁止成语排比。',
        GUFENG_COUPLET_RULES,
        '关系句用你X我Y 工整对仗推进（你动作/残缺，我回应/成全），不要只对风景。下句必须比上句更狠，末字开口可唱。',
        '副歌用同一句式排比三次（如「我为你……」或「你一……我……」），每一句写完整，衬词啊~嵌在句中；第四句改成更短口语钩子（A-A-A-B）。第一句必须能单独截成戏腔卡点。戏腔长音放在曲、戏、谁、啊、哪等开口字。',
        '主歌可带今人叙事，副歌入戏拖腔。可有一句七字内念白。结尾把时间尺度拉开，落在一句命运判断。',
        '编曲学关山酒式高播国风分层（只学进出，不抄旋律）：Intro 古筝泛音或笛，不要成套鼓；Verse 近麦+一件拨弦 mp；Pre-chorus 加笛或木鱼抬一层 mf；Chorus 京胡/二胡 glissando 跟着记忆核，宫廷鼓点 ff；Bridge 抽鼓留二胡独奏；末次 Chorus 更湿更大。禁止 trap 808，禁止无名 Asian strings。'
      ].join('\n')),
    s('guofeng', '国风', 'Guofeng', '80-110',
      'A contemporary Guofeng pop anthem, pentatonic color over modern pulse: traditional lead instrument named in pinyin, modern drums only as groove not as the song identity. Singable chorus with a short looping hook. Guzheng or dizi LEAD riff; tight modern drums and bass enter at pre-chorus; choir or gang vocal on the hook; synth pad under chorus only.',
      'guzheng or dizi lead riff, modern drums as groove, bass, choir on hook, synth pad chorus only',
      [
        '词法学抖音国风高播（芒种、万疆同类），只学结构，禁止抄句。',
        '用一个节气、农事或山河动作当全曲隐喻，不要写成穿越戏词。主歌半文半白讲一件离别，副歌改成能跟唱的短句。',
        GUFENG_COUPLET_RULES,
        '国风对仗可以略口语，但两行字数仍必须对齐，例如：一想到你便停舟 / 一想起你便回首。',
        '副歌用同一口语起句连两次（「一想到……」这种骨架），再用三四个字收束成卡点。可加一段古筝/笛 [Solo]。',
        '唱法流行，拖腔只放句尾。少成语，多能上口的现代中文。'
      ].join('\n')),
    s('zhongguofeng', '中国风', 'Zhongguo-style Pop', '76-100',
      'A Zhongguo-style C-pop track: modern pop skeleton, ONE Chinese-instrument color only, pictorial chorus couplet. Piano or guitar as groove; pipa or erhu as color entering at pre-chorus; warm bass; light strings at chorus. Pentatonic color tones, radio-clean mix.',
      'piano or guitar groove, pipa or erhu color, warm bass, light chorus strings',
      [
        '词法学中国风高播（青花瓷、东风破同类），只学结构，禁止抄句。',
        '一首歌只写一件工艺或天气物件（釉色、帘、琵琶、烟雨），用物件推进感情，尽量不出现「爱」字。',
        '副歌用镜像句：上句写物候，下句写人等同一件事。主歌像工笔：芭蕉、灯、窗，每句一个镜头。',
        '流行骨架，文言只作点缀，不要写成全古风戏词。'
      ].join('\n')),
    s('c-pop', 'C-Pop', 'C-Pop', '78-108',
      'A polished Mandopop/C-pop single, 92 BPM, radio-ready, phone-speaker punch. Intro: one muted-guitar or piano figure. Verse: close-mic dry vocal + that one figure, mp. Pre-chorus: bass and tight drums enter, mf. Chorus: doubled vocal, wider stereo, identity riff, ff. Bridge: drums drop. Final chorus bigger.',
      'close-mic vocal, verse piano or muted guitar, tight drums, bass, doubled chorus vocal',
      [
        '词法学华语流行高播（晴天、起风了同类），只学结构，禁止抄句。',
        '主歌用天气、课桌、车窗、耳机等生活物件讲一件未说完的事；预副歌把未说出口的话抬起来。',
        '副歌第一句必须能发成短视频文案：具体、第二人称、不喊口号。',
        '口语为主，偶发一句诗意，不要古风堆砌。'
      ].join('\n')),
    s('k-pop', 'K-Pop', 'K-Pop', '100-128',
      'A high-energy K-pop track with chantable pre-chorus and a one-word-repeatable chorus hook.',
      'synth stabs, 808, bright brass hits, stacked vocals',
      [
        '词法学 K-Pop 高播（Dynamite、Super Shy 同类结构），只学结构，禁止抄句。',
        '开场即可短副歌。预副歌用短问句或倒计时抬升；副歌把一个 2-4 字中文钩子重复，能卡舞蹈点。',
        '主歌场景轻（出门、对视、心跳），不要写成长情歌。中文模式禁止英文 hook，用中文口令代替。',
        '可有一句 [Hook] 群唱应答。'
      ].join('\n')),
    s('j-pop', 'J-Pop', 'J-Pop', '90-120',
      'A narrative J-pop song with dense verse storytelling and a soaring, vowel-open chorus.',
      'piano, guitar arpeggio, strings swell, tight drums',
      [
        '词法学 J-Pop 高播叙事（夜に駆ける同类），只学结构，禁止抄句。',
        '主歌密：按镜头切（车站、奔跑、回头），时间线清楚。副歌情绪冲刺，开口音拉长，少新信息。',
        '像把短篇小说压成歌，不要口号。中文也要唱出「镜头在动」。'
      ].join('\n')),
    s('dream-pop', '梦幻流行', 'Dream Pop', '68-88',
      'A hazy dream-pop song with breathy vocals, blurred edges, and slow-blooming chorus.',
      'washed guitar, analog pad, tape hiss, soft kick',
      [
        '词法学梦幻流行高播（泡沫同类空灵情歌），只学结构，禁止抄句。',
        '每句一个光斑或水汽，主语可以模糊，但必须能看见。副歌慢、长音多，像梦醒前的一句。',
        '不要写实到街道门牌，也不要无意义空转。'
      ].join('\n')),
    s('folk-pop', '民谣流行', 'Folk Pop', '72-96',
      'A folk-pop song with acoustic intimacy that blooms into a singable pop chorus.',
      'acoustic guitar, light percussion, harmonica color, warm bass',
      [
        '词法学民谣流行高播（理想三旬、成都交叉点），只学结构，禁止抄句。',
        '主歌像路边说话：年龄、路、酒、一个人。副歌变成大家能跟着哼的邀请句或祝愿句。',
        '用真路名或真季节锚点，不要文艺腔堆砌。'
      ].join('\n')),
    s('electro-pop', '电子流行', 'Electro Pop', '108-124',
      'A sleek electro-pop song with synth hooks and a chorus designed for phone-speaker punch.',
      'analog synth lead, sidechained pad, punchy kick, vocal chop',
      [
        '词法学电子流行高播（光年之外同类），只学结构，禁止抄句。',
        '用距离、光速、楼宇玻璃等现代隐喻写感情。主歌短，预副歌滤镜打开，副歌踩点+开口长音。',
        '合成器钩子和人声钩子叠在一起，不要写成民谣。'
      ].join('\n')),
    s('city-pop', '城市流行', 'City Pop', '96-118',
      'A glossy city-pop tune with night-drive warmth, chorus sparkle, and retro-modern sheen.',
      'Rhodes, slap bass, muted guitar, airy synth',
      [
        '词法学城市流行/夜驾高播写法，只学结构，禁止抄句。',
        '车窗、霓虹、便利店冷气、副驾沉默。时髦细节，不要怀旧说明书。',
        '副歌轻松上扬，像夜路突然变亮的一句。'
      ].join('\n')),
    s('healing', '治愈系', 'Healing Pop', '64-84',
      'A healing pop ballad: close-mic whisper verses, gentle lift not a scream chorus. Felt guitar or soft piano, lo-fi dry drums, cello answering phrases, tape warmth. Chorus wider but still intimate, no gated arena snare.',
      'felt guitar or soft piano, close-mic vocal, lo-fi drums, cello answers, tape warmth',
      [
        '词法学治愈高播（小幸运、起风了同类温度），只学结构，禁止抄句。',
        '像对一个人轻声说话。安慰必须是实物（灯、粥、外套、晚风），禁止鸡汤金句。',
        '副歌温暖、长音克制，不要高潮喊破。',
        '主歌回忆一件小事，副歌是「还在」而不是「永远」。'
      ].join('\n'),
      { keepFormula: true }),
    s('acg', 'ACG', 'ACG', '88-160',
      'An ACG character anthem: identity line then climactic vowel-open chorus. Orchestra hits and choir as color, distorted guitar or synth lead as hook, taiko for downbeats. Verse lean; pre-chorus snare roll; chorus tutti; last chorus key-lift feel without leaving the scale.',
      'orchestra hits, choir color, guitar or synth lead hook, taiko downbeats',
      [
        '词法学 B 站角色曲/燃曲高播（红莲华、残響散歌、崩铁角色曲同类），只学结构，禁止抄现成 IP 句。',
        '先用一行立住身份（我是谁、为何拔刀/为何不退），再把命运写成可喊的一句。',
        '副歌对仗、开口啊~进高潮。主歌可写技能/轮回/同伴，但要具体动作。',
        '用户没给角色设定时，自造一个完整身份，不要借用现成动漫人名。'
      ].join('\n')),
    s('dance-pop', '舞曲流行', 'Dance Pop', '118-130',
      'A dance-pop banger with four-on-the-floor groove and a chorus built for looping.',
      'four-on-the-floor kick, clap stack, bass synth, bright lead',
      [
        '词法学舞曲流行高播（卡路里同类指令舞曲），只学结构，禁止抄句。',
        '副歌必须能循环：动词多（靠近、转身、别停），8 拍一句。主歌给一个具体夜晚场景。',
        '不要写成情歌独白。'
      ].join('\n')),
    s('idol-pop', '偶像流行', 'Idol Pop', '112-128',
      'A sparkling idol-pop track with call-and-response hooks and stage-light energy.',
      'bright synth, group claps, stacked chorus vocals, sparkle SFX',
      [
        '词法学偶像高播应援结构，只学结构，禁止抄句。',
        '副歌短、亮、能喊，可加一句观众应答。主歌给舞台灯、练习室、发带，不要写成长情歌。',
        '用「我们」多于「我独自」。'
      ].join('\n')),
    s('mandopop-ballad', '华语情歌', 'Mandopop Ballad', '68-86',
      'A Mandopop love ballad, 76 BPM: conversational dry verses, confession-line chorus. Intro: one piano figure. Verse: close breathy vocal + piano or guitar only, mp. Pre-chorus: brushes enter. Chorus: warm strings bloom, belted open vowels, ff. Bridge: strings out, spoken-close. No arena snare on verse.',
      'soft piano or acoustic guitar bed, close breathy vocal, warm strings at chorus, soft drums late',
      [
        '词法学华语情歌高播（告白气球、后来、体面同类），只学结构，禁止抄句。',
        '主歌是两个人之间的一件小事（公园、短信、电梯），像在说话。',
        '副歌是那句终于说出口的话：直球，但要带一个动作或场景，不要空喊想你。',
        '可用时间词排比（后来/那天）推进，第二人称「你」。禁止永远/明天/世界空转。'
      ].join('\n'),
      { keepFormula: true }),
    s('viral-hook', '洗脑神曲', 'Viral Hook Pop', '100-140',
      'A viral short-video hook song, 120 BPM: ultra-simple chorus, hard downbeats, instant recall. Intro: 4-bar identity riff only. Verse: riff + dry vocal, mp. Pre-chorus: snare roll. Chorus: hard kick on 1 and 3, clap stack, bass drop, hook doubled, ff. Mix for phone speaker, no lush ballad strings.',
      'hard kick, 4-bar identity riff, clap stack, bass drop, doubled hook',
      [
        '词法学抖音神曲高播（热爱105°C的你、孤勇者同类卡点），只学结构，禁止抄句。',
        '副歌 6-12 字，可原句重复；钩子用一个具体尺度（温度、反问、一个动作），必须能当 BGM。',
        '主歌也短，每段一个物件。允许强记忆点，禁止无意义乱喊和学猫叫式拟声堆砌。',
        '励志向用第二人称短句对抗；甜歌向用一个贯穿隐喻，不要又甜又燃混成一锅。'
      ].join('\n'),
      { catchyHook: true, keepFormula: true })
  ]
);

const CLASSICAL = g(
  'classical',
  '古典音乐',
  'Classical',
  [
    '本分类偏音乐会与配乐：结构用 [Instrumental]、[Build-up]、[Chorus] 当主题再现。',
    '人声若出现，写成咏叹或衬词，不要写成流行情歌。长音用啊~、哦~拖腔。',
    '编曲：主题动机先由一件独奏呈示，展开加层，再现全奏；禁止流行鼓组一路垫底。'
  ].join('\n'),
  { instrumentalBias: true, keepFormula: true },
  [
    s('symphony', '交响乐', 'Symphony', '60-120',
      'A sweeping symphonic piece with motif development and a climactic tutti chorus-like theme.',
      'full orchestra, brass fanfare, string ostinato, timpani',
      '学音乐会呈示-展开-再现：主歌呈示动机，副歌全奏。词少而庄重，或仅开口音。禁止抄现成交响主题名。'),
    s('concerto', '协奏曲', 'Concerto', '70-140',
      'A concerto-style piece contrasting a soloist against orchestra, with cadenza space.',
      'solo violin or piano versus orchestra',
      '学协奏问答：人声与独奏轮句。[Solo] 留给器乐华彩。人声不要盖过独奏。'),
    s('piano', '钢琴曲', 'Piano Piece', '60-100',
      'A lyrical piano-centered piece with close pedal color and a singing middle theme.',
      'solo piano, optional distant strings',
      '学 B 站高播钢琴曲（英雄主义同类）：主题简单、中段翻高、尾声回落。歌词极简或只用啊~。禁止抄现成钢琴曲旋律名。'),
    s('violin', '小提琴曲', 'Violin Piece', '70-110',
      'A singing violin-led piece with long cantabile lines and aching high register.',
      'solo violin, piano or string pad',
      '学高把位咏唱：字少、母音开、一句一弓。不要密词。'),
    s('chamber', '室内乐', 'Chamber Music', '66-96',
      'An intimate chamber work with conversational counterpoint between few instruments.',
      'string quartet or piano trio',
      '学室内乐对话：两三个人声/乐器交错，私密短句，不要交响乐宣言。'),
    s('aria', '歌剧咏叹调', 'Operatic Aria', '60-88',
      'An operatic aria with recitative-like verses and a held, vowel-open climactic line.',
      'orchestra, harp, dramatic soprano or tenor',
      '学咏叹调高播结构（今夜无人入睡同类能量，禁止抄句）：主歌宣叙讲处境，副歌一句命运拉满，超长波浪号 ~~。中文要能唱。'),
    s('baroque', '巴洛克', 'Baroque', '80-120',
      'A baroque-styled piece with harpsichord glitter, sequences, and ornamental vocal turns.',
      'harpsichord, baroque strings, continuo',
      '学巴洛克模进：短动机反复上移。词精炼、仪式感，不要现代口语。'),
    s('romantic', '浪漫主义', 'Romantic', '66-92',
      'A romantic-era styled piece with surging strings and a passionate lyric crest.',
      'lush strings, french horn, piano',
      '学浪漫派Lied：一个具体恋人/风景推到浪潮。情感外放，禁止空喊爱。'),
    s('impressionist', '印象派', 'Impressionist', '60-84',
      'An impressionist-colored piece with blurred harmony, water-light images, and soft peaks.',
      'celesta, harp, muted strings, flute',
      '学德彪西式色块：光、水、雾，句子不叙事太满。高潮是颜色变亮，不是喊。'),
    s('neoclassical', '新古典', 'Neoclassical', '80-110',
      'A neoclassical piece: clean counterpoint, modern pulse, restrained drama.',
      'strings, piano, light percussion',
      '学新古典克制：线条清楚，词像格言但必须落到一个物件。'),
    s('minimalist', '极简主义', 'Minimalism', '90-120',
      'A minimalist piece with repeating cells that slowly bloom into a late climax.',
      'piano ostinato, pulse strings, soft mallet',
      '学极简高播：细胞重复，每次只换一个字或加长音。禁止同一行连贴三次以上。'),
    s('film-score', '电影原声配乐', 'Film Score', '70-130',
      'A cinematic film-score cue that follows scene emotion and lands on a memorable theme.',
      'orchestra, piano motif, low brass, choir',
      '学电影主题曲高播：一场戏的建立→冲突→主题句。副歌即能当片尾的那一句。禁止抄现成OST成句。'),
    s('epic-score', '史诗配乐', 'Epic Score', '80-160',
      'An epic trailer-style score with percussion army, choir shouts, and a huge final hit.',
      'taiko, brass, choir, hybrid orchestra',
      '学 B 站史诗/泽野风燃曲：短词、强动词、副歌可喊，开口音进最后一击。词少过器乐。')
  ]
);

const ROCK = g(
  'rock',
  '摇滚乐',
  'Rock',
  [
    '本分类要对齐现场感：主歌咬字靠前，副歌开口喊出来。',
    '用具体物件（音箱、头盔、末班车）代替抽象愤怒。',
    '编曲：主歌 riff 或干净吉他，副歌失真墙+通通鼓；低音与军鼓必须写明。禁止钢琴流行底盘。'
  ].join('\n'),
  {},
  [
    s('hard-rock', '硬摇滚', 'Hard Rock', '110-140', 'A hard-rock anthem with riff-led verses and a shouted, open-vowel chorus.', 'distorted guitar riff, bass, live drums, backing shouts', '学现场摇滚高播：主歌短句断音，副歌开口能跟着挥拳。物件代替抽象愤怒。禁止抄现成摇滚成句。'),
    s('metal', '重金属', 'Heavy Metal', '140-180', 'A heavy-metal track with aggressive rhythm guitar and a soaring or barked chorus.', 'down-tuned guitars, double-kick, bass wall', '学金属高播：节奏密，副歌仍要一句可唱的命运判断。不要无意义嘶吼堆字。'),
    s('punk', '朋克', 'Punk', '160-200', 'A punk song with three-chord urgency and a chant chorus.', 'buzzsaw guitar, racing drums, gang vocals', '学朋克高播（没有理想的人同类直给）：又快又直，副歌像一句具体不满的标语，不要空喊体制。'),
    s('alt-rock', '另类摇滚', 'Alternative Rock', '96-130', 'An alt-rock song with tense verses and an explosive chorus lift.', 'crunch guitar, moody bass, dynamic drums', '学另类摇滚：主歌压抑叙事，副歌把门踢开。反差要大。'),
    s('britpop', '英伦摇滚', 'Britpop', '100-124', 'A britpop tune with melodic guitar jangle and a stadium-ready chorus.', 'jangle guitar, bass hooks, anthem drums', '学英伦高播：旋律优先，副歌能在球场唱。中文也要扬起来。'),
    s('grunge', '垃圾摇滚', 'Grunge', '80-120', 'A grunge song with dirty guitars, weary verses, and a hoarse chorus bloom.', 'fuzzy guitar, heavy bass, behind-the-beat drums', '学grunge：潮湿房间、疲惫、沙哑。副歌崩开但仍要具体。'),
    s('prog', '前卫摇滚', 'Prog Rock', '70-140', 'A progressive-rock piece with shifting sections and a late thematic payoff.', 'odd-meter drums, layered guitars, keys', '学前卫摇滚：段落对比大，[Break][Solo]后主题必须回来。'),
    s('psychedelic', '迷幻摇滚', 'Psychedelic Rock', '80-118', 'A psychedelic-rock song with swirling color and a hypnotic chorus.', 'phased guitar, organ, tape delay', '学迷幻摇滚：通感画面，副歌像旋涡，长音。'),
    s('post-rock', '后摇滚', 'Post-Rock', '70-110', 'A post-rock crescendo piece: sparse start, tidal mid, explosive late theme.', 'delay guitar, crescendo drums, bass swells', '学后摇高播：词极少，[Build-up]到爆发，人声可晚进。', { instrumentalBias: true }),
    s('indie-rock', '独立摇滚', 'Indie Rock', '96-124', 'An indie-rock song with conversational lyrics and a bittersweet chorus.', 'clean-dirty guitar, bass, snare crack', '学独立摇滚/万能青年旅店观察感：口语、刺、社会细节，副歌仍要好听。禁止抄其成句。'),
    s('blues-rock', '布鲁斯摇滚', 'Blues Rock', '80-120', 'A blues-rock song with guitar-call verses and a belted chorus.', 'overdriven guitar, Hammond, shuffle drums', '学蓝调摇滚：吉他先问人声再答，副歌释放。'),
    s('folk-rock', '民谣摇滚', 'Folk Rock', '84-112', 'A folk-rock song with acoustic bones and electric chorus lift.', 'acoustic-electric guitar, harmonica, drums', '学民谣摇滚：走路节奏进主歌，副歌把电吉他和风放进来。'),
    s('pop-rock', '流行摇滚', 'Pop Rock', '100-128', 'A pop-rock single with radio chorus and guitar punch.', 'electric guitar, bass, clap-snare',
      '学流行摇滚高播（海阔天空同类能量，禁止抄句）：主歌写冷风、嘲笑、路上；副歌是人生宣言，但必须承认会怕跌倒。开口喊，第二人称或我们。'),
    s('glam', '华丽摇滚', 'Glam Rock', '108-132', 'A glam-rock stomp with theatrical vocals and a glitter-hook chorus.', 'stomp drums, sax or glam guitar, gang vocals', '学华丽摇滚：舞台夸张，副歌要能跺脚，但不空。'),
    s('emo', '情绪摇滚', 'Emo / Emocore', '90-170', 'An emo-rock song with diary-specific verses and a cracked, yelled chorus.', 'twinkly guitar, driving bass, explosive drums', '学情绪摇滚高播：羞耻地具体（聊天记录、校服、天台），副歌崩喊。禁止抄现成emo成句。')
  ]
);

const JAZZ = g(
  'jazz',
  '爵士乐',
  'Jazz',
  [
    '本分类要摆得动：切分、留白、人声像乐器。',
    '歌词用夜色里的具体座位、杯壁、路灯，不要写成情歌模板。',
    '编曲：walking 或 fretless 贝斯必须当 groove；鼓用 ride/brush 写明；一件铜管或钢琴作应答。禁止 808 流行垫。'
  ].join('\n'),
  { keepFormula: true },
  [
    s('swing', '摇摆乐', 'Swing', '120-180', 'A swinging jazz song with walking bass and playful, syncopated vocals.', 'walking bass, ride cymbal, muted trumpet, piano', '学摇摆乐：字落在摆拍上，短句弹跳，像对舞池讲话。'),
    s('cool', '冷爵士', 'Cool Jazz', '70-110', 'A cool-jazz piece with understated vocals and smoky space.', 'flugelhorn, soft piano, brushed drums', '学冷爵士：少说话，留白即风格。'),
    s('fusion', '融合爵士', 'Jazz Fusion', '90-140', 'A jazz-fusion track with virtuosic groove and a soaring hook.', 'electric piano, slap or fretless bass, tight drums', '学融合爵士：节奏复杂，副歌仍要一句能哼。'),
    s('latin-jazz', '拉丁爵士', 'Latin Jazz', '90-130', 'A latin-jazz song with clave pulse and bright chorus.', 'congas, piano montuno, brass', '学拉丁爵士：身体先动，中文也要唱出clave。'),
    s('acid-jazz', '酸爵士', 'Acid Jazz', '100-120', 'An acid-jazz groove with funky bass and a chilled vocal hook.', 'wah guitar, Hammond, breakbeat', '学酸爵士：懒而酷，副歌像夜店角落的一句。'),
    s('vocal-jazz', '人声爵士', 'Vocal Jazz', '70-110', 'A vocal-jazz standard style with conversational phrasing and a held last note.', 'piano trio, upright bass, brushes', '学爵士标准曲（Fly Me to the Moon同类口语咏唱，禁止抄句）：像对乐队讲话，一句一景，末字拉长。'),
    s('smooth', '流畅爵士', 'Smooth Jazz', '80-108', 'A smooth-jazz radio piece with silky lead and easy chorus.', 'sax, clean guitar, soft keys', '学流畅爵士：顺但不油，画面干净。'),
    s('bebop', '比博普', 'Bebop', '160-220', 'A bebop-inspired piece with rapid turns; keep a singable refrain.', 'alto sax, piano, fast ride', '学bebop：主歌可密，副歌必须减速成一句可唱。'),
    s('free-jazz', '自由爵士', 'Free Jazz', '60-140', 'A free-jazz colored piece with raw vocal bursts and later thematic glue.', 'free drums, sax cries, prepared piano', '学自由爵士：可破碎，副歌要给抓手。'),
    s('new-orleans', '新奥尔良爵士', 'New Orleans Jazz', '100-140', 'A New Orleans jazz street-parade feel with joyful chorus.', 'clarinet, trombone, tuba, snare', '学新奥尔良：游行第二线，词要热、要走。'),
    s('big-band', '大乐队', 'Big Band', '120-180', 'A big-band chart with brass hits and a show-stopping chorus.', 'big-band brass, swing drums, piano', '学大乐队：铜管问答，副歌开。'),
    s('lounge', '沙发爵士', 'Lounge Jazz', '70-100', 'A lounge-jazz piece with late-night velvet vocals.', 'Rhodes, muted trumpet, brushed kit', '学沙发爵士：低声近麦，一杯没喝完的酒。')
  ]
);

const BLUES = g(
  'blues',
  '布鲁斯',
  'Blues',
  [
    '本分类用问答句和重复推进：同一画面换一个细节，而不是换一套空话。',
    '副歌像把苦说成一句能跟唱的话。',
    '编曲：吉他或口琴先问人声再答；shuffle 或 slow 12-bar 律动写进 Arrangement；禁止流行四四拍通铺。'
  ].join('\n'),
  { keepFormula: true },
  [
    s('delta', '三角洲蓝调', 'Delta Blues', '70-90', 'A delta-blues song with raw vocal grain and guitar-call phrases.', 'acoustic slide guitar, stomps, harmonica', '学三角洲蓝调：AAB句式，同一苦换一个细节。像坐在台阶上唱。禁止抄现成蓝调成句。'),
    s('chicago', '芝加哥蓝调', 'Chicago Blues', '80-110', 'A Chicago blues with amplified sting and a shouted refrain.', 'electric guitar, harmonica, shuffle drums', '学芝加哥蓝调：电、挤、小舞台，副歌喊出来。'),
    s('electric', '电声蓝调', 'Electric Blues', '80-120', 'An electric-blues song with sustain guitar answers and belted chorus.', 'overdriven guitar, bass, drums, organ', '学电声蓝调：吉他先问，人声再答。'),
    s('country-blues', '乡村蓝调', 'Country Blues', '72-100', 'A country-blues narrative with dusty roads and a weary hook.', 'acoustic guitar, harmonica, light snare', '学乡村蓝调：走路、火车、借住一晚。'),
    s('jump', '跳跃蓝调', 'Jump Blues', '130-170', 'A jump-blues stomper with horn punches and a danceable chorus.', 'horns, walking bass, shuffle', '学跳跃蓝调：跳起来诉苦。'),
    s('soul-blues', '灵魂蓝调', 'Soul Blues', '70-96', 'A soul-blues ballad with gospel warmth and a held confession line.', 'organ, choir color, slow drums', '学灵魂蓝调：教堂感但不说教，长音坦白。'),
    s('slide', '滑棒吉他蓝调', 'Slide Guitar Blues', '70-100', 'A slide-guitar blues with vocal-like guitar lines and sparse lyrics.', 'slide guitar, stomps, bass', '学滑棒蓝调：人声模仿滑音，长音多。'),
    s('blues-rock', '布鲁斯摇滚', 'Blues Rock', '90-130', 'A blues-rock hybrid with riff verses and a big chorus release.', 'riff guitar, Hammond, rock drums', '学蓝调摇滚：蓝调句子 + 摇滚副歌。')
  ]
);

const FOLK = g(
  'folk',
  '民谣音乐',
  'Folk',
  [
    '本分类学新民谣高播（成都、消愁同类）：像把日记读给吉他听。',
    '地名、食物、公交车、窗口，副歌是那句自己也信的话，最后要落地不要鸡汤。',
    '编曲：主歌几乎只有木吉他+近麦；副歌才加人声叠或手鼓；可加一件 color（口琴/手风琴/二胡）但不抢词。'
  ].join('\n'),
  {},
  [
    s('trad-folk', '传统民歌', 'Traditional Folk', '70-100', 'A traditional-folk styled song with modal melody and communal chorus.', 'acoustic guitar or lute, unison voices', '学传统民歌：质朴可合唱，比兴用眼前山水，少修辞。禁止抄民歌成句。'),
    s('campus', '校园民谣', 'Campus Folk', '72-96', 'A campus-folk song with youthful rooms, bicycles, and a bittersweet chorus.', 'acoustic guitar, harmonica, soft group vocal', '学校园民谣高播：操场、宿舍、借来的车。不要装沧桑。副歌轻轻道别。'),
    s('indie-folk', '独立民谣', 'Indie Folk', '76-104', 'An indie-folk song with close lyrics and a tender chorus bloom.', 'fingerpicked guitar, hush percussion, cello', '学独立民谣：小声但句子锋利，一个抽屉里的物件贯穿。'),
    s('urban-folk', '都市民谣', 'Urban Folk', '78-108', 'An urban-folk song set in apartments, overtime lights, and midnight convenience stores.', 'guitar, lo-fi drums, bass', '学都市民谣：加班灯、便利店、末班车。城市角落，不要田园伪装。'),
    s('new-folk', '新民谣', 'New Folk', '70-100',
      'A contemporary Chinese new-folk song: diary-close verses, hummed chorus. Fingerpicked acoustic guitar as the bed, harmonica or accordion or erhu as ONE color entering at chorus, soft drums late or absent in verse, intimate dry vocal.',
      'fingerpicked acoustic guitar bed, one color (harmonica/accordion/erhu), close dry vocal, soft drums late',
      [
        '词法学新民谣高播（成都、消愁同类），只学结构，禁止抄句。',
        '像把日记读给吉他听。必须有地名或路名、一种食物或酒、一个时间锚点。',
        '副歌可用「一杯敬X」或「和我走一走」这类骨架做排比，最后一句必须自嘲或落地，不要升华成鸡汤。',
        '口语入词，像对一个人说话。'
      ].join('\n')),
    s('protest', '抗议民谣', 'Protest Folk', '80-110', 'A protest-folk song with a specific injustice and a chantable refrain.', 'acoustic guitar, stomps, group vocal', '学抗议民谣：只写一件具体事，副歌让人能跟着说。不空喊正义。'),
    s('folk-rock', '民谣摇滚', 'Folk Rock', '90-120', 'A folk-rock song that walks then kicks into electric chorus.', 'acoustic-electric, drums, bass', '学民谣摇滚：走着走着突然大声。'),
    s('world-folk', '世界民谣', 'World Folk', '80-110', 'A world-folk piece with regional color and a communal hook.', 'regional lute/flute, hand drums, choir', '学世界民谣：一种地方音色，风土细节，不要旅游宣传腔。'),
    s('mountain', '山歌', 'Mountain Song', '70-100', 'A mountain-song with call-and-response and open-air vowels.', 'folk flute, percussion, open vocals', '学山歌对唱：对山喊，长音回声，一问一答。'),
    s('ditty', '小调', 'Ditty / Xiaodiao', '80-110', 'A Chinese ditty with playful short lines and a looping hook.', 'pipa or erhu, light percussion', '学小调：短、俏、可循环，像里巷里哼的。', { catchyHook: true })
  ]
);

const COUNTRY = g(
  'country',
  '乡村音乐',
  'Country',
  [
    '本分类要有尘土和车灯：故事清楚，副歌像一句能在副驾跟着唱的话。',
    '编曲：pedal steel 或 fiddle 必须有角色；木吉他扫弦作 groove；副歌加人和声。禁止电子流行底盘。'
  ].join('\n'),
  { keepFormula: true },
  [
    s('bluegrass', '兰草音乐', 'Bluegrass', '120-180', 'A bluegrass song with fast picking and a high lonesome chorus.', 'banjo, fiddle, mandolin, acoustic bass', '学兰草：快摘、高亮人声，思乡要具体到一封信。'),
    s('western-swing', '西部摇摆', 'Western Swing', '110-150', 'A western-swing dance tune with fiddle fills and a smiling chorus.', 'fiddle, steel guitar, swing drums', '学西部摇摆：舞池、牛仔靴，词要能跳。'),
    s('honky-tonk', '酒吧音乐', 'Honky-Tonk', '90-130', 'A honky-tonk song with bar-light verses and a sing-along chorus.', 'steel guitar, honky piano, snare', '学酒吧乡村：吧台、旧伤、干杯，副歌能跟着喊。'),
    s('southern-rock', '乡土摇滚', 'Southern Rock', '100-140', 'A southern-rock song with twin-guitar pride and a big chorus.', 'twin lead guitars, organ, drums', '学乡土摇滚：公路和倔强。'),
    s('nashville', '纳什维尔之声', 'Nashville Sound', '76-110', 'A Nashville-sound country-pop ballad with polished chorus.', 'steel guitar, piano, warm backing vocals', '学纳什维尔：光滑情歌，仍要一个小镇细节。禁止抄现成乡村成句。'),
    s('outlaw', '叛道乡村', 'Outlaw Country', '80-120', 'An outlaw-country tale with grit vocals and a stubborn refrain.', 'dry guitar, harmonica, spare drums', '学叛道乡村：不认输，具体到车牌和口袋。'),
    s('new-country', '新乡村', 'New Country', '90-124', 'A modern country song with pop-chorus punch and story verses.', 'acoustic-electric, programmed drums, steel color',
      '学新乡村高播：主歌把一件事讲完（车、前任、小镇），副歌像流行钩子，人名或地名可反复当钩。'),
    s('alt-country', '另类乡村', 'Alt-Country', '80-112', 'An alt-country song with dusty poetry and a cracked chorus.', 'twang guitar, lo-fi drums, pedal steel', '学另类乡村：文学一点，但要能唱。'),
    s('country-pop', '乡村流行', 'Country Pop', '96-120', 'A country-pop crossover with a radio chorus.', 'acoustic guitar, pop drums, steel sparkle', '学乡村流行：好记、阳光或苦笑，副歌能上电台。'),
    s('country-rock', '乡村摇滚', 'Country Rock', '100-132', 'A country-rock song with highway drums and a shouted chorus.', 'electric twang, drums, bass', '学乡村摇滚：车窗开着唱。')
  ]
);

const ELECTRONIC = g(
  'electronic',
  '电子音乐',
  'Electronic',
  [
    '本分类用结构制造掉落：[Build-up] [Drop] 必须出现。',
    '歌词服务节奏：Drop 前后字更少，钩子更尖。',
    '编曲：必须写 kick 类型、bass 类型、build（snare roll/riser）和 Drop 后少一层还是加一层。禁止木吉他流行底。'
  ].join('\n'),
  {},
  [
    s('house', '浩室', 'House', '120-128', 'A house track with four-on-the-floor pulse and a vocal hook over the drop.', 'four-on-the-floor, piano stab or vocal chop, bass', '学浩室高播：一句钩子循环贴踢鼓。词极少。禁止抄现成电音成句。'),
    s('techno', '科技舞曲', 'Techno', '128-140', 'A techno piece with hypnotic pulse; lyrics sparse, rhythmic.', 'kick, hi-hat machine, dark bass, atonal stab', '学科技舞曲：字少、机械、重复中微调。'),
    s('trance', '迷幻舞曲', 'Trance', '132-140', 'A trance song with emotional build and a soaring vocal top-line.', 'supersaw, snare roll, sidechain pad, kick', '学迷幻舞曲：预副歌爬升，副歌开口长音。'),
    s('dubstep', '回响贝斯', 'Dubstep', '140', 'A dubstep track with half-time drop and a chant hook.', 'wobble bass, snare, vocal chop', '学回响贝斯：Drop 前后留白，钩子短。'),
    s('dnb', '鼓打贝斯', 'Drum & Bass', '170-176', 'A drum-and-bass song with racing breaks and a sung hook over the roll.', 'breakbeats, sub bass, pad', '学鼓打贝斯：极快鼓点上人声反而拉长。'),
    s('trap-edm', '陷阱音乐', 'Trap', '140-160', 'A trap banger with 808 glide and a terse, chantable chorus.', '808, hi-hat rolls, dark synth', '学陷阱电音：副歌口头禅，中文踩 808。'),
    s('ambient', '氛围音乐', 'Ambient', '60-80', 'An ambient piece with drifting textures and barely-there vocal mist.', 'pads, field recording, slow pulse', '学氛围：词像雾，大量 [Instrumental]。', { instrumentalBias: true, keepFormula: true }),
    s('synth-pop', '合成器流行', 'Synth-Pop', '100-120', 'A synth-pop song with analog lead hooks and a bright chorus.', 'analog lead, arpeggiator, tight drums', '学合成器流行：合成器主旋律和人声钩子抢戏。'),
    s('indie-electronic', '独立电子', 'Indie Electronic', '96-118', 'An indie-electronic song with DIY textures and an intimate chorus.', 'cheap synth, lo-fi beat, guitar color', '学独立电子：有温度，不要说明书。'),
    s('industrial', '工业电子', 'Industrial', '110-140', 'An industrial-electronic piece with metallic hits and barked or chanted hooks.', 'distorted kick, metal hits, harsh synth', '学工业电子：金属、蒸汽、短命令句。'),
    s('electronicore', '电子核', 'Electronicore', '150-180', 'An electronicore track with screamed/sung contrast and a glitchy drop chorus.', 'screams vs clean, glitch, breakdown drums', '学电子核：干净副歌 vs 爆发段，中文副歌仍须可唱。'),
    s('future-bass', '未来贝斯', 'Future Bass', '140-160', 'A future-bass song with chord stabs, vocal chops, and a euphoric drop.', 'chord stabs, vocal chop, snare build, 808', '学 B 站未来贝斯高播：Drop 要甜要亮，人声钩子短，[Build-up] 必须有。')
  ]
);

const HIPHOP = g(
  'hiphop',
  '嘻哈/说唱',
  'Hip-Hop / Rap',
  [
    '本分类允许说唱：主歌密、内部押韵、生活细节要像 B 站高播叙事说唱那样能共鸣。',
    '副歌必须可唱、可跟唱，不要整首歌都是密词。把大情绪落到具体处境（房间、工位、车票、故乡）。',
    '编曲：主歌鼓点干、sample 或钢琴 loop 短；副歌切旋律化（pad/吉他/人声叠）。808 或 boom-bap 二选一写死，不要两套鼓。'
  ].join('\n'),
  { allowRap: true },
  [
    s('old-school', '老派说唱', 'Old-School Rap', '90-100', 'An old-school hip-hop track with boom-bap bounce and a chant chorus.', 'boom-bap drums, sampled horns, vinyl crackle', '学老派说唱：打点清楚，副歌喊麦口号仍要一件具体事。禁止抄现成rap成句。'),
    s('new-school', '新学派', 'New School', '90-140', 'A modern rap song with melodic chorus and tight verse internal rhyme.', 'trap hats, 808, atmospheric pad', '学新学派：主歌内部押韵密，副歌旋律化可跟唱。'),
    s('gangsta', '帮派说唱', 'Gangsta Rap', '90-110', 'A street-narrative rap with hard drums and a grim hook. Keep it story, not empty threat.', 'west-coast or hard drums, bass, keys', '写处境和选择，不要无意义炫耀暴力。'),
    s('hardcore-rap', '硬核说唱', 'Hardcore Rap', '90-120', 'A hardcore rap track with aggressive delivery and a stomped hook.', 'distorted bass, hard snare, sirens color', '咬字狠，副歌仍要一句能跟。'),
    s('conscious', '意识说唱', 'Conscious Rap', '80-100',
      'A conscious-rap song: hometown, labor, dignity, sung refrain. Dry boom-bap or slow 808 in verses, piano or guitar sample loop, bass; chorus switches to sung melody over warmer pad, stacked backing vocal. Do not keep the same drum bed in verse and chorus.',
      'dry verse drums, piano or guitar sample, bass, sung chorus pad, stacked backing vocal',
      [
        '词法学 B 站高播叙事说唱（莫愁乡同类），只学结构，禁止抄句。',
        '主歌用口语密词写当下困境（工位、闹钟、装坚强），内部押韵，不要说教。',
        '副歌切到可唱的梦乡/故乡：具体物件（糖、波浪鼓、石榴、操场），像有人在耳边说话。',
        '现实段与梦境段来回切，结尾被叫醒或人走茶凉。副歌必须能二创合唱。'
      ].join('\n')),
    s('trap-rap', '陷阱说唱', 'Trap Rap', '130-160', 'A trap-rap song with rolling hats and a short, addictive hook.', '808, hi-hats, dark bell', '学陷阱说唱：钩子极短，中文踩 808。主歌可以稍密。'),
    s('alt-hiphop', '另类嘻哈', 'Alternative Hip-Hop', '80-110', 'An alt-hip-hop song with unexpected textures and a sung/rap hybrid chorus.', 'odd samples, live drums or lo-fi beat', '学另类嘻哈：怪一点，副歌仍要抓人。'),
    s('jazz-rap', '爵士说唱', 'Jazz Rap', '85-100', 'A jazz-rap piece with brushed drums and reflective verses.', 'jazz sample, upright or Rhodes, boom-bap', '学爵士说唱：松、摆、思考，副歌哼唱。'),
    s('underground', '地下说唱', 'Underground Rap', '80-96', 'An underground rap song with dense bars and a raw hook.', 'dry drums, sample chop, bass', '学地下说唱：词密不讨好，但要听得见故事。'),
    s('west-coast', '西海岸', 'West Coast', '90-110', 'A west-coast rap/g-funk colored song with laid-back bounce and a sung hook.', 'talkbox or synth lead, bounce drums, bass', '学西海岸：懒、晃、副驾阳光，副歌可唱。'),
    s('east-coast', '东海岸', 'East Coast', '85-100', 'An east-coast rap song with hard drums and intricate internal rhyme.', 'boom-bap, piano loop, snare crack', '学东海岸：密韵、冷画面、硬鼓。'),
    s('southern', '南部说唱', 'Southern Rap', '70-85', 'A southern rap song with syrupy bounce and a chant hook.', 'slow 808, organ, ad-libs', '学南部说唱：慢、沉、钩子口头禅化。'),
    s('melodic-rap', '旋律说唱', 'Melodic Rap', '90-140', 'A melodic-rap song where verses lean sung-rap and the chorus is fully singable.', '808, guitar or pad, auto-tuned lead color', '学旋律说唱：主歌唱着说，副歌完全可唱，中文母音要开。')
  ]
);

const RNB = g(
  'rnb',
  '节奏布鲁斯',
  'R&B',
  [
    '本分类要黏、要气声、要切分。副歌是身体和情绪同时落地的一句。',
    '编曲：近麦气声；Rhodes 或 organ 作床；切分贝斯；副歌叠声与开放元音。禁止民谣扫弦底盘。'
  ].join('\n'),
  {},
  [
    s('soul', '灵魂乐', 'Soul', '70-100', 'A soul song with gospel warmth and a belted, vowel-open chorus.', 'organ, horns, choir, drums', '学灵魂乐高播：从轻声到放开。词要真诚具体，副歌开口长音。'),
    s('funk', '放克', 'Funk', '100-118', 'A funk song with bass-led groove and a chant chorus.', 'slap bass, clav, tight drums, wah', '学放克：低音先走，人声像打击乐，副歌可喊口令。'),
    s('contemporary', '当代R&B', 'Contemporary R&B', '70-100', 'A contemporary R&B slow-jam with intimate verses and a stacked chorus.', '808s, Rhodes, airy synth, soft drums',
      [
        '词法学华语当代 R&B 高播（普通朋友同类推拉，禁止抄句）。',
        '近麦夜聊。主歌像对话，反复定义这段关系（朋友/不是朋友），用切分口语，不要写成情诗。',
        '中文模式不要夹英文口头禅。副歌叠声感用长音表达。'
      ].join('\n')),
    s('neo-soul', '新灵魂乐', 'Neo-Soul', '80-100', 'A neo-soul song with poetic specifics and a smoky chorus.', 'Rhodes, live drums, bass, strings color', '学新灵魂：诗意但要有厨房/地铁等实物。'),
    s('alt-rnb', '另类R&B', 'Alternative R&B', '70-110', 'An alt-R&B piece with shadowy textures and a fragile-then-wide chorus.', 'dark pad, distorted vocal color, sparse drums', '学另类R&B：破碎、空间大，副歌突然近。'),
    s('doo-wop', '嘟·喔普', 'Doo-Wop', '90-130', 'A doo-wop song with group-harmony chorus and streetlight romance.', 'backing vowels as Chinese 哦~, piano, snaps', '学doo-wop：和声衬词用中文哦~、啊~，街灯恋爱。不要英文 oooh。'),
    s('slow-rock', '慢节奏摇滚', 'Slow Jam / Slow Rock', '60-80', 'A slow-jam with late-night bass and a long-held chorus line.', 'slow drums, bass, keys, guitar swell', '学慢摇：黏、长波浪号 ~、近身体。'),
    s('disco', '迪斯科', 'Disco', '110-122', 'A disco song with four-on-the-floor glitter and a joyful chorus.', 'wah guitar, strings, four-on-the-floor, bass octave', '学迪斯科高播（野狼disco同类舞池指令，禁止抄句）：舞池灯，副歌快乐要具体动作。'),
    s('electro-rnb', '电子R&B', 'Electro R&B', '90-120', 'An electro-R&B hybrid with glossy synths and a sticky vocal hook.', 'synth bass, trap hats, airy vocal', '学电子R&B：电子皮肤，灵魂骨头，钩子黏。')
  ]
);

const WORLD = g(
  'world',
  '世界音乐',
  'World Music',
  [
    '本分类用一种地方音色当主角，歌词写当地能看见的风土，不要写成旅游广告。',
    '编曲：一件地方主奏必须 lead（写 pinyin 名）；西方乐器最多当 groove；副歌才融合。禁止大锅烩世界音乐。'
  ].join('\n'),
  {},
  [
    s('latin', '拉丁音乐', 'Latin', '90-128', 'A latin-pop/latin-groove song with percussion-forward chorus.', 'congas, piano, brass, bass', '学拉丁流行高播：身体节奏，中文也要扭，副歌短循环。禁止抄现成西语成句。'),
    s('reggae', '雷鬼', 'Reggae', '70-90', 'A reggae song with offbeat skank and a laid-back singable chorus.', 'skank guitar, bass one-drop, organ', '学雷鬼：后拍劝走下去，具体日子，不要空洞和平口号。'),
    s('african', '非洲音乐', 'African', '90-130', 'An afro-inspired piece with polyrhythm and communal chorus.', 'talking drums, guitar, choir', '学非洲流行合唱：群体感，副歌可合唱。'),
    s('celtic', '凯尔特音乐', 'Celtic', '80-120', 'A celtic-colored song with tin-whistle lift and an anthem chorus.', 'fiddle, whistle, bodhran, guitar', '学凯尔特：风与路，长音像平原。'),
    s('flamenco', '弗拉门戈', 'Flamenco', '90-140', 'A flamenco-styled song with palmas drive and a passionate held line.', 'nylon guitar, palmas, cajon', '学弗拉门戈：掌音、急停、一声拉长。'),
    s('tango', '探戈', 'Tango', '110-130', 'A tango song with dramatic pauses and a fatalistic chorus.', 'bandoneon, violin, piano', '学探戈：停顿即戏剧，词要锋利。'),
    s('andean', '安第斯音乐', 'Andean', '80-110', 'An andean-colored piece with panpipe air and a highland chorus.', 'pan flute, charango, bass drum', '学安第斯：高地风，开口音。'),
    s('indian-classical', '印度古典', 'Indian Classical', '60-120', 'An indian-classical inspired piece with raga color and a late climactic line.', 'sitar or sarod, tabla, tanpura', '学印度古典：慢慢绕，高潮晚到，衬词啊~。', { instrumentalBias: true }),
    s('gagaku-hougaku', '日本邦乐', 'Japanese Hogaku', '60-100', 'A Japanese hogaku-colored piece with space, koto/shakuhachi timbre, and restrained vocal.', 'koto, shakuhachi, taiko color', '学邦乐：留白、一音一世界，词少。'),
    s('se-asia', '东南亚音乐', 'Southeast Asian', '80-120', 'A southeast-asian colored song with metallophone sparkle and a warm chorus.', 'gamelan or bamboo, hand drums, flute', '学东南亚：金属闪光或竹风，副歌热。'),
    s('world-fusion', '世界融合', 'World Fusion', '90-120', 'A world-fusion song that names two traditions in the style box and braids them in the chorus.', 'one traditional lead + modern groove',
      [
        '词法学民族流行高播（可可托海的牧羊人、点歌的人同类），只学结构，禁止抄句。',
        '必须有真实地名与职业（牧羊、养蜂、点歌），像一封等你的信。',
        '副歌点名「我在某地等你」，叙事清楚：相遇、离开、还在等。不要旅游广告腔。',
        '两种传统要听得出，不要大锅烩。'
      ].join('\n'))
  ]
);

export const LYRICS_GENRE_GROUPS = Object.freeze([
  POP, CLASSICAL, ROCK, JAZZ, BLUES, FOLK, COUNTRY, ELECTRONIC, HIPHOP, RNB, WORLD
]);

const GROUP_MAP = new Map(LYRICS_GENRE_GROUPS.map((group) => [group.id, group]));

export function resolveLyricsGenre(groupId, subId) {
  const group = GROUP_MAP.get(groupId) || GROUP_MAP.get(DEFAULT_GENRE_GROUP);
  const sub = group.subs.find((item) => item.id === subId) || group.subs[0];
  return { group, sub, flags: { ...group.flags, ...sub.flags } };
}

export function genreLabel(item, lang = 'zh') {
  if (!item) return '';
  return lang === 'en' ? item.en : item.zh;
}

export function buildGenrePromptSection(groupId, subId) {
  const { group, sub, flags } = resolveLyricsGenre(groupId, subId);
  const lines = [
    `## 歌曲分类：${group.zh} / ${sub.zh}（${group.en} / ${sub.en}）`,
    group.prompt,
    `子类写法：${sub.prompt}`,
    `Global Metadata 必须锁定该子类：${sub.styleEn} BPM ${sub.bpm}。`,
    `Arrangement 必须使用这些编曲锚点（写角色，禁止改成 piano + acoustic guitar + generic strings）：${sub.instruments}。`,
    'style 必须含 Global Metadata、Vocal Details、Arrangement 三段英文。中国乐器写 pinyin 名和 lead/groove/color，国风/古风/中国风必须写 pentatonic。',
    '学习抖音/B站高播的结构、卡点与编曲分层，禁止抄袭现成歌词、歌名、成句或现成旋律名。'
  ];
  if (flags.allowRap) {
    lines.push('本分类允许主歌说唱：内部押韵、生活细节密；副歌仍须可唱、有长音高潮。');
  }
  if (flags.catchyHook) {
    lines.push('本分类允许副歌短句重复作为记忆点，但每段仍要具体动作或物件，禁止无意义乱喊。');
  }
  if (flags.instrumentalBias) {
    lines.push('本分类偏器乐：多用 [Instrumental]、[Build-up]、[Solo]、[Drop]；人声以开口衬词或短咏叹为主，不要硬写满篇流行词。');
  }
  return lines.join('\n');
}
