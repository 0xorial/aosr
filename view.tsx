import {
  Box,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
} from '@mui/material';
import Button from '@mui/material/Button';
import { Arrangement, PatternIter } from 'arrangement';
import { EditorPosition, ItemView, MarkdownView, View } from 'obsidian';
import { Pattern } from 'Pattern';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  LearnEnum,
  LearnOpt,
  Operation,
  ReviewEnum,
  ReviewOpt,
} from 'schedule';
import LinearProgress, {} from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

function LinearProgressWithLabel(props: { value1: number; value2: number }) {
  const value = (props.value1 / props.value2) * 100;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress variant="determinate" value={value} />
      </Box>
      <Box sx={{ minWidth: 50 }}>
        <Typography
          variant="body2"
          color="var(--text-normal)"
        >{`${props.value1}/${props.value2}`}</Typography>
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

// Brain state flags when no answer is seen
enum markEnum {
  NOTSURE,
  KNOWN,
  FORGET,
}

type ReviewingState = {
  nowPattern: Pattern | undefined;
  showAnswer: boolean;
  mark: markEnum;
  patternIter: AsyncGenerator<PatternIter, boolean, unknown>;
  index: number;
  total: number;
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
    let view = app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) {
      return;
    }
    // The position of the Tag is used first, and if the tag does not exist, the position of the card cache is used
    let noteText = await app.vault.read(pattern.card.note);
    let index = noteText.indexOf(pattern.TagID);
    let offset = 0;
    let length = 0;
    if (index >= 0) {
      offset = index;
      length = pattern.TagID.length;
    } else {
      offset = pattern.card.indexBuff;
      length = pattern.card.cardText.length;
    }
    let range1 = view.editor.offsetToPos(offset);
    let range2 = view.editor.offsetToPos(offset + length);
    let range2next: EditorPosition = {
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
    let date = nowPattern?.schedule.LastTime;
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

function PatternComponent({
  p,
  view,
  showAnswer,
}: {
  p?: Pattern;
  view: ItemView;
  showAnswer: boolean;
}) {
  if (!p) return <div></div>;

  return <p.Component view={view} showAns={showAnswer}></p.Component>;
}

function Reviewing2({
  arrangeName,
  arrangement,
  goStage,
  view,
}: ReviewingProps) {
  const [index, setIndex] = React.useState(0);
  const [total, setTotal] = React.useState(1);
  const [nowPattern, setNowPattern] = React.useState<Pattern>();
  const [lastPattern, setLastPattern] = React.useState<Pattern>();
  const [showAnswer, setShowAnswer] = React.useState(false);
  const [mark, setMark] = React.useState<markEnum>();

  const patternIter = React.useMemo(
    () => arrangement.PatternSequence(arrangeName),
    [arrangeName, arrangement]
  );

  const next = async () => {
    let result = await patternIter.next();
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
    setShowAnswer(true);
  };
  const getOptDate = (opt: ReviewEnum): string => {
    let date = nowPattern?.schedule.CalcNextTime(opt);
    return date?.fromNow() || '';
  };
  const getOptRate = (opt: LearnEnum): string => {
    if (!nowPattern) {
      return '';
    }
    let rate = nowPattern.schedule.CalcLearnRate(opt);
    rate = rate * 100;
    return `${rate.toFixed(0)}%`;
  };

  const markAs = (mark: markEnum) => {
    setShowAnswer(true);
    setMark(mark);
  };

  return (
    <Box>
      <ReviewingHeader
        index={index}
        total={total}
        nowPattern={nowPattern}
        lastPattern={lastPattern}
      />
      <Box sx={{ minHeight: 135 }}>
        <PatternComponent showAnswer={showAnswer} view={view} p={nowPattern} />
      </Box>
      {!showAnswer && (
        <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
          <Button
            color="error"
            size="large"
            onClick={() => markAs(markEnum.FORGET)}
          >
            Forget
          </Button>
          <Button
            color="info"
            size="large"
            onClick={() => markAs(markEnum.NOTSURE)}
          >
            Not Sure
          </Button>
          <Button
            color="success"
            size="large"
            onClick={() => markAs(markEnum.KNOWN)}
          >
            Known
          </Button>
        </Stack>
      )}
      {showAnswer && arrangeName != 'learn' && (
        <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
          {mark == markEnum.FORGET && (
            <Button
              color="error"
              size="large"
              onClick={() => submit(new ReviewOpt(ReviewEnum.FORGET))}
            >
              Forget {getOptDate(ReviewEnum.FORGET)}
            </Button>
          )}
          {mark == markEnum.NOTSURE && (
            <Button
              onClick={() => submit(new ReviewOpt(ReviewEnum.HARD))}
              color="error"
              size="large"
            >
              Hard {getOptDate(ReviewEnum.HARD)}
            </Button>
          )}
          {mark == markEnum.NOTSURE && (
            <Button
              color="info"
              size="large"
              onClick={() => submit(new ReviewOpt(ReviewEnum.FAIR))}
            >
              Fair {getOptDate(ReviewEnum.FAIR)}
            </Button>
          )}
          {mark == markEnum.KNOWN && (
            <Button
              onClick={() => submit(new ReviewOpt(ReviewEnum.FORGET))}
              color="error"
              size="large"
            >
              Wrong {getOptDate(ReviewEnum.FORGET)}
            </Button>
          )}
          {mark == markEnum.KNOWN && (
            <Button
              color="success"
              size="large"
              onClick={() => submit(new ReviewOpt(ReviewEnum.EASY))}
            >
              Easy {getOptDate(ReviewEnum.EASY)}
            </Button>
          )}
        </Stack>
      )}
      {showAnswer && arrangeName == 'learn' && (
        <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
          {mark == markEnum.FORGET && (
            <Button
              color="error"
              size="large"
              onClick={() => submit(new LearnOpt(LearnEnum.FORGET))}
            >
              Forget {getOptRate(LearnEnum.FORGET)}
            </Button>
          )}
          {mark == markEnum.NOTSURE && (
            <Button
              color="error"
              size="large"
              onClick={() => submit(new LearnOpt(LearnEnum.HARD))}
            >
              Hard {getOptRate(LearnEnum.HARD)}
            </Button>
          )}
          {mark == markEnum.NOTSURE && (
            <Button
              color="info"
              size="large"
              onClick={() => submit(new LearnOpt(LearnEnum.FAIR))}
            >
              Fair {getOptRate(LearnEnum.FAIR)}
            </Button>
          )}
          {mark == markEnum.KNOWN && (
            <Button
              color="error"
              size="large"
              onClick={() => submit(new LearnOpt(LearnEnum.FORGET))}
            >
              Wrong {getOptRate(LearnEnum.FORGET)}
            </Button>
          )}
          {mark == markEnum.KNOWN && (
            <Button
              color="info"
              size="large"
              onClick={() => submit(new LearnOpt(LearnEnum.EASY))}
            >
              Easy {getOptRate(LearnEnum.EASY)}
            </Button>
          )}
        </Stack>
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

type MaindeskState = {};

class MaindeskComponent extends React.Component<MaindeskProps, MaindeskState> {
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
          {this.props.arrangement.ArrangementList().length == 0 && (
            <p>All Done.</p>
          )}
        </Paper>
      </Box>
    );
  }
}

type ReviewProps = {
  view: ItemView;
};

enum ReviewStage {
  Loading,
  Maindesk,
  Reviewing,
}

type ReviewState = {
  stage: ReviewStage;
  arrangement: Arrangement;
  arrangeName: string;
};

class ReviewComponent extends React.Component<ReviewProps, ReviewState> {
  private syncFlag: boolean;
  async sync() {
    if (this.syncFlag) {
      return;
    }
    this.syncFlag = true;
    let arrangement = this.state.arrangement;
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
  constructor(props: ReviewProps) {
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

type props = {
  view: ItemView;
};

function App(props: props) {
  return (
    <div className="markdown-preview-view markdown-rendered is-readable-line-width allow-fold-headings">
      <div className="markdown-preview-sizer markdown-preview-section">
        <ReviewComponent view={props.view}></ReviewComponent>
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
    let rootDiv = this.containerEl.children[1].createDiv();
    this.root = createRoot(rootDiv);
    this.root.render(<App view={this}></App>);
  }
  onunload(): void {
    this.root?.unmount();
  }
}
