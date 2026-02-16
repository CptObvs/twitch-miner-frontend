import { LogTone } from './log-line-item';

export interface DisplayLogLine {
  text: string;
  tone: LogTone;
}

function shortTimePrefix(line: string): string {
  const shortBracketMatch = line.match(/^\[(\d{2}\.\d{2}\.\s+\d{2}:\d{2})\]/);
  if (shortBracketMatch) return `[${shortBracketMatch[1]}] `;

  const bracketTimeMatch = line.match(/^\[(\d{2}:\d{2}:\d{2})\]/);
  if (bracketTimeMatch) return `[${bracketTimeMatch[1]}] `;

  const match = line.match(/^(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return '';
  const [, day, month, _year, hour, minute] = match;
  return `[${day}.${month}. ${hour}:${minute}] `;
}

function stripMinerPrefix(line: string): string {
  return line
    .replace(/^\[\d{2}\.\d{2}\.\s+\d{2}:\d{2}\]\s*/, '')
    .replace(/^\[(\d{2}:\d{2}:\d{2})\]\s*/, '')
    .replace(
      /^\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\s+-\s+\w+\s+-\s+.+?\s+-\s+\[[^\]]+\]:\s*/,
      '',
    )
    .replace(/^\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2}\s+-\s+\w+\s+-\s+\[[^\]]+\]:\s*/, '');
}

function splitEmojiPrefix(line: string): { emojiPrefix: string; text: string } {
  const match = line.match(/^(\p{Extended_Pictographic}+)\s+/u);
  if (!match) {
    return { emojiPrefix: '', text: line };
  }

  const [, emoji] = match;
  return {
    emojiPrefix: `${emoji} `,
    text: line.slice(match[0].length),
  };
}

export function extractDateKey(line: string): string | null {
  const datedMatch = line.match(/^(\d{2})\/(\d{2})\/(\d{2})\s+\d{2}:\d{2}:\d{2}/);
  if (!datedMatch) return null;
  const [, day, month, year] = datedMatch;
  return `${day}.${month}.${year}`;
}

interface FormatContext {
  time: string;
  bodyText: string;
  emojiPrefix: string;
}

type LineFormatter = (ctx: FormatContext) => DisplayLogLine | null;

function toneByReason(reason: string): LogTone {
  if (reason === 'CLAIM') return 'accent';
  if (reason === 'WATCH') return 'watch';
  if (reason === 'WATCH_STREAK') return 'streak';
  if (reason === 'RAID') return 'raid';
  return 'success';
}

