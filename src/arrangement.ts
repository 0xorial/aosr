import { NewCardSearch } from 'src/cardSearch';
import { CardsWatcher, NewCardsWatch } from 'src/cardWatcher';
import { Pattern } from 'src/Pattern';

class ArrangementItem {
  Name: string;
  Count: number;
  constructor(name: string, count: number) {
    this.Name = name;
    this.Count = count;
  }
}

export class PatternIter {
  pattern: Pattern;
  index: number;
  total: number;
  constructor(pattern: Pattern, index: number, total: number) {
    this.pattern = pattern;
    this.index = index;
    this.total = total;
  }
}

abstract class ArrangementBase {
  abstract PatternSequence(Name: string): AsyncGenerator<PatternIter, boolean, unknown>;
  abstract ArrangementList(): ArrangementItem[];
}

export class Arrangement implements ArrangementBase {
  private allPattern: Pattern[];
  private newPattern: Pattern[];
  private needReviewPattern: Pattern[];
  private needLearn: Pattern[];
  private wait: Pattern[];
  private watcher: CardsWatcher;
  constructor() {
    this.allPattern = [];
    this.newPattern = [];
    this.needReviewPattern = [];
  }
  async init() {
    const search = NewCardSearch();
    const allcards = await search.search();
    this.allPattern = [];
    this.newPattern = [];
    this.needReviewPattern = [];
    this.watcher = NewCardsWatch(allcards.AllCard);
    for (const card of allcards.AllCard) {
      for (const p of card.patterns) {
        this.allPattern.push(p);
      }
    }
    this.sort();
  }
  ArrangementList(): ArrangementItem[] {
    const retlist: ArrangementItem[] = [];
    if (this.newPattern.length > 0) {
      retlist.push(new ArrangementItem('new', this.newPattern.length));
    }
    if (this.needReviewPattern.length > 0) {
      retlist.push(new ArrangementItem('review', this.needReviewPattern.length));
    }
    if (this.needLearn.length > 0) {
      retlist.push(new ArrangementItem('learn', this.needLearn.length));
    }
    if (this.wait.length > 0) {
      retlist.push(new ArrangementItem('wait', this.wait.length));
    }
    return retlist;
  }
  private sort() {
    const now = window.moment();
    this.newPattern = [];
    this.needReviewPattern = [];
    this.needLearn = [];
    this.wait = [];
    for (const p of this.allPattern) {
      const learnInfo = p.schedule.LearnInfo;
      if (learnInfo.IsNew) {
        this.newPattern.push(p);
      } else if (p.schedule.NextTime.isBefore(now)) {
        this.needReviewPattern.push(p);
      } else if (learnInfo.IsLearn) {
        this.needLearn.push(p);
      } else if (learnInfo.IsWait) {
        this.wait.push(p);
      }
    }
    this.newPattern.sort(() => {
      return 0.5 - Math.random();
    });
    this.needReviewPattern.sort(() => {
      return 0.5 - Math.random();
    });
    this.needLearn.sort((a, b) => {
      if (a.schedule.LearnedTime.isAfter(b.schedule.LearnedTime)) {
        return 1;
      }
      if (a.schedule.LearnedTime.isSame(b.schedule.LearnedTime)) {
        return 0;
      }
      return -1;
    });
  }
  async findLivePattern(p: Pattern): Promise<Pattern | undefined> {
    const liveCard = await this.watcher.getLiveCard(p.card.ID);
    if (!liveCard) {
      return;
    }
    for (const cardp of liveCard.patterns) {
      if (p.TagID == cardp.TagID) {
        return cardp;
      }
    }
    return;
  }
  async *PatternSequence(name: string) {
    if (name == 'review') {
      for (let i = 0; i < this.needReviewPattern.length; i++) {
        const p = this.needReviewPattern[i];
        const cardp = await this.findLivePattern(p);
        if (cardp) {
          yield new PatternIter(cardp, i, this.needReviewPattern.length);
        }
      }
    }
    if (name == 'new') {
      for (let i = 0; i < this.newPattern.length; i++) {
        const p = this.newPattern[i];
        const cardp = await this.findLivePattern(p);
        if (cardp) {
          yield new PatternIter(cardp, i, this.newPattern.length);
        }
      }
    }
    if (name == 'learn') {
      for (let i = 0; i < this.needLearn.length; i++) {
        const p = this.needLearn[i];
        const cardp = await this.findLivePattern(p);
        if (cardp) {
          yield new PatternIter(cardp, i, this.needLearn.length);
        }
      }
    }
    return true;
  }
}
