import { AnnotationWrapper } from 'src/annotationParse';
import { CardIDTag } from 'src/cardHead';
import { TFile } from 'obsidian';
import { TagParser } from 'src/tag';
import { Card, NewCard } from './card';

// search results
export class SearchResult {
  AllCard: Card[];
  SearchName: string;
  constructor() {
    this.AllCard = [];
  }
}

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
    let result = new SearchResult();
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
    let fileText: string = await app.vault.read(note);
    // workaround If there is no extra newline after the last card of the text, the regular expression cannot match
    // fileText += "\n"
    let results = fileText.matchAll(this.matchReg);
    for (let result of results) {
      // match comment segment
      let cardText = result[0];
      let index = result.index || 0;
      let tags = TagParser.parse(result[1]);
      let idTag = tags.findTag(CardIDTag);
      let blockID = idTag?.Suffix || '';
      let annotation = '';
      if (blockID != '') {
        annotation = AnnotationWrapper.findAnnotationWrapper(fileText, blockID);
      }
      let content = result[2];
      let card: Card = NewCard(cardText, content, annotation, blockID, index, note);
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
