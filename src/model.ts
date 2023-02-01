import { FileType, ObsidianAdapterContextType, Position } from './obsidian-context';
import { parseDecks2 } from './parser';
import { emptyParseResult, mergeParseResults, ParseResult } from './parse-result';

export type ParsedRepeatItem = {
  question: string;
  questionOffset: number;
  answer: string;
  answerOffset: number;
  position: Position;
  metadata?: string;
  isReverse: boolean;
};

export type ItemMetadata = {
  answers: { time: Date; answer: 'show-again' | 'remembered-easy' | 'remembered-hard' }[];
};

export type Deck = {
  repeatItem: ParsedRepeatItem;
  name: string;
};

export type ParseOptions = {
  deckTagPrefix: string;
};

export async function loadDecks(obsidian: ObsidianAdapterContextType, o: ParseOptions): Promise<ParseResult> {
  const notes = obsidian.getMarkdownFiles();
  let result = emptyParseResult;
  for (const note of notes) {
    const fileDecks = await loadDecksFromFile(note, o);
    result = mergeParseResults(result, fileDecks);
  }
  return result;
}

async function loadDecksFromFile(note: FileType, o: ParseOptions): Promise<ParseResult> {
  const tags = note.getTags();
  if (!tags.find((x) => x.name.startsWith(o.deckTagPrefix))) {
    return emptyParseResult;
  }
  const fileText = await note.readFile();
  return parseDecks2(fileText, o.deckTagPrefix);
}
