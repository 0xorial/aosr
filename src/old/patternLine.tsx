import { Card } from './card';
import { CardIDTag } from './cardHead';
import { cyrb53 } from './hash';
import { PatternParser } from './ParserCollection';
import { Pattern, PatternProps, prettyText } from './Pattern';
import React from 'react';
import { Operation } from './schedule';
import { GlobalSettings } from './setting';
import { TagParser } from './tag';
import { renderMarkdown } from './markdown';
import { NodeContainer } from './nodeContainer';

abstract class linePattern extends Pattern {
  keyText: string;
  front: string;
  back: string;
  originalID: string;
  reverse: boolean;
  constructor(
    card: Card,
    keyText: string,
    front: string,
    back: string,
    originalID: string,
    tagid: string,
    reverse: boolean
  ) {
    super(card, tagid);
    this.front = front;
    this.keyText = keyText;
    this.back = back;
    this.originalID = originalID;
    this.reverse = reverse;
  }
  abstract insertPatternID(): void;
  // interface button click
  async SubmitOpt(opt: Operation): Promise<void> {
    // Calculate the scheduling
    this.card.getSchedule(this.TagID).apply(opt);
    // The ID of the pattern may not necessarily be included in the original text and may need to be updated
    this.insertPatternID();
    // Notification card everything is ready to update the original text
    await this.card.commitFile();
  }
  // display component
  Component = (props: PatternProps): JSX.Element => {
    return (
      <LinePatternComponent
        reverse={this.reverse}
        front={this.front}
        back={this.back}
        path={this.card.note.path}
        patternProps={props}
      ></LinePatternComponent>
    );
  };
}

class singleLinePattern extends linePattern {
  insertPatternID() {
    if (this.originalID) {
      return;
    }
    this.card.updateFile({
      updateFunc: (fileText): string => {
        const newContent = this.keyText + ' ' + this.TagID;
        return fileText.replace(this.keyText, newContent);
      },
    });
  }
}

class multiLinePattern extends linePattern {
  insertPatternID(): void {
    if (this.originalID) {
      return;
    }
    this.card.updateFile({
      updateFunc: (fileText): string => {
        const newContent = `${this.front}? ${this.TagID}\n${this.back}`;
        return fileText.replace(this.keyText, newContent);
      },
    });
  }
}

type singleLinePatternComponentProps = {
  front: string;
  back: string;
  path: string;
  patternProps: PatternProps;
  reverse: boolean;
};

type singleLinePatternComponentState = {
  markdownDivFront: HTMLDivElement;
  markdownDivBack: HTMLDivElement;
};

class LinePatternComponent extends React.Component<singleLinePatternComponentProps, singleLinePatternComponentState> {
  playTTS = async (text: string) => {
    if (GlobalSettings.WordTTSURL.length > 0) {
      const url = GlobalSettings.WordTTSURL.replace('%s', text);
      const audio = new Audio(url);
      await audio.play();
    }
  };
  async componentDidMount() {
    const markdownDivFront = this.state.markdownDivFront;
    markdownDivFront.empty();
    const markdownDivBack = this.state.markdownDivBack;
    markdownDivBack.empty();
    if (this.props.reverse == false) {
      await renderMarkdown(
        prettyText(this.props.front),
        markdownDivFront,
        this.props.path,
        this.props.patternProps.view
      );
      await renderMarkdown(prettyText(this.props.back), markdownDivBack, this.props.path, this.props.patternProps.view);
    } else {
      await renderMarkdown(
        prettyText(this.props.back),
        markdownDivFront,
        this.props.path,
        this.props.patternProps.view
      );
      await renderMarkdown(
        prettyText(this.props.front),
        markdownDivBack,
        this.props.path,
        this.props.patternProps.view
      );
    }
    this.setState({
      markdownDivFront: markdownDivFront,
      markdownDivBack: markdownDivBack,
    });
    // If it is a word, try to call Youdao pronunciation
    let ttstext = '';
    if (this.props.reverse == false) {
      ttstext = this.props.front;
    } else {
      ttstext = this.props.back;
    }
    if (/^[a-zA-Z\s-]+$/.test(ttstext)) {
      setTimeout(() => {
        this.playTTS(ttstext);
      }, 100);
    }
  }
  constructor(props: singleLinePatternComponentProps) {
    super(props);
    this.state = {
      markdownDivFront: createDiv(),
      markdownDivBack: createDiv(),
    };
  }
  render() {
    return (
      <div>
        <NodeContainer node={this.state.markdownDivFront}></NodeContainer>
        <br></br>
        {this.props.patternProps.showAns && <NodeContainer node={this.state.markdownDivBack}></NodeContainer>}
        <br></br>
      </div>
    );
  }
}

export class SingleLineParser implements PatternParser {
  Parse(card: Card): Pattern[] {
    const reg = /^(.+?)(::+)(.+?)$/gm;
    const results: Pattern[] = [];
    for (const body of card.bodyList) {
      for (let i = 0; i < 10000; i++) {
        const regArr = reg.exec(body);
        if (regArr == null) {
          break;
        }
        if (regArr[2].length == 2) {
          const newID = `#${CardIDTag}/${card.ID}/s/${cyrb53(regArr[0], 4)}`;
          const tagInfo = TagParser.parse(regArr[0]);
          const originalID = tagInfo.findTag(CardIDTag, card.ID, 's')?.Original || '';
          const result = new singleLinePattern(
            card,
            regArr[0],
            regArr[1],
            regArr[3],
            originalID,
            originalID || newID,
            false
          );
          results.push(result);
        }
        if (regArr[2].length == 3) {
          const newIDForward = `#${CardIDTag}/${card.ID}/sf/${cyrb53(regArr[0], 4)}`;
          const newIDReverse = `#${CardIDTag}/${card.ID}/sr/${cyrb53(regArr[0], 4)}`;
          const tagInfo = TagParser.parse(regArr[0]);
          const originalIDForward = tagInfo.findTag(CardIDTag, card.ID, 'sf')?.Original || '';
          const originalIDReverse = tagInfo.findTag(CardIDTag, card.ID, 'sr')?.Original || '';
          const result1 = new singleLinePattern(
            card,
            regArr[0],
            regArr[1],
            regArr[3],
            originalIDForward,
            originalIDForward || newIDForward,
            false
          );
          const result2 = new singleLinePattern(
            card,
            regArr[0],
            regArr[1],
            regArr[3],
            originalIDReverse,
            originalIDReverse || newIDReverse,
            true
          );
          results.push(result1, result2);
        }
      }
    }
    return results;
  }
}

export class MultiLineParser implements PatternParser {
  Parse(card: Card): Pattern[] {
    // Note that gm is not required
    const reg = /^((?:(?!\? ?).+\n)+)\?( #.+)?\n((?:.+\n?)+)$/;
    // captures continuation lines that do not start with ? then captures tabs then captures remaining lines
    const results: Pattern[] = [];
    for (const body of card.bodyList) {
      const regArr = reg.exec(body);
      if (regArr == null) {
        continue;
      }
      const newID = `#${CardIDTag}/${card.ID}/m/${cyrb53(regArr[0], 4)}`;
      const tagInfo = TagParser.parse(regArr[2] || '');
      const originalID = tagInfo.findTag(CardIDTag, card.ID, 'm')?.Original || '';
      const result = new multiLinePattern(
        card,
        regArr[0],
        regArr[1],
        regArr[3],
        originalID,
        originalID || newID,
        false
      );
      results.push(result);
    }
    return results;
  }
}
