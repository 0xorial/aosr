import { GlobalSettings } from 'src/setting';

export enum ReviewEnum {
  // Won't
  HARD = 0,
  // passable
  FAIR = 1,
  // Simple
  EASY = 2,
  // not at all
  FORGET = 3,
}

export enum LearnEnum {
  // Simple
  EASY,
  // met
  FAIR,
  // Less likely
  HARD,
  // Won't
  FORGET,
}

// Contains two sub-operations
export abstract class Operation {}

// review operation
export class ReviewOpt extends Operation {
  value: ReviewEnum;
  constructor(value: ReviewEnum) {
    super();
    this.value = value;
  }
}

// learn to operate
export class LearnOpt extends Operation {
  value: LearnEnum;
  constructor(value: LearnEnum) {
    super();
    this.value = value;
  }
}

export interface scheduleCalc {
  get Gap(): moment.Duration;
  get Ease(): number;
}

class LearnInfo {
  IsLearn: boolean;
  IsNew: boolean;
  IsWait: boolean;
}

export interface scheduleArrange {
  get LastTime(): moment.Moment;
  get NextTime(): moment.Moment;
  get LearnedTime(): moment.Moment;
  get LearnInfo(): LearnInfo;
  // Update the review plan according to the operation
  apply(opt: Operation): void;
  // Get the time you need to review next time
  CalcNextTime(opt: ReviewEnum): moment.Moment;
  // Get the progress of learning
  CalcLearnRate(opt: LearnEnum): number;
}

export interface PatternYaml {
  // last study time
  Last: string;
  // Plan your next study time
  Next: string;
  // learning operation record
  Opts: string;
  // Last marked as forgotten, time of last review
  Learned: string | null;
  // The last time it was marked as forgotten, the number of times it was reviewed after that
  LearnedCount: number | null;
  // The schedule yaml format used to read the storage needs to copy the object
  copy(v: PatternYaml): void;
}

export interface PatternSchedule extends scheduleCalc, scheduleArrange, PatternYaml {}

export function NewSchedule(id: string) {
  return new defaultSchedule(id);
}

