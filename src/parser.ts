import { ParseError, ParseResult } from './parse-result';
import { RepeatItem } from './model';

export type LineWithPos = {
  content: string;
  // number of characters before the first character of this line
  startOffset: number;
};

export function breakIntoLines(text: string): LineWithPos[] {
  const r: LineWithPos[] = [];
  let i = -1;

  let newLineString = '';

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (i > text.length - 1) {
      break;
    }
    if (newLineString === '') {
      if (text[i] === '\r') {
        r.push({ content: text.substring(0, i), startOffset: 0 });
        if (text[i + 1] === '\n') {
          newLineString = '\r\n';
        } else {
          newLineString = '\r';
        }
      } else if (text[i] === '\n') {
        r.push({ content: text.substring(0, i), startOffset: 0 });
        newLineString = '\n';
      } else {
        i++;
      }
    } else {
      const lineStart = i + newLineString.length;
      i = text.indexOf(newLineString, lineStart);
      if (i < 0) {
        r.push({ content: text.substring(lineStart), startOffset: lineStart });
        break;
      }

      r.push({ content: text.substring(lineStart, i), startOffset: lineStart });
    }
  }

  if (r.length === 0 && text.length !== 0) {
    return [{ content: text, startOffset: 0 }];
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

function stringContains(t: string, s: string) {
  return t.indexOf(s) >= 0;
}

export function parseDecks2(text: string, tagPrefix: string): ParseResult {
  const cards: RepeatItem[] = [];
  const errors: ParseError[] = [];
  const lines = breakIntoLines(text);
  if (!lines[0].content.trim().startsWith(`#${tagPrefix}`)) {
    return { decks: [], errors: [] };
  }

  lines.splice(0, 1);

  let state: 'free-text' | 'multiline-card-start' | 'multiline-card-end' = 'free-text';
  let isReverseMultiline = false;
  let firstPartMultilineContent = [];
  let secondPartMultilineContent = [];
  let comment: string | undefined = undefined;
  for (const line of lines) {
    if (state === 'free-text') {
      const hasDoubleSplit = stringContains(line.content, '::');
      const hasTripleSplit = stringContains(line.content, ':::');
      const isComment = line.content.startsWith('%%');
      if (isComment) {
        comment = line.content;
      } else if (hasTripleSplit) {
        const separatorOffset = line.content.indexOf(':::');
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
              answerOffset: line.startOffset + separatorOffset + 3,
              answer: parts[1],
              position: { start: line.startOffset, end: line.startOffset + line.content.length },
              metadata: comment,
            })
          );
          comment = undefined;
        }
      } else if (hasDoubleSplit) {
        const parts = line.content.split('::');
        if (parts.length !== 2) {
          errors.push({
            start: line.startOffset,
            end: line.startOffset + line.content.length,
            message: 'Multiple separators found in the line',
          });
        } else {
          const separatorOffset = line.content.indexOf('::');
          cards.push({
            questionOffset: line.startOffset,
            question: parts[0],
            answerOffset: line.startOffset + separatorOffset + 2,
            answer: parts[1],
            position: { start: line.startOffset, end: line.startOffset + line.content.length },
            metadata: comment,
            isReverse: false,
          });
          comment = undefined;
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
          metadata: comment,
          isReverse: false,
          questionOffset: firstPartMultilineContent[0].startOffset,
          answerOffset: secondPartMultilineContent[0].startOffset,
        };
        cards.push(card);
        if (isReverseMultiline) {
          cards.push(reverseCard(card));
        }
        comment = undefined;
        firstPartMultilineContent = [];
        secondPartMultilineContent = [];
      } else {
        secondPartMultilineContent.push(line);
      }
    }
  }

  if (errors.length > 0) {
    return { decks: cards, errors };
  }

  return { decks: cards };
}
