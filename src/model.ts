import { FileType, ObsidianAdapterContextType, Position } from './obsidian-context';
import { parseDecks2, tryParseMetadata } from './parser';
import { emptyParseResult, ParseError, ParseResult } from './parse-result';

export type ParsedRepeatItem = {
  question: string;
  questionOffset: number;
  answer: string;
  answerOffset: number;
  position: Position;
  metadata?: string;
  isReverse: boolean;
};

export type RepeatItem = {
  file: FileType;
  metadata: ItemMetadata;
  parsed: ParsedRepeatItem;
};

export type ItemMetadata = {
  answers: { time: Date; answer: 'show-again' | 'remembered-easy' | 'remembered-hard' }[];
};

export type Deck = {
  items: RepeatItem[];
  name: string;
  pendingReview: number;
};

export type ParseOptions = {
  deckTagPrefix: string;
};

export type LoadingError = ParseError & { file: FileType };

export async function loadDecks(
  obsidian: ObsidianAdapterContextType,
  o: ParseOptions
): Promise<{ items: RepeatItem[]; errors: LoadingError[] }> {
  const notes = obsidian.getMarkdownFiles();
  const r: RepeatItem[] = [];
  const errors: LoadingError[] = [];
  for (const note of notes) {
    const fileDecks = await loadDecksFromFile(note, o);
    for (const deck of fileDecks.decks) {
      r.push({
        parsed: deck,
        file: note,
        metadata: (deck.metadata ? tryParseMetadata(deck.metadata) : undefined) ?? { answers: [] },
      });
    }
    if (fileDecks.errors) {
      for (const error of fileDecks.errors) {
        errors.push({ ...error, file: note });
      }
    }
  }
  return { items: r, errors };
}

async function loadDecksFromFile(note: FileType, o: ParseOptions): Promise<ParseResult> {
  const tags = note.getTags();
  if (!tags.find((x) => x.name.startsWith(o.deckTagPrefix))) {
    return emptyParseResult;
  }
  const fileText = await note.readFile();
  return parseDecks2(fileText, o.deckTagPrefix);
}
