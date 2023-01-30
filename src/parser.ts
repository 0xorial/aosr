import { ParseError, ParseResult } from './parse-result';
import { RepeatItem } from './model';

// function replaceAll(str: string, match: string, replacement: string) {
//   return str.split(match).join(replacement);
// }

type LineWithPos = {
  content: string;
  // number of characters before the first character of this line
  startOffset: number;
};

function breakIntoLines(text: string): LineWithPos[] {
  const r: LineWithPos[] = [];
  let i = -1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const lineStart = i;
    i = text.indexOf('\r', i);
    if (i < 0) {
      if (text.length > 0 && r.length === 0) {
        return [{ content: text, startOffset: 0 }];
      }
      return r;
    }

    if (text[i + 1] === '\n') {
      i++;
    }

    r.push({ content: text.substring(lineStart, i), startOffset: lineStart });
  }
  return r;
}

export function reverseCard(i: RepeatItem): RepeatItem {
  return {
    ...i,
    answer: i.question,
    question: i.answer,
    questionOffset: i.answerOffset,
    answerOffset: i.questionOffset,
    isReverse: !i.isReverse,
  };
}

export function reversePair(i: Omit<RepeatItem, 'isReverse'>): [RepeatItem, RepeatItem] {
  const c = { ...i, isReverse: false };
  return [
    c,
    {
      ...reverseCard(c),
    },
  ];
}

export function parseDecks2(text: string, tagPrefix: string): ParseResult {
  const cards: RepeatItem[] = [];
  const errors: ParseError[] = [];
  const lines = breakIntoLines(text);
  if (lines[0].content.trim().startsWith(`#${tagPrefix}`)) {
    return { decks: [], errors: [] };
  }

  let state: 'free-text' | 'multiline-card-start' | 'multiline-card-end' = 'free-text';
  let isReverseMultiline = false;
  let firstPartMultilineContent = [];
  let secondPartMultilineContent = [];
  let comment: string | null = null;
  for (const line of lines) {
    if (state === 'free-text') {
      const hasDoubleSplit = line.content.contains('::');
      const hasTripleSplit = line.content.contains(':::');
      const isComment = line.content.startsWith('%%');
      const separatorOffset = line.content.indexOf(':::');
      if (isComment) {
        comment = line.content;
      } else if (hasTripleSplit) {
        const parts = line.content.split(':::');
        if (parts.length !== 2) {
          errors.push({
            start: line.startOffset,
            end: line.startOffset + line.content.length,
            message: 'Multiple separators found in the line',
          });
        } else {
          cards.push(
            ...reversePair({
              questionOffset: line.startOffset,
              question: parts[0],
              answerOffset: separatorOffset + 3,
              answer: parts[1],
              position: { start: line.startOffset, end: line.startOffset + line.content.length },
              metadata: comment ?? '',
            })
          );
          comment = null;
        }
      } else if (hasDoubleSplit) {
        const parts = line.content.split(':::');
        if (parts.length !== 2) {
          errors.push({
            start: line.startOffset,
            end: line.startOffset + line.content.length,
            message: 'Multiple separators found in the line',
          });
        } else {
          cards.push({
            questionOffset: line.startOffset,
            question: parts[0],
            answerOffset: separatorOffset + 3,
            answer: parts[1],
            position: { start: line.startOffset, end: line.startOffset + line.content.length },
            metadata: comment ?? '',
            isReverse: false,
          });
          comment = null;
        }
      } else if (line.content === '??' || line.content === '?') {
        errors.push({
          start: line.startOffset,
          end: line.startOffset + line.content.length,
          message: 'Missing question',
        });
      } else {
        state = 'multiline-card-start';
        firstPartMultilineContent.push(line);
      }
    } else if (state === 'multiline-card-start') {
      if (line.content === '?') {
        state = 'multiline-card-end';
        isReverseMultiline = true;
      } else if (line.content === '??') {
        isReverseMultiline = false;
      } else {
        firstPartMultilineContent.push(line);
      }
    } else if (state === 'multiline-card-end') {
      if (line.content === '') {
        state = 'multiline-card-end';
        const last = secondPartMultilineContent[secondPartMultilineContent.length - 1];
        const question = firstPartMultilineContent.map((x) => x.content).join('\n');
        const answer = secondPartMultilineContent.map((x) => x.content).join('\n');
        const card: RepeatItem = {
          position: { start: firstPartMultilineContent[0].startOffset, end: last.startOffset + last.content.length },
          question,
          answer,
          metadata: comment ?? '',
          isReverse: false,
          questionOffset: firstPartMultilineContent[0].startOffset,
          answerOffset: secondPartMultilineContent[0].startOffset,
        };
        cards.push(card);
        if (isReverseMultiline) {
          cards.push(reverseCard(card));
        }
        comment = null;
        firstPartMultilineContent = [];
        secondPartMultilineContent = [];
      } else {
        secondPartMultilineContent.push(line);
      }
    }
  }

  return { decks: cards, errors };
}