// Review information for a pattern
export class defaultSchedule implements PatternSchedule {
  copy(v: PatternYaml) {
    this.Opts = v.Opts;
    this.Last = v.Last;
    this.Next = v.Next;
    this.Learned = v.Learned;
    this.LearnedCount = v.LearnedCount;
  }
  private id: string;
  Last: string;
  Next: string;
  Opts: string;
  Learned: string | null;
  LearnedCount: number | null;
  get LearnedTime(): moment.Moment {
    if (!this.Learned) {
      return this.LastTime;
    }
    return window.moment(this.Learned, 'YYYY-MM-DD HH:mm:ss');
  }
  set LearnedTime(t: moment.Moment) {
    this.Learned = t.format('YYYY-MM-DD HH:mm:ss');
  }
  get LastTime(): moment.Moment {
    if (!this.Last) {
      return window.moment();
    }
    return window.moment(this.Last, 'YYYY-MM-DD HH:mm');
  }
  set LastTime(t: moment.Moment) {
    this.Last = t.format('YYYY-MM-DD HH:mm');
  }
  get NextTime(): moment.Moment {
    if (!this.Next) {
      return window.moment();
    }
    return window.moment(this.Next, 'YYYY-MM-DD HH:mm');
  }
  set NextTime(t: moment.Moment) {
    this.Next = t.format('YYYY-MM-DD HH:mm');
  }
  get OptArr(): ReviewEnum[] {
    let ret: ReviewEnum[] = [];
    for (let c of this.Opts) {
      ret.push(Number(c));
    }
    return ret;
  }
  get Gap(): moment.Duration {
    if (!this.Last) {
      return window.moment.duration(12, 'hours');
    }
    let now = window.moment();
    let gap = window.moment.duration(now.diff(this.LastTime, 'seconds'), 'seconds');
    return gap;
  }
  get ID(): string {
    return this.id;
  }
  apply(opt: Operation) {
    if (opt instanceof ReviewOpt) {
      this.applyReviewResult(opt.value);
    }
    if (opt instanceof LearnOpt) {
      this.applyLearnResult(opt.value);
    }
  }
  constructor(id: string) {
    this.id = id;
    this.Opts = '';
    this.Last = '';
    this.Next = '';
  }
  CalcLearnRate(opt: LearnEnum): number {
    let learnCount = this.getLearnResult(opt);
    return (learnCount + 2) / 4;
  }
  get LearnInfo(): LearnInfo {
    let info = new LearnInfo();
    info.IsNew = this.IsNew;
    info.IsLearn = false;
    info.IsWait = false;
    if (info.IsNew) {
      return info;
    }
    if (!this.Opts) {
    } else if (this.Opts.at(-1) == String(ReviewEnum.EASY)) {
    } else if (this.Opts.at(-1) == String(ReviewEnum.FAIR)) {
    } else if (this.LearnedCount && this.LearnedCount >= 2) {
    } else {
      // Information in medium-term memory does not need to be learned
      // This part will be rescheduled after the medium-term memory is emptied from the memory area
      let checkPoint = window.moment().add(-3, 'hours');
      if (this.LearnedTime.isAfter(checkPoint)) {
        info.IsWait = true;
      } else {
        info.IsLearn = true;
      }
    }
    return info;
  }
  private getLearnResult(opt: LearnEnum) {
    let learnCount = 0;
    if (this.LearnedCount) {
      learnCount = this.LearnedCount;
    }
    if (opt == LearnEnum.FAIR) {
      learnCount++;
    }
    if (opt == LearnEnum.HARD) {
      learnCount--;
    }
    if (opt == LearnEnum.FORGET) {
      learnCount -= 2;
    }
    if (opt == LearnEnum.EASY) {
      learnCount += 2;
    }
    learnCount = Math.max(-2, learnCount);
    learnCount = Math.min(2, learnCount);
    return learnCount;
  }
  private applyLearnResult(opt: LearnEnum) {
    this.LearnedCount = this.getLearnResult(opt);
    this.LearnedTime = window.moment();
  }
  private applyReviewResult(opt: ReviewEnum) {
    let nextTime = this.CalcNextTime(opt);
    this.clearLearn();
    this.NextTime = nextTime;
    this.Opts += opt.toString();
    this.LastTime = window.moment();
  }
  CalcNextTime(opt: ReviewEnum): moment.Moment {
    let duration: moment.Duration;
    if (opt == ReviewEnum.EASY) {
      duration = new easeSchedule(this).calculate();
    } else if (opt == ReviewEnum.FAIR) {
      duration = new fairSchedule(this).calculate();
    } else if (opt == ReviewEnum.HARD) {
      duration = new hardSchedule(this).calculate();
    } else if (opt == ReviewEnum.FORGET) {
      duration = new unknowSchedule(this).calculate();
    } else {
      throw new Error('unknow operation');
    }
    // console.info(`gap ${this.Gap.asDays().toFixed(2)} duration ${duration.asDays().toFixed(2)}`)
    // Superimpose the results of this review on the originally planned next review time
    // Usually NextTime is now, if you review early or late, NextTime may be past and future
    // duration may also be a positive value (indicating that it will be reviewed on a certain day after the planning) and a negative value (indicating that this content needs to advance the time of the next planning, if it is earlier than the current time, it needs to be reviewed immediately)
    let nextTime = this.NextTime.add(duration);
    if (nextTime.unix() < window.moment().unix()) {
      // If you need to review immediately, it means that the review interval has been shortened to below 0
      // This situation means that a Hard is submitted, the time interval is a negative value, and the next time point after being superimposed on the arrangement plan is still in the past
      // At this time, you need to learn immediately, not review and check immediately
      // Because the review detection does not mean that the user has learned and learned (although in many cases, the user can learn and learn at the same time with less pressure during review)
      // Only learning can guarantee that users must learn
      // Assume the user is learning at this point
      // Regardless of whether the user has actually studied or the user has studied during the review process, we will conduct a review test after 3 hours
      nextTime = window.moment().add(3, 'hours');
    }
    return nextTime;
  }
  // clear study results
  private clearLearn() {
    this.LearnedCount = null;
    this.Learned = null;
  }
  get IsNew(): boolean {
    if (this.Last == '') {
      return true;
    }
    return false;
  }
  get Ease(): number {
    // console.info(`opts is ${this.OptArr}`)
    // hardship deduction
    let hardBonus = 0;
    for (let opt of this.OptArr.slice(-20)) {
      if (opt == ReviewEnum.FORGET) {
        hardBonus += 50;
      }
      if (opt == ReviewEnum.HARD) {
        hardBonus += 25;
      }
    }
    // simple reward
    let easeBouns = 0;
    for (let opt of this.OptArr.slice(-20)) {
      if (opt == ReviewEnum.EASY) {
        easeBouns += 25;
      }
    }
    // Too easy
    let easeCount = 0;
    for (let opt of this.OptArr.slice(-2)) {
      if (opt == ReviewEnum.EASY) {
        easeCount++;
      }
    }
    if (easeCount >= 2) {
      easeBouns += 25;
    }
    let ease = GlobalSettings.DefaultEase - hardBonus + easeBouns;
    ease = Math.max(100, ease);
    // console.info(`hardbonus ${hardBonus} easeBonus ${easeBouns} result ease ${ease}`)
    return ease;
  }
}