const LINE_FORMATTERS: LineFormatter[] = [
  (ctx) => {
    const match = ctx.bodyText.match(
      /\+(\d+)\s+→\s+Streamer\(username=([^,]+),[^)]*channel_points=([^)]+)\)\s+-\s+Reason:\s*([A-Z_]+)\./,
    );
    if (!match) return null;
    const [, gained, username, channelPoints, reason] = match;
    const normalizedReason = reason.toUpperCase();
    const prefix = ctx.emojiPrefix || '🚀 ';
    return {
      text: `${ctx.time}${prefix}${normalizedReason} +${gained} • ${username} (${channelPoints})`,
      tone: toneByReason(normalizedReason),
    };
  },
  (ctx) => {
    const match = ctx.bodyText.match(
      /^(WATCH|WATCH_STREAK|CLAIM|RAID|REFUND|PREDICTION)\s+\+(\d+)\s+•\s+([^()]+?)\s+\(([^)]+)\)$/i,
    );
    if (!match) return null;
    const [, reason, gained, username, channelPoints] = match;
    const normalizedReason = reason.toUpperCase();
    const prefix = ctx.emojiPrefix || (normalizedReason === 'RAID' ? '🎭 ' : '🚀 ');
    return {
      text: `${ctx.time}${prefix}${normalizedReason} +${gained} • ${username.trim()} (${channelPoints})`,
      tone: toneByReason(normalizedReason),
    };
  },
  (ctx) => {
    const match = ctx.bodyText.match(/^\+(\d+)\s+•\s+([^()]+?)\s+\(([^)]+)\)$/);
    if (!match) return null;
    const [, gained, username, channelPoints] = match;
    return {
      text: `${ctx.time}${ctx.emojiPrefix || '🚀 '}GAIN +${gained} • ${username.trim()} (${channelPoints})`,
      tone: 'success',
    };
  },
  (ctx) => {
    const match = ctx.bodyText.match(/^(BONUS claim|MOMENT claim)\s+•\s+([^()]+?)\s+\(([^)]+)\)$/i);
    if (!match) return null;
    const [, reason, username, channelPoints] = match;
    const normalizedReason = reason.toUpperCase();
    const prefix = ctx.emojiPrefix || (normalizedReason === 'MOMENT CLAIM' ? '🎬 ' : '🎁 ');
    return {
      text: `${ctx.time}${prefix}${normalizedReason} • ${username.trim()} (${channelPoints})`,
      tone: normalizedReason === 'MOMENT CLAIM' ? 'moment' : 'accent',
    };
  },
  (ctx) => {
    const match = ctx.bodyText.match(
      /Streamer\(username=([^,]+),[^)]*channel_points=([^)]+)\)\s+is\s+(Online|Offline)!/,
    );
    if (!match) return null;
    const [, username, channelPoints, state] = match;
    const defaultPrefix = state === 'Online' ? '🥳 ' : '😴 ';
    return {
      text: `${ctx.time}${ctx.emojiPrefix || defaultPrefix}${state.toUpperCase()} • ${username} (${channelPoints})`,
      tone: state === 'Online' ? 'online' : 'muted',
    };
  },
  (ctx) => {
    const match = ctx.bodyText.match(
      /Claiming the bonus for Streamer\(username=([^,]+),[^)]*channel_points=([^)]+)\)!/,
    );
    if (!match) return null;
    const [, username, channelPoints] = match;
    return {
      text: `${ctx.time}${ctx.emojiPrefix || '🎁 '}BONUS claim • ${username} (${channelPoints})`,
      tone: 'accent',
    };
  },
  (ctx) => {
    const match = ctx.bodyText.match(
      /Claiming the moment for Streamer\(username=([^,]+),[^)]*channel_points=([^)]+)\)!/,
    );
    if (!match) return null;
    const [, username, channelPoints] = match;
    return {
      text: `${ctx.time}${ctx.emojiPrefix || '🎬 '}MOMENT claim • ${username} (${channelPoints})`,
      tone: 'moment',
    };
  },
  (ctx) => {
    const match = ctx.bodyText.match(/Join IRC Chat:\s*(\S+)/);
    if (!match) return null;
    return { text: `${ctx.time}${ctx.emojiPrefix || '💬 '}Join IRC chat • ${match[1]}`, tone: 'default' };
  },
  (ctx) => {
    const match = ctx.bodyText.match(/Joining raid from .* to\s+(\S+)!/);
    if (!match) return null;
    return { text: `${ctx.time}${ctx.emojiPrefix || '🎭 '}Join raid → ${match[1]}`, tone: 'raid' };
  },
  (ctx) => {
    const match = ctx.bodyText.match(/(?:^|\b)Claim\s+Drop\((.*)\)$/i);
    if (!match) return null;

    const payload = match[1];
    const nameMatch = payload.match(/\bname=([^,]+)/);
    const percentMatch = payload.match(/\bpercentage_progress=([^,]+)/);
    const name = nameMatch?.[1]?.trim();
    const percentage = percentMatch?.[1]?.trim();

    if (name && percentage) {
      return { text: `${ctx.time}${ctx.emojiPrefix || '📦 '}DROP claim • ${name} (${percentage})`, tone: 'drop' };
    }
    if (name) {
      return { text: `${ctx.time}${ctx.emojiPrefix || '📦 '}DROP claim • ${name}`, tone: 'drop' };
    }
    return { text: `${ctx.time}${ctx.emojiPrefix}${ctx.bodyText}`, tone: 'drop' };
  },
  (ctx) => {
    if (!/^(Campaign:|Drop:)/.test(ctx.bodyText) && !/^\[[^\]]+\]\s*\d+\s*\/$/.test(ctx.bodyText)) {
      return null;
    }
    return { text: `${ctx.time}${ctx.emojiPrefix}${ctx.bodyText}`, tone: 'drop' };
  },
  (ctx) => {
    if (!/bet|prediction/i.test(ctx.bodyText)) return null;
    return { text: `${ctx.time}${ctx.emojiPrefix}${ctx.bodyText}`, tone: 'prediction' };
  },
  (ctx) => {
    if (!ctx.bodyText.includes('https://www.twitch.tv/activate')) return null;
    return { text: `${ctx.time}Open https://www.twitch.tv/activate`, tone: 'accent' };
  },
  (ctx) => {
    const match = ctx.bodyText.match(/^and\s+enter\s+this\s+code:\s*(\S+)$/i);
    if (!match) return null;
    return { text: `${ctx.time}and enter this code: ${match[1]}`, tone: 'alert' };
  },
  (ctx) => {
    if (!/\berror\b|\bexception\b|\btraceback\b/i.test(ctx.bodyText)) return null;
    return { text: `${ctx.time}${ctx.emojiPrefix}${ctx.bodyText}`, tone: 'danger' };
  },
];

export function formatLogLine(rawLine: string): DisplayLogLine {
  const line = rawLine.trim();
  if (!line) return { text: '', tone: 'muted' };

  const time = shortTimePrefix(line);
  const body = stripMinerPrefix(line);
  const { emojiPrefix, text: bodyText } = splitEmojiPrefix(body);
  const context: FormatContext = { time, bodyText, emojiPrefix };

  for (const formatter of LINE_FORMATTERS) {
    const formatted = formatter(context);
    if (formatted) {
      return formatted;
    }
  }

  return { text: `${time}${emojiPrefix}${bodyText}`, tone: 'default' };
}
