import { Pattern } from './Pattern';
import { Card } from './card';

// parser collection
export class ParserCollection implements PatternParser {
  private parsers: PatternParser[];
  private static instance: ParserCollection;
  private constructor() {
    this.parsers = [];
  }
  public Parse(card: Card): Pattern[] {
    if (this.parsers.length == 0) {
      throw new Error('No parsers implemented.');
    }
    const tmpResults: Pattern[] = [];
    for (const parser of this.parsers) {
      const results = parser.Parse(card);
      tmpResults.push(...results);
    }
    return tmpResults;
  }
  public static getInstance(): ParserCollection {
    if (!ParserCollection.instance) {
      ParserCollection.instance = new ParserCollection();
    }

    return ParserCollection.instance;
  }
  public registerParser(parser: PatternParser): void {
    this.parsers.push(parser);
  }

  public clean() {
    this.parsers = [];
  }
}
// Card parser parses cards into views
// The card parser is responsible for parsing the card

export interface PatternParser {
  Parse(card: Card): Pattern[];
}
