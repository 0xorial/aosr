import { CardSchedule } from './schedule';

// import yaml from 'yaml';

export class AnnotationWrapper {
  static defaultRegAnnotation = String.raw`%%[^\%\^]+?%%\n\^blockID`;
  static defaultRegWrapper = /%%\n```YAML\n([\s\S]+?)```\n%%\n\^.+/gm;
  static findAnnotationWrapper(fileText: string, blockID: string) {
    const regAnnotation = this.defaultRegAnnotation.replace('blockID', blockID);
    const matchReg = new RegExp(regAnnotation, 'gm');
    let annotation = '';
    fileText.match(matchReg)?.forEach((value) => {
      annotation = value;
    });
    return annotation;
  }
  static deWrapper(annotation: string): string {
    const results = annotation.matchAll(AnnotationWrapper.defaultRegWrapper);
    for (const result of results) {
      return result[1];
    }
    return '';
  }
  static enWrapper(ID: string, annotation: string): string {
    return '%%\n```YAML\n' + annotation + '```\n%%\n^' + ID;
  }
}

export class AnnotationObject {
  copy(obj: AnnotationObject) {
    this.cardSchedule.copy(obj.cardSchedule);
  }
  cardSchedule: CardSchedule;
  constructor() {
    this.cardSchedule = new CardSchedule();
  }
  static Parse(annotation: string): AnnotationObject {
    if (!annotation) {
      return new AnnotationObject();
    }
    const ret = new AnnotationObject();
    const obj: AnnotationObject = null!; //yaml.parse(annotation);
    ret.copy(obj);
    return ret;
  }
  static Stringify(fmt: AnnotationObject): string {
    return '';
    // const s = yaml.stringify(fmt, (key, value) => {
    //   if (value !== null) return value;
    // });
    // return s;
  }
}
