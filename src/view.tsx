import { Box, Chip, List, ListItem, ListItemButton, ListItemText, Paper, Stack } from '@mui/material';
import Button from '@mui/material/Button';
import { Arrangement } from './old/arrangement';
import { EditorPosition, ItemView, MarkdownView } from 'obsidian';
import { Pattern } from './old/Pattern';
import * as React from 'react';
import { useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useAsyncCallback } from './hooks/useAsyncCallback';
import { OverviewComponent } from './OverviewComponent';
import { Deck, loadDecks } from './model';
import { DeckReviewComponent } from './DeckReviewComponent';
import { useAsyncEffect } from './hooks/useAsyncEffect';
import { Operation, ReviewEnum, ReviewOpt } from './old/schedule';

function LinearProgressWithLabel(props: { value1: number; value2: number }) {
  const value = (props.value1 / props.value2) * 100;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress variant="determinate" value={value} />
      </Box>
      <Box sx={{ minWidth: 50 }}>
        <Typography variant="body2" color="var(--text-normal)">{`${props.value1}/${props.value2}`}</Typography>
      </Box>
    </Box>
  );
}

export const VIEW_TYPE_REVIEW = 'aosr-review-view';

type ReviewingProps = {
  arrangement: Arrangement;
  goStage: (stage: ReviewStage) => void;
  view: ItemView;
  arrangeName: string;
};

function ReviewingHeader({
  index,
  total,
  nowPattern,
  lastPattern,
}: {
  index: number;
  total: number;
  nowPattern?: Pattern;
  lastPattern?: Pattern;
}) {
  const openPatternFile = async (pattern: Pattern | undefined) => {
    if (!pattern) {
      return;
    }
    let leaf = app.workspace.getLeavesOfType('markdown').at(0);
    if (!leaf) {
      leaf = app.workspace.getLeaf(true);
    }
    await leaf.openFile(pattern.card.note);
    const view = app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      return;
    }
    // The position of the Tag is used first, and if the tag does not exist, the position of the card cache is used
    const noteText = await app.vault.read(pattern.card.note);
    const index = noteText.indexOf(pattern.TagID);
    let offset = 0;
    let length = 0;
    if (index >= 0) {
      offset = index;
      length = pattern.TagID.length;
    } else {
      offset = pattern.card.indexBuff;
      length = pattern.card.cardText.length;
    }
    const range1 = view.editor.offsetToPos(offset);
    const range2 = view.editor.offsetToPos(offset + length);
    const range2next: EditorPosition = {
      line: range2.line + 1,
      ch: 0,
    };
    view.currentMode.applyScroll(range1.line);
    view.editor.setSelection(range2next, range1);
    view.editor.scrollIntoView(
      {
        from: range1,
        to: range2next,
      },
      true
    );
  };

  const getLastTime = (): string => {
    if (nowPattern?.schedule?.LearnInfo.IsNew) {
      return '';
    }
    const date = nowPattern?.schedule.LastTime;
    return date?.fromNow() || '';
  };

  return (
    <>
      <LinearProgressWithLabel value1={index} value2={total} />
      <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
        <Button size="large" onClick={() => openPatternFile(nowPattern)}>
          Open File
        </Button>
        <Button size="large" onClick={() => openPatternFile(lastPattern)}>
          Open Last
        </Button>
        <Stack spacing={2} direction="row">
          {getLastTime() && (
            <Chip
              sx={{
                color: 'var(--text-normal)',
              }}
              label={getLastTime()}
            />
          )}
          {nowPattern && (
            <Chip
              sx={{
                color: 'var(--text-normal)',
              }}
              label={`ease: ${nowPattern?.schedule.Ease}`}
            />
          )}
        </Stack>
      </Stack>
    </>
  );
}

function ReviewCard({ p, view, submit }: { p: Pattern; view: ItemView; submit: (r: ReviewOpt) => void }) {
  const [showAnswer, setShowAnswer] = React.useState(false);

  const getOptDate = (opt: ReviewEnum): string => {
    const date = p?.schedule.CalcNextTime(opt);
    return date?.fromNow() || '';
  };

  return (
    <>
      <p.Component view={view} showAns={showAnswer}></p.Component>
      {!showAnswer && <Button onClick={() => setShowAnswer(true)}>Show answer</Button>}
      {showAnswer && (
        <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
          <Button color="error" size="large" onClick={() => submit(new ReviewOpt(ReviewEnum.FORGET))}>
            Did not remember
          </Button>
          <Button onClick={() => submit(new ReviewOpt(ReviewEnum.HARD))} color="warning" size="large">
            Hard {getOptDate(ReviewEnum.HARD)}
          </Button>
          <Button onClick={() => submit(new ReviewOpt(ReviewEnum.EASY))} color="success" size="large">
            Easy {getOptDate(ReviewEnum.HARD)}
          </Button>
        </Stack>
      )}
    </>
  );
}

