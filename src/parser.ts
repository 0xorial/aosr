import { ParseError, ParseResult } from './parse-result';
import { ItemMetadata, ParsedRepeatItem } from './model';

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

export function reverseCard(i: ParsedRepeatItem): ParsedRepeatItem {
  return {
    ...i,
    answer: i.question,
    question: i.answer,
    questionOffset: i.answerOffset,
    answerOffset: i.questionOffset,
    isReverse: !i.isReverse,
  };
}

export function reversePair(i: Omit<ParsedRepeatItem, 'isReverse'>): [ParsedRepeatItem, ParsedRepeatItem] {
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

function separateMetadata(l: string): { text: string; metadata?: string } {
  const srStart = l.indexOf('<!--SR');
  const endsWithSr = l.endsWith('-->');
  const commentStart = l.indexOf('%%');

  if (srStart >= 0 && endsWithSr) {
    return { text: l.substring(0, srStart), metadata: l.substring(srStart) };
  }

  if (commentStart >= 0) {
    return { text: l.substring(0, commentStart), metadata: l.substring(commentStart) };
  }

  return { text: l };
}

export function parseDecks2(text: string, tagPrefix: string): ParseResult {
  const cards: ParsedRepeatItem[] = [];
  const errors: ParseError[] = [];
  const lines = breakIntoLines(text);
  if (!lines[0].content.trim().startsWith(`#${tagPrefix}`)) {
    return { decks: [], errors: [] };
  }

  lines.splice(0, 1);
  let state: 'free-text' | 'multiline-card-end' = 'free-text';
  let isReverseMultiline = false;
  let firstPartMultilineContent: LineWithPos[] = [];
  let secondPartMultilineContent: LineWithPos[] = [];
  let cardsWaitingForMetadata = [];
  for (const line of lines) {
    const { text, metadata } = separateMetadata(line.content);
    if (cardsWaitingForMetadata.length > 0) {
      if (metadata) {
        for (const newCard of cardsWaitingForMetadata) {
          cards.push({ ...newCard, metadata: newCard.metadata ?? metadata });
        }
        cardsWaitingForMetadata = [];
        continue;
      }
    }
    if (state === 'free-text') {
      const hasDoubleSplit = stringContains(text, '::');
      const hasTripleSplit = stringContains(text, ':::');
      if (hasTripleSplit) {
        const separatorOffset = text.indexOf(':::');
        const parts = text.split(':::');
        if (parts.length !== 2) {
          errors.push({
            start: line.startOffset,
            end: line.startOffset + text.length,
            message: 'Multiple separators found in the line',
          });
        } else {
          cardsWaitingForMetadata.push(
            ...reversePair({
              questionOffset: line.startOffset,
              question: parts[0],
              answerOffset: line.startOffset + separatorOffset + 3,
              answer: parts[1],
              position: { start: line.startOffset, end: line.startOffset + text.length },
              metadata,
            })
          );
        }
      } else if (hasDoubleSplit) {
        const parts = text.split('::');
        if (parts.length !== 2) {
          errors.push({
            start: line.startOffset,
            end: line.startOffset + text.length,
            message: 'Multiple separators found in the line',
          });
        } else {
          const separatorOffset = text.indexOf('::');
          cardsWaitingForMetadata.push({
            questionOffset: line.startOffset,
            question: parts[0],
            answerOffset: line.startOffset + separatorOffset + 2,
            answer: parts[1],
            position: { start: line.startOffset, end: line.startOffset + text.length },
            metadata,
            isReverse: false,
          });
        }
      } else if (text === '?') {
        state = 'multiline-card-end';
        isReverseMultiline = false;
      } else if (text === '??') {
        state = 'multiline-card-end';
        isReverseMultiline = true;
      } else {
        firstPartMultilineContent.push(line);
      }
    } else if (state === 'multiline-card-end') {
      if (line.content === '' || metadata) {
        if (text !== '') {
          secondPartMultilineContent.push({ content: text, startOffset: line.startOffset });
        }
        addPendingMultilineCard(metadata);
        firstPartMultilineContent = [];
        secondPartMultilineContent = [];
        state = 'free-text';
      } else {
        secondPartMultilineContent.push(line);
      }
    }
  }

  function addPendingMultilineCard(line?: string) {
    const last = secondPartMultilineContent[secondPartMultilineContent.length - 1];
    const question = firstPartMultilineContent.map((x) => x.content).join('\n');
    const answer = secondPartMultilineContent.map((x) => x.content).join('\n');
    const card: ParsedRepeatItem = {
      position: { start: firstPartMultilineContent[0].startOffset, end: last.startOffset + last.content.length },
      question,
      answer,
      metadata: line,
      isReverse: false,
      questionOffset: firstPartMultilineContent[0].startOffset,
      answerOffset: secondPartMultilineContent[0].startOffset,
    };
    cards.push(card);
    if (isReverseMultiline) {
      cards.push(reverseCard(card));
    }
  }

  if (state === 'multiline-card-end') {
    addPendingMultilineCard();
  }

  cards.push(...cardsWaitingForMetadata);

  if (errors.length > 0) {
    return { decks: cards, errors };
  }

  return { decks: cards };
}

export function tryParseMetadata(s: string): ItemMetadata | null {
  if (s.startsWith('<!--SR')) {
    return null;
  }
  if (s.startsWith('%%')) {
    const payload = s.substring(2);
    const parts = payload.split(',');
    if (parts[0] !== '1') {
      throw new Error();
    }
    parts.splice(0, 1);
    const answers = parts.map((x) => {
      const ps = x.split(':');
      if (ps.length !== 2) throw new Error();
      return { time: new Date(parseInt(ps[0])), answer: parseLearnCode(parseInt(ps[1])) };
    });
    return { answers };
  }

  return null;
}

type LearnCode = ItemMetadata['answers'][number]['answer'];
type LearnCodeValue = 1 | 2 | 3;
export function getLearnCode(l: LearnCode): LearnCodeValue {
  if (l === 'show-again') return 1;
  if (l === 'remembered-easy') return 2;
  if (l === 'remembered-hard') return 3;
  return assertNever(l);
}

export function parseLearnCode(l: number): LearnCode {
  if (l === 1) return 'show-again';
  if (l === 2) return 'remembered-easy';
  if (l === 3) return 'remembered-hard';
  throw new Error(l + ' is not a valid learn code.');
}

export function stringifyMetadata(m: ItemMetadata) {
  const answers = m.answers.map((x) => `${x.time.getTime()}:${getLearnCode(x.answer)}`).join(',');
  return `1,${answers}`;
}

export function assertNever(x: never): never {
  throw new Error('Unexpected object: ' + x);
}
