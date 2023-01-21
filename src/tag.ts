class TagInfo {
  Head: string;
  Suffix: string;
  Original: string;
  SubTag: TagInfo;
  constructor(original: string, tagstr: string) {
    this.Original = original;
    if (tagstr.at(0) == '#') {
      tagstr = tagstr.substring(1);
    }
    if (tagstr.contains('/')) {
      const idx = tagstr.indexOf('/');
      const head = tagstr.slice(0, idx);
      const suffix = tagstr.slice(idx + 1);
      this.Head = head;
      this.Suffix = suffix;
      this.SubTag = new TagInfo(original, suffix);
    } else {
      this.Head = tagstr;
    }
  }
}

class TagsInfo {
  Tags: TagInfo[];
  constructor(tags: TagInfo[]) {
    this.Tags = tags;
  }
  findTag(...heads: string[]) {
    for (const tag of this.Tags) {
      let flag = true;
      heads.forEach((value: string, index: number) => {
        let subtag = tag;
        for (let i = 0; i < index; i++) {
          subtag = subtag?.SubTag;
        }
        if (subtag?.Head != value) {
          flag = false;
        }
      });
      if (flag) {
        return tag;
      }
    }
  }
}

export class TagParser {
  static parse(str: string) {
    const tags: TagInfo[] = [];
    const results = str.matchAll(/#[/\w]+/gm);
    for (const result of results) {
      tags.push(new TagInfo(result[0], result[0]));
    }
    return new TagsInfo(tags);
  }
}
