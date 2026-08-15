import assert from 'node:assert/strict';
import {
  AI_LYRICS_COMPLETION,
  AI_LYRICS_LIMITS,
  AI_LYRICS_TYPES,
  AiLyricsError,
  buildLyricsMessages,
  buildLyricsReadme,
  buildLyricsSystemPrompt,
  clipSourceText,
  countMiniMaxChars,
  hasLyricsProjectContent,
  lyricsFolderNameFromPath,
  lyricsLibraryJoin,
  lyricsTitleFromReadme,
  normalizeAiLyricsResult,
  normalizeLyricsFileText,
  parseAiLyricsResponse,
  parseLyricsProjectFiles,
  resolveLyricsModel,
  sanitizeLyricsFolderName,
  validateLyricsInput,
  lyricsSaveErrorMessage,
  isLyricsInvokeMissing,
  advanceLyricsTimeout,
  isLyricsRequestBackgrounded,
  LYRICS_LIBRARY_SUBFOLDER
} from '../src/ai-lyrics-core.js';
import { LYRICS_GENRE_GROUPS, resolveLyricsGenre } from '../src/ai-lyrics-genres.js';

assert.ok(AI_LYRICS_TYPES.includes('story'));
assert.equal(AI_LYRICS_COMPLETION.maxTokens, 16384);
assert.equal(AI_LYRICS_COMPLETION.thinking, 'disabled');
assert.equal(AI_LYRICS_COMPLETION.frequencyPenalty, 0.5);
assert.ok(AI_LYRICS_COMPLETION.timeoutMs >= 180000);
assert.equal(countMiniMaxChars('你好'), 4);
assert.equal(countMiniMaxChars('Hi'), 2);
assert.equal(countMiniMaxChars('你A'), 3);

assert.equal(clipSourceText('abc', 2), 'ab');
assert.equal(clipSourceText('short', 100), 'short');

assert.throws(() => validateLyricsInput({ type: 'story', prompt: '', sourceText: '' }), (error) => (
  error instanceof AiLyricsError && error.code === 'empty_input'
));
assert.doesNotThrow(() => validateLyricsInput({ type: 'original', prompt: '夏日海边', sourceText: '' }));

const messages = buildLyricsMessages({
  type: 'character',
  language: 'zh',
  prompt: '女主角独自离开故乡',
  sourceText: '她叫林晚，在雨夜里告别旧城。',
  sourceName: 'novel.txt'
});
assert.equal(messages[0].role, 'system');
assert.match(messages[0].content, /\[Intro\]/);
assert.match(messages[0].content, /A \[mood\/emotion\]/);
assert.match(messages[0].content, /长音/);
assert.match(messages[0].content, /高潮/);
assert.match(messages[0].content, /口水歌/);
assert.match(messages[0].content, /rap/);
assert.match(messages[0].content, /erhu/);
assert.match(messages[0].content, /只输出一个 JSON/);
assert.match(messages[0].content, /禁止重复/);
assert.match(messages[0].content, /空转/);
assert.match(messages[0].content, /不要先写长篇分析/);
assert.match(messages[0].content, /只生成中文/);
assert.match(messages[0].content, /不得夹杂英文单词/);
assert.match(messages[0].content, /禁止任何英文括号标注/);
assert.match(messages[0].content, /波浪号/);
assert.match(messages[0].content, /一句一行/);
assert.match(messages[0].content, /念白体/);
assert.match(messages[0].content, /油灯把人影拉斜/);
assert.match(messages[0].content, /不要写成「铜镜，映眉/);
assert.match(messages[0].content, /歌曲分类：流行音乐 \/ 古风/);
assert.match(messages[0].content, /一场核心隐喻/);
assert.match(messages[0].content, /七言为骨/);
assert.match(messages[0].content, /对仗必须工整/);
assert.match(messages[0].content, /字数必须完全相同/);
assert.match(messages[0].content, /名对名/);
assert.match(messages[0].content, /你X我Y/);
assert.match(messages[0].content, /排比/);
assert.match(messages[0].content, /短意象/);
assert.match(messages[0].content, /不必出现歌名/);
assert.match(messages[0].content, /\[Verse 1\]/);
assert.match(messages[0].content, /\[Verse 2\]/);
assert.match(messages[0].content, /至少 8 行/);
assert.match(messages[0].content, /记忆核/);
assert.match(messages[0].content, /不得低于 800/);
assert.match(messages[0].content, /看得见的物件/);
assert.match(messages[0].content, /Global Metadata/);
assert.match(messages[0].content, /Arrangement/);
assert.match(messages[0].content, /pentatonic/);
assert.match(messages[0].content, /出彩/);
assert.match(messages[0].content, /金句/);
assert.match(messages[0].content, /岁月静好/);
assert.match(messages[0].content, /glissando/);
assert.match(messages[0].content, /编曲锚点/);
assert.match(messages[0].content, /禁止在第一次 Chorus 后停笔/);
assert.match(messages[0].content, /三年后戏箱开裂/);
assert.match(messages[0].content, /戏服叠进木箱底/);
assert.match(messages[0].content, /空座啊~还在等/);
assert.match(messages[0].content, /画面感/);
assert.match(messages[0].content, /惊喜密度/);
assert.match(messages[0].content, /guzheng harmonics/);
assert.match(messages[0].content, /关山酒式/);
assert.match(messages[0].content, /mp→mf→ff/);
assert.match(messages[1].content, /至少 8 行/);
assert.match(messages[1].content, /记忆核/);
assert.match(messages[1].content, /mp\/mf\/ff/);
assert.equal(messages[0].content.includes('兰花指捻红尘'), false);
assert.equal(messages[0].content.includes('如游丝的气息'), false);
assert.match(messages[1].content, /歌曲分类：流行音乐 \/ 古风/);
assert.equal(messages[0].content.includes('(short)'), true);
assert.equal(/\n\(short\)\n/.test(messages[0].content), false);
assert.equal(/\n\(held\)\n/.test(messages[0].content), false);
assert.equal(messages[0].content.includes('原创模式'), false);
assert.match(messages[1].content, /林晚/);
assert.match(messages[1].content, /人物主题曲/);
assert.match(messages[1].content, /中文歌词/);

