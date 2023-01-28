import { ParseError, ParseResult } from './parse-result';
import { Position } from './obsidian-context';

function replaceAll(str: string, match: string, replacement: string) {
  return str.split(match).join(replacement);
}

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

export function parseDecks2(text: string, tagPrefix: string): ParseResult {
  const cards: { question: string; answer: string; position: Position; metadata: string; isReverse: boolean }[] = [];
  const errors: ParseError[] = [];
  const lines = breakIntoLines(text);
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
          cards.push({
            question: parts[0],
            answer: parts[1],
            position: { start: line.startOffset, end: line.startOffset + line.content.length },
            metadata: comment ?? '',
            isReverse: false,
          });
          cards.push({
            question: parts[1],
            answer: parts[0],
            position: { start: line.startOffset, end: line.startOffset + line.content.length },
            metadata: comment ?? '',
            isReverse: true,
          });
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
            question: parts[0],
            answer: parts[1],
            position: { start: line.startOffset, end: line.startOffset + line.content.length },
            metadata: comment ?? '',
            isReverse: false,
          });
          comment = null;
        }
      } else if (line.content === '??') {
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
        cards.push({
          position: { start: firstPartMultilineContent[0].startOffset, end: last.startOffset + last.content.length },
          question,
          answer,
          metadata: comment ?? '',
          isReverse: false,
        });
        if (isReverseMultiline) {
          cards.push({
            position: { start: firstPartMultilineContent[0].startOffset, end: last.startOffset + last.content.length },
            answer,
            question,
            metadata: comment ?? '',
            isReverse: true,
          });
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

// taken from https://github.com/st3v3nmw/obsidian-spaced-repetition
export function parseDecks(
  text: string,
  convertHighlightsToClozes = true,
  convertBoldTextToClozes = true,
  convertCurlyBracketsToClozes = true,
  singlelineCardSeparator = '::',
  singlelineReversedCardSeparator = ':::',
  multilineCardSeparator = '?',
  multilineReversedCardSeparator = '??'
): [CardType, string, string, number][] {
  let cardText = '';
  let deckName = '';
  const cards: [CardType, string, number][] = [];
  let cardType: CardType | null = null;
  let lineNo = 0;

  const lines: string[] = replaceAll(text, '\r\n', '\n').split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length === 0) {
      if (cardType) {
        cards.push([cardType, cardText, lineNo]);
        cardType = null;
      }

      cardText = '';
      continue;
    } else if (lines[i].startsWith('<!--') && !lines[i].startsWith('<!--SR:')) {
      while (i + 1 < lines.length && !lines[i].includes('-->')) i++;
      i++;
      continue;
    }

    if (cardText.length > 0) {
      cardText += '\n';
    }
    cardText += lines[i];

    if (lines[i].includes(singlelineReversedCardSeparator) || lines[i].includes(singlelineCardSeparator)) {
      cardType = lines[i].includes(singlelineReversedCardSeparator)
        ? CardType.SingleLineReversed
        : CardType.SingleLineBasic;
      cardText = lines[i];
      lineNo = i;
      if (i + 1 < lines.length && lines[i + 1].startsWith('<!--SR:')) {
        cardText += '\n' + lines[i + 1];
        i++;
      }
      cards.push([cardType, cardText, lineNo]);
      cardType = null;
      cardText = '';
    } else if (
      cardType === null &&
      ((convertHighlightsToClozes && /==.*?==/gm.test(lines[i])) ||
        (convertBoldTextToClozes && /\*\*.*?\*\*/gm.test(lines[i])) ||
        (convertCurlyBracketsToClozes && /{{.*?}}/gm.test(lines[i])))
    ) {
      cardType = CardType.Cloze;
      lineNo = i;
    } else if (lines[i] === multilineCardSeparator) {
      cardType = CardType.MultiLineBasic;
      lineNo = i;
    } else if (lines[i] === multilineReversedCardSeparator) {
      cardType = CardType.MultiLineReversed;
      lineNo = i;
    } else if (lines[i].startsWith('```') || lines[i].startsWith('~~~')) {
      const codeBlockClose = lines[i].match(/`+|~+/)![0];
      while (i + 1 < lines.length && !lines[i + 1].startsWith(codeBlockClose)) {
        i++;
        cardText += '\n' + lines[i];
      }
      cardText += '\n' + codeBlockClose;
      i++;
    }
  }

  if (cardType && cardText) {
    cards.push([cardType, cardText, lineNo]);
  }

  return cards;
}
