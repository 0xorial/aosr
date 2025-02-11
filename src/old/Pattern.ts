import { CardIDTag } from './cardHead';
import { ItemView } from 'obsidian';
import { Operation, PatternSchedule } from './schedule';
import { TagParser } from './tag';
import { Card } from './card';

export type PatternProps = {
  view: ItemView;
  showAns: boolean;
};

// card presentation mode
export abstract class Pattern {
  TagID: string;
  private pcard: Card;
  get schedule(): PatternSchedule {
    return this.card.getSchedule(this.TagID);
  }
  get card(): Card {
    return this.pcard;
  }
  constructor(card: Card, id: string) {
    this.pcard = card;
    this.TagID = id;
  }
  abstract SubmitOpt(opt: Operation): Promise<void>;
  abstract Component(props: PatternProps): JSX.Element;
}

export function prettyText(text: string): string {
  const tags = TagParser.parse(text);
  for (const tag of tags.Tags) {
    if (tag.Head != CardIDTag) {
      continue;
    }
    text = text.replace(tag.Original, '');
  }
  return text;
}