// Card all review results
export class CardSchedule {
  copy(cardSchedule: CardSchedule) {
    const map1 = new Map(Object.entries(cardSchedule.schedules));
    for (let [k, v] of map1) {
      let schedule = NewSchedule(k);
      schedule.copy(v);
      this.schedules.set(k, schedule);
    }
  }
  public schedules: Map<string, PatternSchedule>;
  constructor() {
    this.schedules = new Map();
  }
  getSchedule(id: string) {
    let parten = this.schedules.get(id);
    if (!parten) {
      parten = NewSchedule(id);
      this.schedules.set(id, parten);
    }
    return parten;
  }
}

abstract class scheduler {
  private _schedule: scheduleCalc;
  constructor(schedule: scheduleCalc) {
    this._schedule = schedule;
  }
  get schedule(): scheduleCalc {
    return this._schedule;
  }
  abstract calculate(): moment.Duration;
}

// Simple Difficulty Calculations
class easeSchedule extends scheduler {
  calculate(): moment.Duration {
    let basesecond = (this.schedule.Gap.asSeconds() * this.schedule.Ease) / 100;
    let addsecond = Number(GlobalSettings.EasyBonus) * 24 * 60 * 60;
    let newdiff = window.moment.duration(basesecond + addsecond, 'seconds');
    return newdiff;
  }
}

// normal difficulty calculation
class fairSchedule extends scheduler {
  calculate(): moment.Duration {
    let basesecond = (this.schedule.Gap.asSeconds() * this.schedule.Ease) / 100;
    let newdiff = window.moment.duration(basesecond, 'seconds');
    return newdiff;
  }
}

// Difficulty calculation
class hardSchedule extends scheduler {
  calculate(): moment.Duration {
    let basesecond = (this.schedule.Gap.asSeconds() * 100) / this.schedule.Ease;
    let newdiff = window.moment.duration(basesecond, 'seconds');
    return newdiff;
  }
}

// no difficulty calculation
class unknowSchedule extends scheduler {
  calculate(): moment.Duration {
    let basesecond = (this.schedule.Gap.asSeconds() * 100) / this.schedule.Ease;
    let addsecond = Number(GlobalSettings.HardBonus) * 24 * 60 * 60;
    let diffsecond = basesecond - addsecond;
    let newdiff = window.moment.duration(diffsecond, 'seconds');
    return newdiff;
  }
}
