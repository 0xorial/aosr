import { AnnotationWrapper } from './annotationParse';
import { CardIDTag } from './cardHead';
import { TFile } from 'obsidian';
import { TagParser } from './tag';
import { Card, NewCard } from './card';

// search results
export type SearchResult = {
  AllCard: Card[];
  SearchName: string;
};

// The card finder is responsible for searching for possible cards
export interface cardSearcher {
  search(file?: TFile): Promise<SearchResult>;
}

export function NewCardSearch(tagName?: string): cardSearcher {
  return new defaultCardSearch(tagName);
}

// Default Card Search
// Search from the line at the beginning of the tag to the end of the paragraph, and the content of this area is regarded as the content of the card
class defaultCardSearch implements cardSearcher {
  private tagName = 'Q';
  // Matches all tags starting with the line up to the end of the paragraph
  private defaultRegText = String.raw`(^#tagName\b.*)\n((?:^.+$\n?)+)`;
  private matchReg: RegExp;

  async search(file?: TFile): Promise<SearchResult> {
    const result: SearchResult = { AllCard: [], SearchName: '' };
    result.SearchName = '#' + this.tagName;
    if (file) {
      await this.walkFileCard(file, (card) => {
        result.AllCard.push(card);
      });
    } else {
      await this.walkVaultFile(async (note) => {
        await this.walkFileCard(note, (card) => {
          result.AllCard.push(card);
        });
      });
    }
    return result;
  }

  async walkVaultFile(callback: (note: TFile) => Promise<void>) {
    const notes: TFile[] = app.vault.getMarkdownFiles();
    for (const note of notes) {
      await callback(note);
    }
  }

  async walkFileCard(note: TFile, callback: (card: Card) => void) {
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

  constructor(tagName?: string) {
    if (tagName) {
      this.tagName = tagName;
    }
    this.defaultRegText = this.defaultRegText.replace('tagName', this.tagName);
    this.matchReg = new RegExp(this.defaultRegText, 'gm');
  }
}
