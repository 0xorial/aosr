import { RepeatItem } from './model';

export type ParseError = { start: number; end: number; message: string };

export type ParseResult = {
  errors: Array<ParseError>;
  decks: Array<{ path: string; items: RepeatItem[] }>;
};

export const emptyParseResult: ParseResult = {
  errors: [],
  decks: [],
};

export function mergeParseResults(r1: ParseResult, r2: ParseResult): ParseResult {
  return {
    decks: r1.decks.concat(r2.decks),
    errors: r1.errors.concat(r2.errors),
  };
}