const originalMessages = buildLyricsMessages({
  type: 'original',
  language: 'zh',
  prompt: '夏日海边'
});
assert.match(originalMessages[0].content, /原创模式/);
assert.match(originalMessages[0].content, /analog synth/);
assert.match(originalMessages[0].content, /古风/);
assert.match(originalMessages[1].content, /原创歌曲/);

const originalSystem = buildLyricsSystemPrompt('en', 'original');
assert.match(originalSystem, /English lyrics/);
assert.match(originalSystem, /only English lyrics/);
assert.match(originalSystem, /原创模式/);
assert.match(originalSystem, /ohhh~/);
assert.match(originalSystem, /禁止任何英文括号标注/);
assert.match(originalSystem, /\[Verse 2\]/);
assert.match(originalSystem, /the hallway clock forgets your name/);
assert.match(originalSystem, /keep the button/);
assert.equal(originalSystem.includes('don\'t drift away'), false);
assert.equal(originalSystem.includes('只生成中文'), false);

const hiphopSystem = buildLyricsSystemPrompt('zh', 'original', 'hiphop', 'conscious');
assert.match(hiphopSystem, /意识说唱/);
assert.match(hiphopSystem, /允许主歌说唱/);
assert.match(hiphopSystem, /梦乡|故乡/);
assert.match(hiphopSystem, /现实/);
assert.equal(hiphopSystem.includes('仅当用户提示词明确要求 rap'), false);
assert.equal(hiphopSystem.includes('闹钟叫醒'), false);

const guofengSystem = buildLyricsSystemPrompt('zh', 'original', 'pop', 'guofeng');
assert.match(guofengSystem, /节气/);
assert.match(guofengSystem, /芒种/);
assert.match(guofengSystem, /对仗必须工整/);
assert.match(guofengSystem, /字数必须完全相同/);
assert.equal(guofengSystem.includes('谓我何求'), false);

const zhongguoSystem = buildLyricsSystemPrompt('zh', 'original', 'pop', 'zhongguofeng');
assert.match(zhongguoSystem, /青花瓷/);
assert.match(zhongguoSystem, /镜像句/);
assert.equal(zhongguoSystem.includes('天青色等烟雨'), false);

const balladSystem = buildLyricsSystemPrompt('zh', 'story', 'pop', 'mandopop-ballad');
assert.match(balladSystem, /告白气球/);
assert.match(balladSystem, /直球/);

const folkSystem = buildLyricsSystemPrompt('zh', 'original', 'folk', 'new-folk');
assert.match(folkSystem, /成都/);
assert.match(folkSystem, /路名/);
assert.equal(folkSystem.includes('走到玉林路'), false);

