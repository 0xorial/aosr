import { AnnotationObject, AnnotationWrapper } from 'src/annotationParse';
import { UpdateCardIDTag } from 'src/cardHead';
import { TFile } from 'obsidian';
import { CardSchedule, PatternSchedule } from 'src/schedule';
import { cyrb53 } from './hash';
import { ParserCollection } from './ParserCollection';
import { Pattern } from './Pattern';

// card
// The card consists of source code and comments,
// The source code is the text of the card, the written content
// Annotation is the supplementary information of the card, which stores additional information
// The card is responsible for storing and parsing the content of the card in the md file
// Including how to define the card's meta information and subsidiary information
export interface Card {
  // Get the file to which the card belongs
  get note(): TFile;
  // Get card ID
  get ID(): string;
  // Get the original string length of the card
  get cardText(): string;
  // Get the source code
  get bodyList(): string[];
  // get card mode
  get patterns(): Pattern[];
  // Get card offset
  get indexBuff(): number;
  // get schedule
  getSchedule(patternID: string): PatternSchedule;
  // update file
  updateFile(info: updateInfo): void;
  // Commit file changes
  commitFile(): Promise<void>;
}

export function NewCard(
  cardText: string,
  content: string,
  annotation: string,
  cardID: string,
  index: number,
  note: TFile
): Card {
  return new defaultCard(cardText, content, annotation, cardID, index, note);
}

// Update original text
class updateInfo {
  updateFunc: (fileText: string) => string;
}

// Implementation of the default card
class defaultCard implements Card {
  annotationWrapperStr: string = '';
  bodyList: string[];
  note: TFile;
  originalID: string = '';
  patterns: Pattern[];
  schedules: CardSchedule;
  indexBuff: number;
  annotationObj: AnnotationObject;
  updateList: updateInfo[];
  cardText: string;
  static bodySplitReg = /((?:^(?!\*{3,}$).+$\n?)+)/gm;
  // 1 is source 2 is comment
  constructor(
    cardText: string,
    content: string,
    annotationWrapperStr: string,
    cardID: string,
    index: number,
    note: TFile
  ) {
    this.updateList = [];
    this.indexBuff = index;
    this.cardText = cardText || '';
    this.bodyList = [];
    let matchResults = content.matchAll(defaultCard.bodySplitReg);
    for (let result of matchResults) {
      this.bodyList.push(result[0]);
    }
    this.annotationWrapperStr = annotationWrapperStr || '';
    this.note = note;
    this.originalID = cardID || '';
    let annotationStr = AnnotationWrapper.deWrapper(annotationWrapperStr);
    this.initAnnotation(annotationStr);

    let parser = ParserCollection.getInstance();
    this.patterns = parser.Parse(this);
  }
  private initAnnotation(annotationStr: string) {
    this.annotationObj = AnnotationObject.Parse(annotationStr);
    this.schedules = this.annotationObj.cardSchedule;
  }
  updateFile(info: updateInfo) {
    this.updateList.push(info);
  }
  getSchedule(patternID: string): PatternSchedule {
    return this.schedules.getSchedule(patternID);
  }
  // ID Prioritize the use of the original ID, when it does not exist, it will be the hash result of the card
  get ID(): string {
    if (this.originalID?.length > 0) {
      return this.originalID;
    }
    return cyrb53(this.cardText, 5);
  }
  // Update comment block content
  private updateAnnotation(fileText: string): string {
    let newAnnotation = AnnotationObject.Stringify(this.annotationObj);
    newAnnotation = AnnotationWrapper.enWrapper(this.ID, newAnnotation);
    if (this.annotationWrapperStr?.length > 0) {
      fileText = fileText.replace(this.annotationWrapperStr, newAnnotation);
    } else {
      if (fileText.at(-1) != '\n') {
        fileText += '\n' + '\n';
      } else if (fileText.at(-2) != '\n') {
        fileText += '\n';
      }
      fileText = fileText + newAnnotation;
    }
    return fileText;
  }
  async commitFile() {
    // Read the original text first
    let fileText = await app.vault.read(this.note);
    if (!fileText.contains(this.cardText)) {
      // If the original text has been changed, it may be that the user changed the original text during the review process
      // If the original text is changed, the original text can no longer be updated, and only if there are original annotations, the annotations can be updated
      console.info('File has been changed, ignore commit original card.');
      // Only update review progress
      if (this.annotationWrapperStr?.length > 0) {
        fileText = this.updateAnnotation(fileText);
      }
    } else {
      // If there is no review block ID, update the review block ID first
      if (this.originalID == '') {
        let index = fileText.indexOf(this.cardText);
        if (index >= 0) {
          fileText = UpdateCardIDTag(this.ID, fileText, index);
        }
      }
      // Updated review block notes to include review progress
      fileText = this.updateAnnotation(fileText);
      // update review block
      for (let updateInfo of this.updateList) {
        fileText = updateInfo.updateFunc(fileText);
      }
      this.updateList = [];
    }
    // Update comment section content
    await app.vault.modify(this.note, fileText);
  }
}
