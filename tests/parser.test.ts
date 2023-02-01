import { breakIntoLines, LineWithPos, parseDecks2, reversePair } from '../src/parser';
import { Position } from '../src/obsidian-context';
import { ParsedRepeatItem } from '../src/model';

function offsetRepeatItem(result: ParsedRepeatItem, offset: number): ParsedRepeatItem {
  return {
    ...result,
    answerOffset: result.answerOffset + offset,
    questionOffset: result.questionOffset + offset,
    position: { start: result.position.start + offset, end: result.position.end + offset },
  };
}

function testS(text: string, result: ParsedRepeatItem) {
  const prefix = '#flashcards\n';
  const r = parseDecks2(prefix + text, 'flashcards');
  expect(r).toEqual({ decks: [offsetRepeatItem(result, prefix.length)] });
}

function testA(text: string, result: ParsedRepeatItem[]) {
  const prefix = '#flashcards\n';
  const r = parseDecks2(prefix + text, 'flashcards');
  expect(r).toEqual({ decks: result.map((r) => offsetRepeatItem(r, prefix.length)) });
}

function pos(from: number, to: number): Position {
  return { start: from, end: to };
}

function tb(t: string, r: LineWithPos[]) {
  expect(breakIntoLines(t)).toEqual(r);
}

test('Linebreaking', () => {
  tb('', []);
  tb('aaa', [{ content: 'aaa', startOffset: 0 }]);

  tb('aa\rbbb', [
    { content: 'aa', startOffset: 0 },
    { content: 'bbb', startOffset: 3 },
  ]);
  tb('aa\nbbb', [
    { content: 'aa', startOffset: 0 },
    { content: 'bbb', startOffset: 3 },
  ]);
  tb('aa\r\nbbb', [
    { content: 'aa', startOffset: 0 },
    { content: 'bbb', startOffset: 4 },
  ]);

  tb('aa\r\rbbb', [
    { content: 'aa', startOffset: 0 },
    { content: '', startOffset: 3 },
    { content: 'bbb', startOffset: 4 },
  ]);
  tb('aa\n\nbbb', [
    { content: 'aa', startOffset: 0 },
    { content: '', startOffset: 3 },
    { content: 'bbb', startOffset: 4 },
  ]);
  tb('aa\r\n\r\nbbb', [
    { content: 'aa', startOffset: 0 },
    { content: '', startOffset: 4 },
    { content: 'bbb', startOffset: 6 },
  ]);

  tb('aa\rbbb\r', [
    { content: 'aa', startOffset: 0 },
    { content: 'bbb', startOffset: 3 },
    { content: '', startOffset: 7 },
  ]);
  tb('aa\nbbb\n', [
    { content: 'aa', startOffset: 0 },
    { content: 'bbb', startOffset: 3 },
    { content: '', startOffset: 7 },
  ]);
  tb('aa\r\nbbb\r\n', [
    { content: 'aa', startOffset: 0 },
    { content: 'bbb', startOffset: 4 },
    { content: '', startOffset: 9 },
  ]);

  tb('aa\rbbb\rc', [
    { content: 'aa', startOffset: 0 },
    { content: 'bbb', startOffset: 3 },
    { content: 'c', startOffset: 7 },
  ]);
  tb('aa\nbbb\nc', [
    { content: 'aa', startOffset: 0 },
    { content: 'bbb', startOffset: 3 },
    { content: 'c', startOffset: 7 },
  ]);
  tb('aa\r\nbbb\r\nc', [
    { content: 'aa', startOffset: 0 },
    { content: 'bbb', startOffset: 4 },
    { content: 'c', startOffset: 9 },
  ]);
});

test('Test parsing of single line basic cards', () => {
  testS('Question::Answer', {
    questionOffset: 0,
    question: 'Question',
    answerOffset: 10,
    answer: 'Answer',
    isReverse: false,
    metadata: undefined,
    position: pos(0, 16),
  });
  testS('Question::Answer\n<!--SR:!2021-08-11,4,270-->', {
    questionOffset: 0,
    question: 'Question',
    answerOffset: 10,
    answer: 'Answer',
    isReverse: false,
    metadata: '<!--SR:!2021-08-11,4,270-->',
    position: pos(0, 16),
  });

  testS('Question::Answer\n%%cc', {
    questionOffset: 0,
    question: 'Question',
    answerOffset: 10,
    answer: 'Answer',
    isReverse: false,
    metadata: '%%cc',
    position: pos(0, 16),
  });

  testS('Question::Answer <!--SR:!2021-08-11,4,270-->', {
    questionOffset: 0,
    question: 'Question',
    answerOffset: 10,
    answer: 'Answer ',
    isReverse: false,
    metadata: '<!--SR:!2021-08-11,4,270-->',
    position: pos(0, 17),
  });

  testS('Question::Answer %%cc', {
    questionOffset: 0,
    question: 'Question',
    answerOffset: 10,
    answer: 'Answer ',
    isReverse: false,
    metadata: '%%cc',
    position: pos(0, 17),
  });

  testS('Some text before\nQuestion ::Answer', {
    questionOffset: 17,
    question: 'Question ',
    answerOffset: 28,
    answer: 'Answer',
    isReverse: false,
    position: pos(17, 34),
  });
  testA('#Title\n\nQ1::A1\nQ2:: A2', [
    {
      questionOffset: 8,
      question: 'Q1',
      answerOffset: 12,
      answer: 'A1',
      isReverse: false,
      position: pos(8, 14),
    },
    {
      questionOffset: 15,
      question: 'Q2',
      answerOffset: 19,
      answer: ' A2',
      isReverse: false,
      position: pos(15, 22),
    },
  ]);
});

