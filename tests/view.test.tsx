import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { Hello } from '../src/test-view';
import { render } from '@testing-library/react';
import { TheApp } from '../src/app';
import { FileType, ObsidianAdapterContextType, Tag } from '../src/obsidian-context';
import { breakIntoLines, LineWithPos } from '../src/parser';

test('<view/>', () => {
  const wrapper = render(<Hello />);
  expect(wrapper.container).toHaveTextContent('Hello world');
});

function splitMeasured(s: string, w: string, offset = 0): LineWithPos[] {
  const ss = s.split(w);
  const r: LineWithPos[] = [];
  let i = 0;
  for (const s1 of ss) {
    r.push({ content: s1, startOffset: i + offset });
    i += s1.length + w.length;
  }
  return r;
}

function makeTestFile(basename: string, extension: string, content: string): FileType {
  const currentTextHolder = { text: content };
  return {
    readFile: () => {
      return Promise.resolve(content);
    },
    writeFile: (t: string) => {
      currentTextHolder.text = t;
      return Promise.resolve();
    },
    extension,
    basename,
    getTags(): Tag[] {
      const lines = breakIntoLines(currentTextHolder.text);

      const r: Tag[] = [];
      for (const line of lines) {
        const words = splitMeasured(line.content, ' ', line.startOffset);
        const tags = words.map((value) => ({
          name: value.content,
          position: {
            start: value.startOffset,
            end: value.startOffset + value.content.length,
          },
        }));
        r.push(...tags);
      }
      return r;
    },
  };
}

function makeTestObsidian(
  files: Array<{ content: string; basename: string; extension: string }>
): ObsidianAdapterContextType {
  const ff = files.map((x) => makeTestFile(x.basename, x.extension, x.content));
  return {
    getMarkdownFiles(): FileType[] {
      return ff.filter((x) => x.extension === '.md');
    },
    getFiles(): FileType[] {
      return ff;
    },
  };
}

test('should load items', () => {
  const o = makeTestObsidian([
    {
      basename: '/test',
      extension: '.md',
      content: 'Q::A',
    },
  ]);
  const wrapper = render(<TheApp obsidian={o} />);
  expect(wrapper.container).toHaveTextContent('Hello world');
});
