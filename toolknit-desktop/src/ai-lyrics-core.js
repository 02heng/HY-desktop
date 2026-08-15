import { buildGenrePromptSection, resolveLyricsGenre } from './ai-lyrics-genres.js';

export const AI_LYRICS_LIMITS = Object.freeze({
  maxPromptChars: 4000,
  maxSourceChars: 12000,
  maxTitleChars: 80,
  maxStyleChars: 2000,
  maxLyricsChars: 8000,
  maxMiniMaxUnits: 3500,
  maxResponseChars: 20000
});

export const AI_LYRICS_COMPLETION = Object.freeze({
  maxTokens: 16384,
  thinking: 'disabled',
  frequencyPenalty: 0.5,
  timeoutMs: 180000
});

export const AI_LYRICS_TYPES = Object.freeze(['original', 'story', 'character', 'scene']);

export const AI_LYRICS_LANGUAGES = Object.freeze(['zh', 'en', 'mixed']);

export const LYRICS_PROJECT_MAX_FILE_BYTES = 1024 * 1024;

export const MINIMAX_STRUCTURE_TAGS = Object.freeze([
  '[Intro]',
  '[Verse]',
  '[Verse 1]',
  '[Verse 2]',
  '[Pre-chorus]',
  '[Chorus]',
  '[Hook]',
  '[Drop]',
  '[Bridge]',
  '[Solo]',
  '[Build-up]',
  '[Instrumental]',
  '[Breakdown]',
  '[Break]',
  '[Interlude]',
  '[Outro]'
]);

export class AiLyricsError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AiLyricsError';
    this.code = code;
  }
}

const TYPE_LABELS = Object.freeze({
  original: '原创歌曲',
  story: '故事主题曲',
  character: '人物主题曲',
  scene: '场景主题曲'
});

const LANGUAGE_LABELS = Object.freeze({
  zh: '中文歌词',
  en: 'English lyrics',
  mixed: '中英文混搭歌词'
});

function lyricsLanguageRules(language) {
  const label = LANGUAGE_LABELS[language] || LANGUAGE_LABELS.zh;
  if (language === 'en') {
    return [
      `歌词语言：${label}. Sung lyric lines and title must be only English lyrics; do not mix Chinese characters into verses or chorus.`,
      '长短音用 ohhh~ / ahhh~ 或句末波浪号 ~，不要写中文衬词。'
    ];
  }
  if (language === 'mixed') {
    return [
      `歌词语言：${label}。可以在不同段落或同一段内中英对照，但每行仍要可唱。`,
      '长短音可用 啊~ / ohhh~。'
    ];
  }
  return [
    `歌词语言：${label}。只生成中文：title 和可唱歌词行必须全部是中文，不得夹杂英文单词、英文句子、拼音，也不要 yeah / baby / oh / love 一类英文衬词。`,
    '结构标签（如 [Chorus]、[Solo]）可以是英文；歌词行里不要再写任何英文括号标注。',
    '长短音只用中文开口音加标点：啊~ / 哦~ / 呀~，不要写 ohhh、ahhh、yeah。',
    '禁止把一句拆成「词，词，词」。主歌写成完整七字或十字句，副歌写成完整的一句人话。'
  ];
}