test('Test parsing of single line reversed cards', () => {
  testA(
    'Question:::Answer',
    reversePair({
      questionOffset: 0,
      question: 'Question',
      answerOffset: 11,
      answer: 'Answer',
      position: pos(0, 17),
    })
  );

  testA(
    'Some text before\nQuestion :::Answer',
    reversePair({
      questionOffset: 17,
      question: 'Question ',
      answerOffset: 29,
      answer: 'Answer',
      position: pos(17, 35),
    })
  );

  testA('#Title\n\nQ1:::A1\nQ2::: A2', [
    ...reversePair({
      questionOffset: 8,
      question: 'Q1',
      answerOffset: 13,
      answer: 'A1',
      position: pos(8, 15),
    }),
    ...reversePair({
      questionOffset: 16,
      question: 'Q2',
      answerOffset: 21,
      answer: ' A2',
      position: pos(16, 24),
    }),
  ]);
});

function testMl(text: string, item: ParsedRepeatItem) {
  const prefix = '#flashcards\n';
  const r = parseDecks2(prefix + text, 'flashcards');
  expect(r).toEqual({ decks: [offsetRepeatItem(item, prefix.length)] });
}

function testMlA(text: string, item: ParsedRepeatItem[]) {
  const prefix = '#flashcards\n';
  const r = parseDecks2(prefix + text, 'flashcards');
  expect(r).toEqual({ decks: item.map((x) => offsetRepeatItem(x, prefix.length)) });
}

test('Test parsing of multi line basic cards', () => {
  testMl('Question\n?\nAnswer', {
    questionOffset: 0,
    question: 'Question',
    answerOffset: 11,
    answer: 'Answer',
    position: pos(0, 17),
    isReverse: false,
  });

  testMl('Question\n?\nAnswer <!--SR:!2021-08-11,4,270-->', {
    questionOffset: 0,
    question: 'Question',
    answerOffset: 11,
    answer: 'Answer ',
    position: pos(0, 18),
    isReverse: false,
    metadata: '<!--SR:!2021-08-11,4,270-->',
  });
  testMl('Question\n?\nAnswer\n<!--SR:2021-08-11,4,270-->', {
    questionOffset: 0,
    question: 'Question',
    answerOffset: 11,
    answer: 'Answer',
    position: pos(0, 17),
    isReverse: false,
    metadata: '<!--SR:2021-08-11,4,270-->',
  });

  testMl('Some text before\nQuestion\n?\nAnswer', {
    questionOffset: 0,
    question: 'Some text before\nQuestion',
    answerOffset: 28,
    answer: 'Answer',
    position: pos(0, 34),
    isReverse: false,
  });

  testMl('Question\n?\nAnswer\nSome text after!', {
    questionOffset: 0,
    question: 'Question',
    answerOffset: 11,
    answer: 'Answer\nSome text after!',
    position: pos(0, 34),
    isReverse: false,
  });

  testMlA('#Title\n\nLine0\nQ1\n?\nA1\nAnswerExtra\n\nQ2\n?\nA2', [
    {
      questionOffset: 0,
      question: '#Title\n\nLine0\nQ1',
      answerOffset: 19,
      answer: 'A1\nAnswerExtra',
      position: pos(0, 33),
      isReverse: false,
    },
    {
      questionOffset: 35,
      question: 'Q2',
      answerOffset: 40,
      answer: 'A2',
      position: pos(35, 42),
      isReverse: false,
    },
  ]);
});

test('Test parsing of multi line reversed cards', () => {
  testMlA(
    'Question\n??\nAnswer',
    reversePair({
      questionOffset: 0,
      question: 'Question',
      answerOffset: 12,
      answer: 'Answer',
      position: pos(0, 18),
    })
  );

  testMlA(
    'Some text before\nQuestion\n??\nAnswer',
    reversePair({
      questionOffset: 0,
      question: 'Some text before\nQuestion',
      answerOffset: 29,
      answer: 'Answer',
      position: pos(0, 35),
    })
  );

  testMlA(
    'Question\n??\nAnswer\nSome text after!',
    reversePair({
      questionOffset: 0,
      question: 'Question',
      answerOffset: 12,
      answer: 'Answer\nSome text after!',
      position: pos(0, 35),
    })
  );

  testMlA(
    '#Title\n\nLine0\nQ1\n??\nA1\nAnswerExtra\n\nQ2\n??\nA2',

    [
      ...reversePair({
        questionOffset: 0,
        question: '#Title\n\nLine0\nQ1',
        answerOffset: 20,
        answer: 'A1\nAnswerExtra',
        position: pos(0, 34),
      }),
      ...reversePair({
        questionOffset: 36,
        question: 'Q2',
        answerOffset: 42,
        answer: 'A2',
        position: pos(36, 44),
      }),
    ]
  );
});
