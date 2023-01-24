import { TFile } from 'obsidian';
import { TagParser } from './old/tag';
import { CardIDTag } from './old/cardHead';
import { AnnotationWrapper } from './old/annotationParse';
import { Card, NewCard } from './old/card';

export type RepeatItem = {
  question: string;
};

export type Deck = {
  repeatItem: RepeatItem;
  name: string;
};

export async function loadDecks(): Promise<Deck[]> {
  const notes: TFile[] = app.vault.getMarkdownFiles();
  for (const note of notes) {
    await loadDecksFromFile(note);
  }
}

async function loadDecksFromFile(note: TFile) {
  const fileText: string = await app.vault.read(note);
  // workaround If there is no extra newline after the last card of the text, the regular expression cannot match
  // fileText += "\n"
  const results = fileText.matchAll(this.matchReg);
  for (const result of results) {
    // match comment segment
    const cardText = result[0];
    const index = result.index || 0;
    const tags = TagParser.parse(result[1]);
    const idTag = tags.findTag(CardIDTag);
    const blockID = idTag?.Suffix || '';
    let annotation = '';
    if (blockID != '') {
      annotation = AnnotationWrapper.findAnnotationWrapper(fileText, blockID);
    }
    const content = result[2];
    const card: Card = NewCard(cardText, content, annotation, blockID, index, note);
    callback(card);
  }
}

export enum CardType {
  SingleLineBasic,
  SingleLineReversed,
  MultiLineBasic,
  MultiLineReversed,
  Cloze,
}