function lyricsFormatExample(language) {
  if (language === 'en') {
    return [
      'Full-length example (format only, do not copy lines). Hook first, then verses explain it. Stop only after [Outro]:',
      '[Intro]',
      'the kettle clicks then loses nerve',
      'a coat still hanging by the door',
      '[Verse 1]',
      'rain ticks the window frame tonight',
      'last button on the coat still tight',
      'I count the tiles you used to own',
      'your mug still waits, it does not learn',
      'the landlord painted over that',
      'I almost call, I almost don\'t',
      'the bakery closed, the neon fades',
      'I keep the button, nothing more',
      '[Pre-chorus]',
      'streetlights wake one by one',
      'my voice gets thin, then comes undone',
      'if you turn back I will not run',
      'just leave the coat, just keep the one',
      '[Chorus]',
      'keep the button~ leave the coat',
      'the hallway clock forgets your name',
      'if all we keep is one last flame',
      'then let it burn, then say my name',
      'keep the button~ leave the coat',
      'I learn the dark, I learn to stay',
      '[Verse 2]',
      'the second mug is packed away',
      'I walk the route we used to take',
      'your voicemail still knows how I sound',
      'I leave no message, turn around',
      'the river takes the winter coat',
      'I sold the table, kept the scratch',
      'three years on the button rusts',
      'the hallway clock forgets your name',
      '[Pre-chorus]',
      'streetlights wake one by one',
      'my voice gets thin, then comes undone',
      'if you turn back I will not run',
      'just leave the coat, just keep the one',
      '[Chorus]',
      'keep the button~ leave the coat',
      'the hallway clock forgets your name',
      'if all we keep is one last flame',
      'then let it burn, then say my name',
      'keep the button~ leave the coat',
      'I learn the dark, I learn to stay',
      '[Bridge]',
      'if memory is a rented room',
      'I leave the key, I leave at noon',
      'the scratch remains, the table gone',
      'I button up and walk alone',
      '[Chorus]',
      'keep the button~~ leave the coat',
      'the hallway clock forgets your name',
      'if all we keep is one last flame',
      'then let it burn, then say my name',
      'keep the button~~ leave the coat',
      'I learn the dark, I learn to stay',
      '[Outro]',
      'the kettle never boils again',
      'I pocket rust and walk the night'
    ];
  }
  if (language === 'mixed') {
    return [
      '篇幅示例（只示范行数与完整句，不要照抄。必须写到 [Outro]）：',
      '[Intro]',
      '水壶响了一声又停',
      'a coat still hanging by the door',
      '[Verse 1]',
      '雨点敲着窗沿',
      '外套扣到最后一颗',
      '走廊还挂着你的围巾',
      '瓷砖我一块块数过',
      '杯子还在等没有人',
      '我几乎拨出去',
      '面包店灯已经熄了',
      'I keep the button, nothing more',
      '[Pre-chorus]',
      '街灯一盏盏醒来',
      'my voice gets thin',
      '若你回头我便停',
      'just leave the coat',
      '[Chorus]',
      'keep the button~ leave the coat',
      '空座还在等那一声',
      '若只能留一颗扣',
      '就让它钉在我掌心',
      'keep the button~ leave the coat',
      'the hallway clock forgets your name',
      '[Verse 2]',
      '第二只杯子收进箱',
      '三年后扣子生了锈',
      '你的语音信箱还认得我',
      '我没有留言就挂断',
      '河水拿走那件外套',
      '桌子卖掉划痕还在',
      'the hallway clock forgets your name',
      '我只留下最后一颗扣',
      '[Chorus]',
      'keep the button~ leave the coat',
      '空座还在等那一声',
      '若只能留一颗扣',
      '就让它钉在我掌心',
      'keep the button~ leave the coat',
      'the hallway clock forgets your name',
      '[Bridge]',
      '房东把墙重新刷白',
      '记忆若是一间出租屋',
      '我把钥匙留在中午',
      'I button up and walk alone',
      '[Outro]',
      '水壶再也烧不开',
      'I pocket rust and walk the night'
    ];
  }
  return [
    '篇幅示例（只示范完整句、画面与钩子，不要照抄。必须写到 [Outro]，禁止在第一次 Chorus 后停笔）：',
    '[Intro]',
    '油灯还没灭',
    '衣扣差一颗',
    '[Verse 1]',
    '油灯把人影拉斜',
    '衣扣还差最末颗',
    '戏箱压着未寄信',
    '粉墨沾湿那张纸',
    '帘外脚步停又走',
    '座中空着你的位',
    '我把那声未出口',
    '咬成一枚冷铁钉',
    '[Pre-chorus]',
    '灯花爆开我还唱',
    '满座笑声不是你',
    '你若回头我就停',
    '你不回头我也唱',
    '[Chorus]',
    '你一望啊~我开口',
    '你一笑啊~我噤声',
    '你一走啊~灯还亮',
    '这一折啊~唱给空座',
    '空座啊~还在等',
    '我把那声叹唱透~',
    '[Verse 2]',
    '三年后戏箱开裂',
    '未寄的信被虫咬',
    '妆匣只剩半面镜',
    '盘铃生锈不再响',
    '你把角色换了人',
    '我把尾声唱成钉',
    '钉还钉在旧门上',
    '门上没有你的名',
    '[Pre-chorus]',
    '灯花爆开我还唱',
    '满座笑声不是你',
    '你若回头我就停',
    '你不回头我也唱',
    '[Chorus]',
    '你一望啊~我开口',
    '你一笑啊~我噤声',
    '你一走啊~灯还亮',
    '这一折啊~唱给空座',
    '空座啊~还在等',
    '我把那声叹唱透~',
    '[Bridge]',
    '戏服叠进木箱底',
    '姓名从戏单抹去',
    '锣槌还热人已走',
    '空座还在等那声',
    '[Chorus]',
    '你一望啊~我开口~',
    '你一笑啊~我噤声~',
    '你一走啊~灯还亮~',
    '这一折啊~唱给空座~',
    '空座啊~还在等~~',
    '我把那声叹唱透~~',
    '[Outro]',
    '油灯终于灭',
    '衣扣没人扣'
  ];
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cleanString(value, maxLength, fieldName) {
  if (typeof value !== 'string') {
    throw new AiLyricsError('invalid_result', `${fieldName} must be a string.`);
  }
  if (value.length > maxLength) {
    throw new AiLyricsError('result_too_large', `${fieldName} is too long.`);
  }
  return value.replace(/\u0000/g, '').trim();
}

/** Count only foreground time toward the client abort budget. */
export function isLyricsRequestBackgrounded(doc = globalThis.document) {
  if (!doc) return false;
  if (doc.hidden) return true;
  if (typeof doc.hasFocus === 'function' && !doc.hasFocus()) return true;
  return false;
}

export function advanceLyricsTimeout(remainingMs, elapsedSliceMs, isHidden) {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return 0;
  if (isHidden) return remainingMs;
  const elapsed = Number.isFinite(elapsedSliceMs) && elapsedSliceMs > 0 ? elapsedSliceMs : 0;
  return Math.max(0, remainingMs - elapsed);
}

export function countMiniMaxChars(value) {
  if (typeof value !== 'string' || !value) return 0;
  let units = 0;
  for (const char of value) {
    const code = char.codePointAt(0) || 0;
    units += code >= 0x4e00 && code <= 0x9fff ? 2 : 1;
  }
  return units;
}

export function clipSourceText(value, maxChars = AI_LYRICS_LIMITS.maxSourceChars) {
  if (typeof value !== 'string') return '';
  const text = value.replace(/\u0000/g, '').trim();
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
}

export function resolveLyricsModel(platform, configuredModel) {
  if (platform === 'deepseek') return 'deepseek-v4-flash';
  return typeof configuredModel === 'string' && configuredModel.trim()
    ? configuredModel.trim()
    : 'deepseek-v4-flash';
}

export function validateLyricsInput({ type, language, prompt, sourceText } = {}) {
  if (!AI_LYRICS_TYPES.includes(type)) {
    throw new AiLyricsError('invalid_request', 'Unsupported lyrics type.');
  }
  if (language && !AI_LYRICS_LANGUAGES.includes(language)) {
    throw new AiLyricsError('invalid_request', 'Unsupported lyrics language.');
  }
  const promptText = typeof prompt === 'string' ? prompt.trim() : '';
  const source = typeof sourceText === 'string' ? sourceText.trim() : '';
  if (promptText.length > AI_LYRICS_LIMITS.maxPromptChars) {
    throw new AiLyricsError('input_too_long', 'Prompt is too long.');
  }
  if (source.length > AI_LYRICS_LIMITS.maxSourceChars) {
    throw new AiLyricsError('input_too_long', 'Source document is too long.');
  }
  if (!promptText && !source) {
    throw new AiLyricsError('empty_input', 'Please enter a prompt or upload a document.');
  }
  return { prompt: promptText, sourceText: source };
}

export function buildLyricsSystemPrompt(language = 'zh', type = 'original', groupId, subId) {
  const tags = MINIMAX_STRUCTURE_TAGS.join(' ');
  const { flags } = resolveLyricsGenre(groupId, subId);
  const lines = [
    '你是面向 MiniMax Music 的词曲作者：写可唱的旋律歌词，以及英文风格提示词。',
    '只输出 JSON，不要解释。字段：title、style、lyrics。',
    '先定一句记忆核、3 个看得见的物件、韵脚和主奏，然后直接写满 JSON。不要先写长篇分析。禁止空转、禁止复述任务、禁止写「下面输出」「JSON 如下」，禁止只写半首歌。',
    '只输出一个 JSON 对象，写完即停：不要第二份歌词，不要重复输出同一段 JSON。lyrics 必须是一个字符串，换行写成 \\n，不要在 JSON 字符串里直接断行。',
    '',
    '## style',
    '必须是英文叙述句（不是逗号标签列表）。按 MiniMax Music 3.0 Structured Caption 写成三段，总长仍不超过 2000 字符。对照高播制作来写：主歌近而干（mp），预副歌抬一层（mf），副歌突然变宽变响（ff），桥段抽鼓留主奏，末次副歌更大。',
    'Global Metadata: A [mood/emotion] [BPM] [genre + sub-genre] song. Key/scale (Chinese-related: pentatonic Yu or Gong). Listening scenario (phone speaker / opera-house night / car night drive). Production profile. Dynamic arc mp→mf→ff.',
    'Vocal Details: character timbre; verse close-mic speech-like; chorus open vowels, vibrato, melisma; stacked backing only on the hook. Never write only male/female vocal.',
    'Arrangement 必须按段落写乐器进出，禁止一句“featuring erhu and drums”打发：',
    'Intro: 1 lead color only (e.g. guzheng harmonics or dizi), no full drum kit.',
    'Verse: dry vocal + ONE plucked/groove instrument, mp.',
    'Pre-chorus: add one lift (dizi / snare roll / pad swell), mf.',
    'Chorus: lead instrument doubles the hook (erhu glissando+vibrato or identity riff), drums/bass in, hall or phone-punch width, ff.',
    'Bridge: drums drop, solo or one instrument.',
    'Final chorus: bigger, longer ~ on open vowels.',
    '优先使用当前分类给出的乐器与编曲锚点。中国乐器写 pinyin 名和角色。禁止 piano + acoustic guitar + generic strings，禁止 Asian strings，禁止 trap 808 给古风垫底。备用库：',
    'erhu, jinghu, guzheng, pipa, dizi, xiao, bamboo flute, cello, violin, fretless bass, Rhodes piano, Hammond organ, analog synth, arpeggiator, music box, saxophone, trumpet, harmonica, taiko, cajon, brushed jazz drums, 808, choir, tape hiss, vinyl crackle.',
    'style 金样（只学结构，按当前分类改乐器与场景，不要原样照抄）：',
    'Global Metadata: A theatrical 80 BPM Chinese Gufeng ballad in Yu-mode pentatonic minor, for an opera-house night cut on phone speakers. Production: dry close verses, palatial hall reverb only on chorus, mp to ff.',
    'Vocal Details: Mandarin opera-tinged mezzo, speech-like verses, chorus melisma on 啊/曲/谁, stacked unison on the hook, no English ad-libs.',
    'Arrangement: Intro guzheng harmonics only. Verse pipa + dry vocal. Pre-chorus dizi counter-melody and woodblock lift. Chorus jinghu/erhu LEAD with glissando doubles the hook, palatial drum hits, strings bloom. Bridge erhu solo, drums out. Final chorus bigger, longer ~ .',
    '',
    '## lyrics',
    '对照 MiniMax 官方歌词示例和 Suno Custom Lyrics 的完整篇幅来写，不要写成短演示。',
    '结构标签单独成行。主歌必须写成 [Verse 1]、[Verse 2]。可用标签：',
    tags,
    flags.instrumentalBias
      ? '完整结构：Intro → Instrumental/Verse → Build-up → Chorus → Verse 2 或 Solo → Chorus → Outro。主题再现至少两次；人声段落仍须成句。'
      : '完整结构必须写满：Intro → Verse 1 → Pre-chorus → Chorus → Verse 2 → Pre-chorus → Chorus → Bridge → Chorus → Outro。禁止在第一次 Chorus 后停笔。必须写到 [Outro]。',
    flags.instrumentalBias
      ? '器乐段落可短；若有人声，每段至少 4 行完整句。'
      : '硬性行数：Intro 2-4 行；Verse 1 至少 8 行；Pre-chorus 至少 4 行；Chorus 至少 6 行；Verse 2 至少 8 行且必须推进故事，禁止改写 Verse 1；Bridge 4-6 行；Outro 2-4 行。Chorus 最多三次，后两次可原文照抄，末次长音更满。',
    'MiniMax 计量目标 1200-2400（汉字按 2 计），不得低于 800，上限 3500。不够长就加 Verse 2 的情节和 Bridge 的反转，禁止用反复「啊~」注水。',
    '要出彩：先写副歌那句记忆核，再写主歌去解释它。记忆核必须短、口语、能独立成句、在副歌里至少出现两次。它是物件+动作，不是抒情形容词。惊喜密度：每段至少一个听众猜不到的词。',
    '画面感：每段至少 2 个具体物件和 1 个动作。要能看见、听见或摸到。用「拉链坏了没修」代替「温暖」，用「第七台空调外机开始滴水」代替「等待」。禁止「我看见/我想起/我知道」连排。',
    '每段至少一句金句（意外比喻、身份反转、或把情绪落到一个动作）。下句必须比上句更狠。偶句押韵，副歌优先响韵（ang/an/ao/ai）。',
    '副歌第一句必须能当 8 秒短视频文案。古风主歌严守七言对仗；副歌前三句排比，第四句改成更短的口语钩子收束（A-A-A-B）。',
    '禁止万能抒情词：梦想、远方、心里的光、岁月静好、不负韶华、星辰大海、勇敢、坚强、永远、温柔以待、尘埃落定、心如止水、无尽黑夜、拥抱未来、世界与我、别走远、想你、心还在。',
    '禁止万能画面：月亮、星星、大海、风在飘、泪如雨。禁止美丽的/温柔的/深深的/淡淡的/轻轻的。禁止心是海洋、时间是河、爱是旅行。',
    'Verse 2 必须出现新信息（时间跳转、身份揭晓、物件坏掉、人已不在），听众要听出故事在走。',
    '禁止重复：同一行不得连续重复；Chorus 歌词三次内保持同一记忆核。',
    '长短音只用标点写进歌词，禁止任何英文括号标注。不要写 (short)、(held)、(staccato)、(sustain)、(whispered)、(belt)、(layered vocals)、(Ooh)、(building)、(guitar solo)。',
    '一句一行：每一行都是一句能一口气唱完的完整句子，不要写成「铜镜，映眉，初上妆」这种二字一顿的念白体。',
    '短音靠完整短句收住，不要用顿号把每个词切开。长音只在句中或句末加波浪号：啊~ / 等~。高潮开口音写成 啊~ / 哦~ / ohhh~，需要更长就加长波浪号：啊~~。不要写破折号。',
    '编曲用结构标签表达，例如 [Solo]、[Instrumental]、[Drop]，不要括号英文。',
    flags.allowRap
      ? '主歌可以说唱：每段至少 8 行密词、内部押韵、具体处境；副歌至少 6 行可唱，开口音多、有长音高潮和记忆核。'
      : '主歌把故事唱清楚；副歌把记忆核唱出来，开口音多，高潮句留给长音。不要写成音节密密麻麻的 rap 或说唱腔。',
    flags.catchyHook
      ? '副歌可以短句循环，但整段仍须至少 6 行；钩子要具体，拒绝永远/明天/想你这类空词。'
      : '不要写成口水歌：拒绝空泛口号和陈词（永远/明天/想你/世界空转）。用具体感官细节、意外比喻和可唱的元音。',
    flags.allowRap
      ? '说唱段写在 [Verse 1]/[Verse 2]，可唱高潮写在 [Chorus]/[Hook]。'
      : '仅当用户提示词明确要求 rap/说唱时才写说唱段，且仍须有可唱的副歌高潮与长音。',
    '',
    ...lyricsFormatExample(language),
    '',
    ...lyricsLanguageRules(language),
    buildGenrePromptSection(groupId, subId),
    '汉字在 MiniMax 中按 2 字符计，lyrics 总计量不超过 3500。style 不超过 2000 英文字符。',
    'title 用一个短意象或物件名作歌名（2-6 字为宜），点题即可，不要写成一句口号。',
    '歌词中不必出现歌名，不要为了点题把歌名塞进副歌或每段结尾。不要用现成热歌歌名。用户指定了歌名就用作 title；禁词「轻轻的」只禁形容词，不禁歌名「轻轻」。'
  ];
  if (type === 'original' && !flags.keepFormula) {
    lines.push(
      '原创模式：在当前歌曲分类内部做大胆变体，唱法、乐器与高潮要有辨识度；不要跳到无关曲风。禁止保险盘：随便一套 piano + acoustic guitar + generic strings。'
    );
  }
  return lines.join('\n');
}

export function buildLyricsMessages({
  type = 'original',
  language = 'zh',
  genreGroup,
  genreSub,
  prompt = '',
  sourceText = '',
  sourceName = ''
} = {}) {
  const { prompt: safePrompt, sourceText: safeSource } = validateLyricsInput({
    type,
    language,
    prompt,
    sourceText
  });
  const { group, sub } = resolveLyricsGenre(genreGroup, genreSub);
  const system = buildLyricsSystemPrompt(language, type, group.id, sub.id);

  const userParts = [
    `创作类型：${TYPE_LABELS[type] || TYPE_LABELS.original}`,
    `歌曲分类：${group.zh} / ${sub.zh}`,
    `歌词语言：${LANGUAGE_LABELS[language] || LANGUAGE_LABELS.zh}`,
    `用户提示词：${safePrompt || '（无，请主要依据文档）'}`
  ];
  if (safeSource) {
    userParts.push(`参考文档${sourceName ? `（${sourceName}）` : ''}：\n${safeSource}`);
    if (type === 'character') {
      userParts.push('请抓住人物性格、关系与命运转折写人物主题曲。');
    } else if (type === 'story') {
      userParts.push('请抓住故事主线与核心冲突写故事主题曲。');
    } else if (type === 'scene') {
      userParts.push('请抓住关键场景的画面、时间与情绪写场景主题曲。');
    }
  }
  userParts.push('返回完整 JSON：{"title":"...","style":"...","lyrics":"[Intro]\\n..."}。先写副歌记忆核再写主歌。Verse 1 与 Verse 2 各至少 8 行，Chorus 至少 6 行。style 必须按 Intro/Verse/Pre-chorus/Chorus/Bridge 逐段写编曲与力度（mp/mf/ff）。');

  return [
    { role: 'system', content: system },
    { role: 'user', content: userParts.join('\n\n') }
  ];
}

export function normalizeAiLyricsResult(value) {
  if (!isPlainObject(value)) {
    throw new AiLyricsError('invalid_result', 'AI response is not an object.');
  }
  const title = cleanString(value.title, AI_LYRICS_LIMITS.maxTitleChars, 'Title');
  const style = cleanString(value.style, AI_LYRICS_LIMITS.maxStyleChars, 'Style');
  const lyrics = cleanString(value.lyrics, AI_LYRICS_LIMITS.maxLyricsChars, 'Lyrics');
  if (!title || !style || !lyrics) {
    throw new AiLyricsError('invalid_result', 'Title, style and lyrics are required.');
  }
  if (!/\[[A-Za-z][A-Za-z -]*\]/.test(lyrics)) {
    throw new AiLyricsError('invalid_result', 'Lyrics must include MiniMax structure tags.');
  }
  const miniMaxChars = countMiniMaxChars(lyrics);
  return { title, style, lyrics, miniMaxChars };
}

const ILLEGAL_FOLDER_CHARS = /[\\/:*?"<>|\u0000]/g;
const STRIP_FOLDER_EXT = /\.(?:md|txt|markdown)$/i;

export function hasLyricsProjectContent({ title, style, lyrics } = {}) {
  return [title, style, lyrics].some((value) => typeof value === 'string' && value.trim().length > 0);
}

export const LYRICS_LIBRARY_SUBFOLDER = 'Lyrics';
export const LYRICS_LIBRARY_INDEX_NAME = '.hy-lyrics-index.json';

export function lyricsSaveErrorMessage(error, fallback = '保存失败') {
  if (typeof error === 'string' && error.trim()) return error.trim();
  if (error && typeof error === 'object') {
    for (const key of ['message', 'error', 'msg']) {
      const value = error[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  const text = String(error ?? '').trim();
  if (text && text !== '[object Object]') return text;
  return fallback;
}

export function isLyricsInvokeMissing(error) {
  return /not found|unknown command|does not exist/i.test(lyricsSaveErrorMessage(error, ''));
}

export function normalizeLyricsFileText(value) {
  return String(value ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function sanitizeLyricsFolderName(raw) {
  const source = typeof raw === 'string' ? raw : '';
  const withoutExt = source.replace(STRIP_FOLDER_EXT, '');
  const replaced = withoutExt.replace(ILLEGAL_FOLDER_CHARS, (ch) => (
    ch === '/' || ch === '\\' ? '_' : '_'
  )).replace(/[\u0000-\u001F\u007F]/g, '_');
  const trimmed = replaced.trim().replace(/\.+$/g, '').trim();
  const clipped = trimmed.slice(0, 96);
  return clipped || 'untitled-lyrics';
}

export function lyricsFolderNameFromPath(fullPath) {
  const source = typeof fullPath === 'string' ? fullPath : '';
  const lastSegment = source.replace(/\\/g, '/').split('/').pop() || '';
  return sanitizeLyricsFolderName(lastSegment);
}

export function lyricsLibraryJoin(root, name) {
  const base = String(root || '').replace(/[\\/]+$/, '');
  const child = String(name || '').replace(/^[\\/]+|[\\/]+$/g, '');
  const sep = base.includes('/') && !base.includes('\\') ? '/' : '\\';
  if (!base) return child;
  if (!child) return base;
  return `${base}${sep}${child}`;
}

export function lyricsTitleFromReadme(readme, fallback = 'untitled-lyrics') {
  const text = normalizeLyricsFileText(readme);
  for (const line of text.split('\n')) {
    const heading = line.trim().replace(/^#+\s*/, '').trim();
    if (line.trim().startsWith('#') && heading) return heading;
  }
  const name = typeof fallback === 'string' && fallback.trim() ? fallback.trim() : '';
  return name || 'untitled-lyrics';
}

export function parseLyricsProjectFiles({
  readme = '',
  style = '',
  lyrics = '',
  folderName = ''
} = {}) {
  const fallback = sanitizeLyricsFolderName(folderName);
  return {
    title: lyricsTitleFromReadme(readme, fallback),
    style: normalizeLyricsFileText(style),
    lyrics: normalizeLyricsFileText(lyrics),
    readme: normalizeLyricsFileText(readme)
  };
}

export function bytesToUtf8(bytes) {
  if (typeof bytes === 'string') return normalizeLyricsFileText(bytes);
  if (!bytes) return '';
  const array = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  return normalizeLyricsFileText(new TextDecoder('utf-8', { fatal: false }).decode(array));
}

export function buildLyricsReadme({
  title,
  typeLabel,
  languageLabel,
  genreLabel: genreText,
  prompt,
  sourceName
} = {}) {
  const heading = typeof title === 'string' && title.trim() ? title.trim() : 'untitled-lyrics';
  const type = typeof typeLabel === 'string' && typeLabel.trim() ? typeLabel.trim() : '(empty)';
  const language = typeof languageLabel === 'string' && languageLabel.trim() ? languageLabel.trim() : '(empty)';
  const genre = typeof genreText === 'string' && genreText.trim() ? genreText.trim() : '(empty)';
  const promptBody = typeof prompt === 'string' && prompt.trim() ? prompt.trim() : '(empty)';
  const sourceBody = typeof sourceName === 'string' && sourceName.trim() ? sourceName.trim() : '(none)';
  return [
    `# ${heading}`,
    '',
    `- Type: ${type}`,
    `- Genre: ${genre}`,
    `- Language: ${language}`,
    '',
    '## Prompt',
    '',
    promptBody,
    '',
    '## Source',
    '',
    sourceBody,
    ''
  ].join('\n');
}

function coerceLyricsField(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .filter((line) => typeof line === 'string')
      .join('\n');
  }
  return value;
}

function repairJsonStringControlChars(text) {
  let out = '';
  let inString = false;
  let escape = false;
  for (const ch of text) {
    if (inString) {
      if (escape) {
        out += ch;
        escape = false;
        continue;
      }
      if (ch === '\\') {
        out += ch;
        escape = true;
        continue;
      }
      if (ch === '"') {
        out += ch;
        inString = false;
        continue;
      }
      if (ch === '\n') {
        out += '\\n';
        continue;
      }
      if (ch === '\r') continue;
      if (ch === '\t') {
        out += '\\t';
        continue;
      }
      out += ch;
      continue;
    }
    if (ch === '"') inString = true;
    out += ch;
  }
  return out.replace(/,\s*([}\]])/g, '$1');
}

function extractJsonObject(str) {
  if (typeof str !== 'string' || !str.trim()) return null;
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(str);
  const source = (fenced ? fenced[1] : str).trim();
  const candidates = [source];
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start !== -1 && end > start) {
    candidates.push(source.slice(start, end + 1));
  }
  for (const candidate of candidates) {
    for (const variant of [candidate, repairJsonStringControlChars(candidate)]) {
      try {
        JSON.parse(variant);
        return variant;
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

export function parseAiLyricsResponse(raw) {
  if (typeof raw !== 'string' || raw.length > AI_LYRICS_LIMITS.maxResponseChars) {
    throw new AiLyricsError('result_too_large', 'AI response exceeds the supported size.');
  }
  const jsonStr = extractJsonObject(raw);
  if (!jsonStr) {
    throw new AiLyricsError('invalid_result', 'AI did not return lyrics JSON.');
  }
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new AiLyricsError('invalid_result', 'AI returned invalid lyrics JSON.');
  }
  if (isPlainObject(parsed)) {
    parsed = { ...parsed, lyrics: coerceLyricsField(parsed.lyrics) };
  }
  return normalizeAiLyricsResult(parsed);
}
