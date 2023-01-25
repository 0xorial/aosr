import { CardType } from './model';

function replaceAll(str: string, match: string, replacement: string) {
  return str.split(match).join(replacement);
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
): [CardType, string, number][] {
  let cardText = '';
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
