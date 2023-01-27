import { RepeatItem } from './model';

export type ParseResult = {
  errors: Array<{ start: number; end: number }>;
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