const acgSystem = buildLyricsSystemPrompt('zh', 'character', 'pop', 'acg');
assert.match(acgSystem, /身份/);
assert.match(acgSystem, /红莲华/);

const kpopSystem = buildLyricsSystemPrompt('zh', 'original', 'pop', 'k-pop');
assert.match(kpopSystem, /钩子重复/);
assert.match(kpopSystem, /中文口令/);

const viralSystem = buildLyricsSystemPrompt('zh', 'story', 'pop', 'viral-hook');
assert.match(viralSystem, /洗脑神曲/);
assert.match(viralSystem, /允许副歌短句重复/);
assert.equal(viralSystem.includes('原创模式'), false);

const classicalSystem = buildLyricsSystemPrompt('zh', 'original', 'classical', 'piano');
assert.match(classicalSystem, /钢琴曲/);
assert.match(classicalSystem, /偏器乐/);

const healingOriginal = buildLyricsSystemPrompt('zh', 'original', 'pop', 'healing');
assert.equal(healingOriginal.includes('原创模式'), false);

const mixedSystem = buildLyricsSystemPrompt('mixed', 'story');
assert.match(mixedSystem, /中英文混搭歌词/);
assert.equal(mixedSystem.includes('只生成中文'), false);

const parsed = parseAiLyricsResponse(`here
\`\`\`json
{"title":"雨夜","style":"A melancholic Mandopop ballad with breathy female vocals.","lyrics":"[Intro]\\n(Ooh)\\n[Verse]\\n雨还在下"}
\`\`\`
`);
assert.equal(parsed.title, '雨夜');
assert.match(parsed.lyrics, /\[Verse\]/);
assert.ok(parsed.miniMaxChars > 0);

const parsedRawNewlines = parseAiLyricsResponse(`{
  "title": "轻轻",
  "style": "A theatrical 80 BPM Chinese Gufeng ballad.",
  "lyrics": "[Intro]
油灯还没灭
[Verse]
雨还在下"
}`);
assert.equal(parsedRawNewlines.title, '轻轻');
assert.match(parsedRawNewlines.lyrics, /油灯还没灭/);
assert.match(parsedRawNewlines.lyrics, /\[Verse\]/);

const parsedArrayLyrics = parseAiLyricsResponse(JSON.stringify({
  title: '轻轻',
  style: 'A theatrical 80 BPM Chinese Gufeng ballad.',
  lyrics: ['[Intro]', '油灯还没灭', '[Verse]', '雨还在下']
}));
assert.equal(parsedArrayLyrics.title, '轻轻');
assert.match(parsedArrayLyrics.lyrics, /\[Intro\]/);
assert.match(parsedArrayLyrics.lyrics, /雨还在下/);

assert.throws(
  () => normalizeAiLyricsResult({ title: 'A', style: 'B', lyrics: 'x'.repeat(AI_LYRICS_LIMITS.maxLyricsChars + 1) }),
  (error) => error instanceof AiLyricsError && error.code === 'result_too_large'
);

assert.equal(resolveLyricsModel('deepseek', 'deepseek-chat'), 'deepseek-v4-flash');
assert.equal(resolveLyricsModel('openai', 'gpt-4o-mini'), 'gpt-4o-mini');

assert.equal(sanitizeLyricsFolderName(''), 'untitled-lyrics');
assert.equal(sanitizeLyricsFolderName('   '), 'untitled-lyrics');
assert.equal(sanitizeLyricsFolderName('雨夜离开'), '雨夜离开');
assert.equal(sanitizeLyricsFolderName('AC/DC 致敬'), 'AC_DC 致敬');
assert.equal(sanitizeLyricsFolderName('a/b\\c:d*e?f"g<h>i|j'), 'a_b_c_d_e_f_g_h_i_j');
assert.equal(sanitizeLyricsFolderName('demo.md'), 'demo');
assert.equal(sanitizeLyricsFolderName('demo.txt'), 'demo');
assert.equal(sanitizeLyricsFolderName('song.markdown'), 'song');
assert.equal(sanitizeLyricsFolderName('ends.'), 'ends');
assert.equal(sanitizeLyricsFolderName(`${'n'.repeat(120)}.md`).length, 96);
assert.equal(lyricsFolderNameFromPath('C:\\HY\\雨夜离开.md'), '雨夜离开');
assert.equal(hasLyricsProjectContent({ title: '', style: '', lyrics: '' }), false);
assert.equal(hasLyricsProjectContent({ title: '  ', style: '', lyrics: '' }), false);
assert.equal(hasLyricsProjectContent({ title: '', style: 'A ballad', lyrics: '' }), true);
assert.equal(normalizeLyricsFileText('a\r\nb\rc'), 'a\nb\nc');