function Reviewing2({ arrangeName, arrangement, goStage, view }: ReviewingProps) {
  const [index, setIndex] = React.useState(0);
  const [total, setTotal] = React.useState(1);
  const [nowPattern, setNowPattern] = React.useState<Pattern>();
  const [lastPattern, setLastPattern] = React.useState<Pattern>();

  const patternIter = React.useMemo(() => arrangement.PatternSequence(arrangeName), [arrangeName, arrangement]);

  useAsyncCallback(
    async ({ wrap }) => {
      const result = await wrap(patternIter.next());
      if (result.done) {
        goStage(ReviewStage.Loading);
        return;
      }
      setIndex(result.value.index);
      setTotal(result.value.total);
      setNowPattern(result.value.pattern);
      patternIter.next();
    },
    [patternIter]
  );

  const next = async () => {
    const result = await patternIter.next();
    if (result.done) {
      goStage(ReviewStage.Loading);
      return;
    }
    setLastPattern(nowPattern);
    setIndex(result.value.index);
    setTotal(result.value.total);
    setNowPattern(result.value.pattern);
  };

  const submit = async (opt: Operation) => {
    await nowPattern?.SubmitOpt(opt);
    await next();
  };

  return (
    <Box>
      <ReviewingHeader index={index} total={total} nowPattern={nowPattern} lastPattern={lastPattern} />
      {nowPattern && (
        <Box sx={{ minHeight: 135 }}>
          <ReviewCard p={nowPattern} submit={submit} view={view} />
        </Box>
      )}
    </Box>
  );
}

class LoadingComponent extends React.Component<any, any> {
  render() {
    return <p>Loading...</p>;
  }
}

type MaindeskProps = {
  arrangement: Arrangement;
  goStage: (stage: ReviewStage) => void;
  setArrangement: (arrangeName: string) => void;
};

class MaindeskComponent extends React.Component<MaindeskProps, Record<string, never>> {
  constructor(props: any) {
    super(props);
  }

  render(): React.ReactNode {
    return (
      <Box>
        <Paper
          sx={{
            color: 'var(--text-normal)',
            bgcolor: 'var(--background-primary)',
          }}
        >
          {this.props.arrangement.ArrangementList().length != 0 && (
            <List>
              {this.props.arrangement.ArrangementList().map((value) => (
                <ListItem disablePadding key={value.Name}>
                  <ListItemButton
                    onClick={() => {
                      this.props.setArrangement(value.Name);
                      this.props.goStage(ReviewStage.Reviewing);
                    }}
                  >
                    <ListItemText primary={`${value.Name} : ${value.Count}`} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
          {this.props.arrangement.ArrangementList().length == 0 && <p>All Done.</p>}
        </Paper>
      </Box>
    );
  }
}

enum ReviewStage {
  Loading,
  Maindesk,
  Reviewing,
}

class ReviewComponent extends React.Component<
  {
    view: ItemView;
  },
  {
    stage: ReviewStage;
    arrangement: Arrangement;
    arrangeName: string;
  }
> {
  private syncFlag: boolean;

  async sync() {
    if (this.syncFlag) {
      return;
    }
    this.syncFlag = true;
    const arrangement = this.state.arrangement;
    await arrangement.init();
    this.setState({
      arrangement: arrangement,
    });
    this.setState({
      stage: ReviewStage.Maindesk,
    });
    this.syncFlag = false;
  }

  componentDidMount() {
    this.sync();
  }

  constructor(props: { view: ItemView }) {
    super(props);
    this.syncFlag = false;
    this.state = {
      stage: ReviewStage.Loading,
      arrangement: new Arrangement(),
      arrangeName: '',
    };
  }

  goStage = (stage: ReviewStage) => {
    this.setState({
      stage: stage,
    });
    if (stage == ReviewStage.Loading) {
      this.sync();
    }
  };
  setArrangement = (arrangeName: string) => {
    this.setState({
      arrangeName: arrangeName,
    });
  };

  render(): React.ReactNode {
    if (this.state.stage == ReviewStage.Loading) {
      return <LoadingComponent></LoadingComponent>;
    }
    if (this.state.stage == ReviewStage.Maindesk) {
      return (
        <MaindeskComponent
          setArrangement={this.setArrangement}
          goStage={this.goStage}
          arrangement={this.state.arrangement}
        ></MaindeskComponent>
      );
    }
    if (this.state.stage == ReviewStage.Reviewing) {
      return (
        <Reviewing2
          arrangeName={this.state.arrangeName}
          arrangement={this.state.arrangement}
          goStage={this.goStage}
          view={this.props.view}
        ></Reviewing2>
      );
    }
  }
}
function App({ view }: { view: ItemView }) {
  const [decks, setDecks] = useState<Deck[] | 'loading'>('loading');
  const [selectedDeck, setSelectedDeck] = useState<Deck>();

  useAsyncEffect(async ({ wrap }) => {
    setDecks(await wrap(loadDecks()));
  }, []);

  if (decks === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="markdown-preview-view markdown-rendered is-readable-line-width allow-fold-headings">
      <div className="markdown-preview-sizer markdown-preview-section">
        {/*<ReviewComponent view={view}></ReviewComponent>*/}
        {selectedDeck ? (
          <DeckReviewComponent deck={selectedDeck} />
        ) : (
          <OverviewComponent decks={decks} onDeckSelected={(d) => setSelectedDeck(d)} />
        )}
      </div>
    </div>
  );
}

// Card review view
export class ReviewView extends ItemView {
  root?: Root;

  getViewType(): string {
    return VIEW_TYPE_REVIEW;
  }

  getDisplayText(): string {
    return 'AOSR';
  }

  async onload() {
    const rootDiv = this.containerEl.children[1].createDiv();
    this.root = createRoot(rootDiv);
    this.root.render(<App view={this}></App>);
  }

  onunload(): void {
    this.root?.unmount();
  }
}
