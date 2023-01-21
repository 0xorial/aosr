export type TagInfo = {
  Head: string;
  Original: string;
  Suffix?: string;
  SubTag?: TagInfo;
};

// class TagInfo1 {
//   Head: string;
//   Suffix: string;
//   Original: string;
//   SubTag: TagInfo;
//   constructor(original: string, tagstr: string) {
//
//   }
// }

class TagsInfo {
  Tags: TagInfo[];

  constructor(tags: TagInfo[]) {
    this.Tags = tags;
  }

  findTag(...heads: string[]) {
    for (const tag of this.Tags) {
      let flag = true;
      heads.forEach((value: string, index: number) => {
        let subtag: TagInfo | undefined = tag;
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

function makeTagInfo(original: string, tagstr: string): TagInfo {
  if (tagstr.at(0) == '#') {
    tagstr = tagstr.substring(1);
  }
  if (tagstr.contains('/')) {
    const idx = tagstr.indexOf('/');
    const head = tagstr.slice(0, idx);
    const suffix = tagstr.slice(idx + 1);
    return {
      Original: original,
      Head: head,
      Suffix: suffix,
      SubTag: makeTagInfo(original, suffix),
    };
  } else {
    return {
      Original: original,
      Head: tagstr,
    };
  }
}

export class TagParser {
  static parse(str: string) {
    const tags: TagInfo[] = [];
    const results = str.matchAll(/#[/\w]+/gm);
    for (const result of results) {
      tags.push(makeTagInfo(result[0], result[0]));
    }
    return new TagsInfo(tags);
  }
}
