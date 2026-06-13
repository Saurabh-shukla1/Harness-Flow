import {
  BoxRenderable,
  fg,
  getTreeSitterClient,
  MarkdownRenderable,
  SyntaxStyle,
  t,
  TextRenderable,
  type CliRenderer,
} from "@opentui/core";
import { isMarkdown } from "./markdown";
import { THEME } from "./theme";

export type TurnBlock = {
  container: BoxRenderable;
  setQuery: (query: string) => void;
  setPending: (pending: boolean) => void;
  setResponse: (response: string) => void;
  setStreaming: (value: boolean) => void;
  destroy: () => void;
};

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

let turnCounter = 0;

export function createTurnBlock(
  renderer: CliRenderer,
  syntaxStyle: SyntaxStyle,
): TurnBlock {
  const turnId = turnCounter++;
  let alive = true;
  let spinnerInterval: ReturnType<typeof setInterval> | null = null;
  let spinnerFrame = 0;

  const container = new BoxRenderable(renderer, {
    id: `turn-${turnId}`,
    width: "100%",
    flexDirection: "column",
    backgroundColor: THEME.panelBg,
    border: true,
    borderColor: THEME.panelBorder,
    borderStyle: "rounded",
    marginBottom: 1,
  });

  const queryBar = new BoxRenderable(renderer, {
    id: `turn-${turnId}-query`,
    width: "100%",
    backgroundColor: THEME.panelBg,
    border: ["left"],
    borderColor: THEME.accent,
    borderStyle: "heavy",
    padding: 1,
  });

  const queryText = new TextRenderable(renderer, {
    width: "100%",
    fg: THEME.text,
    bg: THEME.panelBg,
    wrapMode: "word",
    content: "",
  });

  // ── loader row (shown while pending) ──────────────────────────
  const loaderRow = new BoxRenderable(renderer, {
    id: `turn-${turnId}-loader`,
    width: "100%",
    height: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.panelBg,
    paddingLeft: 2,
    paddingTop: 1,
    paddingBottom: 1,
    visible: false,
  });

  const loaderText = new TextRenderable(renderer, {
    fg: THEME.textDim,
    content: t`${fg(THEME.accent)(SPINNER[0])} ${fg(THEME.textDim)("Generating response...")}`,
  });

  loaderRow.add(loaderText);

  // ── response area (shown once response arrives) ────────────────
  const responseArea = new BoxRenderable(renderer, {
    id: `turn-${turnId}-response`,
    width: "100%",
    flexDirection: "column",
    backgroundColor: THEME.panelBg,
    padding: 1,
    paddingLeft: 2,
    visible: false,
  });

  const markdown = new MarkdownRenderable(renderer, {
    id: `turn-${turnId}-markdown`,
    width: "100%",
    syntaxStyle,
    treeSitterClient: getTreeSitterClient(),
    fg: THEME.text,
    bg: THEME.panelBg,
    content: "",
    conceal: true,
    streaming: false,
    visible: false,
  });

  const text = new TextRenderable(renderer, {
    id: `turn-${turnId}-text`,
    width: "100%",
    fg: THEME.text,
    bg: THEME.panelBg,
    wrapMode: "word",
    content: "",
    visible: false,
  });

  queryBar.add(queryText);
  responseArea.add(markdown);
  responseArea.add(text);
  container.add(queryBar);
  container.add(loaderRow);
  container.add(responseArea);

  const stopSpinner = () => {
    if (spinnerInterval !== null) {
      clearInterval(spinnerInterval);
      spinnerInterval = null;
    }
  };

  const destroy = () => {
    alive = false;
    stopSpinner();
  };

  return {
    container,
    destroy,

    setQuery: (query: string) => {
      if (!alive) return;
      queryText.content = query;
    },

    setPending: (pending: boolean) => {
      if (!alive) return;
      if (pending) {
        loaderRow.visible = true;
        responseArea.visible = false;
        spinnerFrame = 0;
        stopSpinner();
        spinnerInterval = setInterval(() => {
          if (!alive) return;
          spinnerFrame = (spinnerFrame + 1) % SPINNER.length;
          loaderText.content = t`${fg(THEME.accent)(SPINNER[spinnerFrame])} ${fg(THEME.textDim)("Generating response...")}`;
        }, 80);
      } else {
        stopSpinner();
        loaderRow.visible = false;
      }
    },

    setResponse: (response: string) => {
      if (!alive) return;
      stopSpinner();
      loaderRow.visible = false;

      if (!response) {
        responseArea.visible = false;
        markdown.visible = false;
        text.visible = false;
        return;
      }

      responseArea.visible = true;

      if (isMarkdown(response) || markdown.streaming) {
        text.visible = false;
        markdown.visible = true;
        markdown.content = response;
      } else {
        markdown.visible = false;
        text.visible = true;
        text.content = response;
      }
    },

    setStreaming: (value: boolean) => {
      if (!alive) return;
      markdown.streaming = value;
    },
  };
}