const readme = buildLyricsReadme({
  title: '雨夜离开',
  typeLabel: '原创歌曲',
  languageLabel: '中文',
  genreLabel: '流行音乐 / 古风',
  prompt: '克制、不煽情',
  sourceName: 'novel.txt',
  sourceText: '整本小说正文不应该出现'
});
assert.match(readme, /^# 雨夜离开\n/);
assert.match(readme, /- Type: 原创歌曲\n/);
assert.match(readme, /- Genre: 流行音乐 \/ 古风\n/);
assert.match(readme, /- Language: 中文\n/);
assert.match(readme, /## Prompt\n\n克制、不煽情\n/);
assert.match(readme, /## Source\n\nnovel.txt\n/);
assert.equal(readme.includes('整本小说'), false);

const emptyReadme = buildLyricsReadme({
  title: '',
  typeLabel: '故事主题曲',
  languageLabel: '英文',
  prompt: '  ',
  sourceName: ''
});
assert.match(emptyReadme, /^# untitled-lyrics\n/);
assert.match(emptyReadme, /## Prompt\n\n\(empty\)\n/);
assert.match(emptyReadme, /## Source\n\n\(none\)\n/);

assert.equal(lyricsSaveErrorMessage('Path outside allowed directories', '保存失败'), 'Path outside allowed directories');
assert.equal(lyricsSaveErrorMessage({ message: 'Failed to create lyrics folder' }, '保存失败'), 'Failed to create lyrics folder');
assert.equal(lyricsSaveErrorMessage('', '保存失败'), '保存失败');
assert.equal(lyricsSaveErrorMessage(null, '保存失败'), '保存失败');
assert.equal(isLyricsInvokeMissing('Command save_lyrics_project not found'), true);
assert.equal(isLyricsInvokeMissing('Path outside allowed directories'), false);
assert.equal(LYRICS_LIBRARY_SUBFOLDER, 'Lyrics');
assert.equal(lyricsLibraryJoin('D:\\HY', '雨夜离开'), 'D:\\HY\\雨夜离开');
assert.equal(lyricsLibraryJoin('/home/hy', 'Lyrics'), '/home/hy/Lyrics');
assert.equal(lyricsTitleFromReadme('# 雨夜离开\n\n- Type: 原创', 'x'), '雨夜离开');
assert.equal(parseLyricsProjectFiles({
  readme: '# 雨夜离开\n',
  style: 'A ballad\r\n',
  lyrics: '[Verse]\r\n雨还在下',
  folderName: 'ignored'
}).title, '雨夜离开');
assert.equal(parseLyricsProjectFiles({
  style: 'A ballad',
  lyrics: '[Verse]\n雨',
  folderName: 'untitled-lyrics'
}).title, 'untitled-lyrics');

assert.equal(LYRICS_GENRE_GROUPS.length, 11);
assert.deepEqual(LYRICS_GENRE_GROUPS.map((group) => [group.id, group.subs.length]), [
  ['pop', 16],
  ['classical', 13],
  ['rock', 15],
  ['jazz', 12],
  ['blues', 8],
  ['folk', 10],
  ['country', 10],
  ['electronic', 12],
  ['hiphop', 13],
  ['rnb', 9],
  ['world', 11]
]);
assert.equal(resolveLyricsGenre('nope', 'nope').sub.id, 'gufeng');
assert.equal(resolveLyricsGenre('hiphop', 'conscious').sub.zh, '意识说唱');

assert.equal(advanceLyricsTimeout(180000, 5000, false), 175000);
assert.equal(advanceLyricsTimeout(180000, 5000, true), 180000);
assert.equal(advanceLyricsTimeout(800, 1000, false), 0);
assert.equal(advanceLyricsTimeout(0, 1000, false), 0);
assert.equal(isLyricsRequestBackgrounded({ hidden: true, hasFocus: () => true }), true);
assert.equal(isLyricsRequestBackgrounded({ hidden: false, hasFocus: () => false }), true);
assert.equal(isLyricsRequestBackgrounded({ hidden: false, hasFocus: () => true }), false);

console.log('AI lyrics core regression checks passed');
