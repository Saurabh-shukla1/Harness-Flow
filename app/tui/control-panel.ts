import {
  BoxRenderable,
  InputRenderable,
  InputRenderableEvents,
  TabSelectRenderable,
  TextRenderable,
  fg,
  t,
  type CliRenderer,
} from "@opentui/core";
import { MODEL_OPTIONS } from "../model";
import { THEME } from "./theme";

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export type ControlPanel = {
  container: BoxRenderable;
  modelSelect: TabSelectRenderable;
  input: InputRenderable;
  enterChatMode: (left: number, top: number, width: number, height: number) => void;
  setRunning: (running: boolean) => void;
  destroy: () => void;
};

export function createControlPanel(
  renderer: CliRenderer,
  left: number,
  width: number,
  top: number,
  height: number,
  heightWithModel: number,
): ControlPanel {
  const container = new BoxRenderable(renderer, {
    id: "control-panel",
    position: "absolute",
    left,
    top,
    width,
    height,
    zIndex: 100,
    backgroundColor: THEME.transparent,
    border: false,
    flexDirection: "column",
    gap: 1,
  });

  const inputBox = new BoxRenderable(renderer, {
    id: "input-box",
    width: "100%",
    height: 5,
    backgroundColor: THEME.inputBg,
    border: ["left"],
    borderColor: THEME.accent,
    borderStyle: "heavy",
    flexDirection: "column",
    justifyContent: "center",
    padding: 2,
    gap: 1,
    shouldFill: true,
  });

  const input = new InputRenderable(renderer, {
    id: "prompt-input",
    width: "100%",
    placeholder: "Ask anything...",
    backgroundColor: THEME.inputBg,
    focusedBackgroundColor: THEME.inputFocusedBg,
    textColor: THEME.text,
    focusedTextColor: THEME.text,
    placeholderColor: THEME.textMuted,
    cursorColor: THEME.text,
  });

  const modelSelect = new TabSelectRenderable(renderer, {
    id: "model-select",
    width: "100%",
    height: 1,
    visible: false,
    options: [...MODEL_OPTIONS],
    showDescription: false,
    showUnderline: false,
    showScrollArrows: false,
    tabWidth: Math.max(12, Math.floor(width / MODEL_OPTIONS.length) - 3),
    backgroundColor: THEME.inputBg,
    textColor: THEME.textDim,
    focusedBackgroundColor: THEME.inputBg,
    focusedTextColor: THEME.textDim,
    selectedBackgroundColor: THEME.inputBg,
    selectedTextColor: THEME.accent,
    selectedDescriptionColor: THEME.textDim,
  });

  // ── Setup tips row ─────────────────────────────────────────
  const setupTipsRow = new BoxRenderable(renderer, {
    id: "setup-tips-row",
    width: "100%",
    height: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    backgroundColor: THEME.transparent,
  });
  setupTipsRow.add(new TextRenderable(renderer, {
    fg: THEME.textDim,
    content: t`${fg(THEME.text)("tab")} ${fg(THEME.textDim)("switch model")}   ${fg(THEME.text)("enter")} ${fg(THEME.textDim)("submit")}`,
  }));

  // ── Chat status bar (left tips + right spinner/ESC) ────────
  const chatStatusBar = new BoxRenderable(renderer, {
    id: "chat-status-bar",
    width: "100%",
    height: 1,
    visible: false,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: THEME.transparent,
  });

  const chatTipsLeft = new TextRenderable(renderer, {
    fg: THEME.textDim,
    content: t`${fg(THEME.text)("tab")} ${fg(THEME.textDim)("switch model")}   ${fg(THEME.text)("enter")} ${fg(THEME.textDim)("submit")}`,
  });

  const runningIndicator = new TextRenderable(renderer, {
    fg: THEME.accent,
    visible: false,
    content: t`${fg(THEME.accent)("⠋")} ${fg(THEME.textDim)("running")}   ${fg(THEME.text)("esc")} ${fg(THEME.textDim)("interrupt")}`,
  });

  chatStatusBar.add(chatTipsLeft);
  chatStatusBar.add(runningIndicator);

  // ── Spinner ────────────────────────────────────────────────
  let alive = true;
  let spinnerInterval: ReturnType<typeof setInterval> | null = null;
  let spinnerFrame = 0;

  const startSpinner = () => {
    if (!alive) return;
    runningIndicator.visible = true;
    spinnerFrame = 0;
    spinnerInterval = setInterval(() => {
      if (!alive) return;
      spinnerFrame = (spinnerFrame + 1) % SPINNER.length;
      const f = SPINNER[spinnerFrame];
      runningIndicator.content = t`${fg(THEME.accent)(f)} ${fg(THEME.textDim)("running")}   ${fg(THEME.text)("esc")} ${fg(THEME.textDim)("interrupt")}`;
    }, 80);
  };

  const stopSpinner = () => {
    if (spinnerInterval !== null) {
      clearInterval(spinnerInterval);
      spinnerInterval = null;
    }
    if (!alive) return;
    runningIndicator.visible = false;
  };

  // ── Model toggle ───────────────────────────────────────────
  let activeHeight = height;
  let activeHeightWithModel = heightWithModel;

  const showModelSelect = () => {
    modelSelect.visible = true;
    inputBox.height = 6;
    container.height = activeHeightWithModel;
    modelSelect.focus();
  };

  const hideModelSelect = () => {
    modelSelect.visible = false;
    inputBox.height = 5;
    container.height = activeHeight;
    input.focus();
  };

  modelSelect.onKeyDown = (key) => {
    if (key.name === "tab") {
      key.preventDefault();
      hideModelSelect();
    }
  };

  input.onKeyDown = (key) => {
    if (key.name === "tab") {
      key.preventDefault();
      if (modelSelect.visible) {
        hideModelSelect();
      } else {
        showModelSelect();
      }
    }
  };

  inputBox.add(input);
  inputBox.add(modelSelect);
  container.add(inputBox);
  container.add(setupTipsRow);
  container.add(chatStatusBar);

  const enterChatMode = (
    nextLeft: number,
    nextTop: number,
    nextWidth: number,
    nextHeight: number,
  ) => {
    setupTipsRow.visible = false;
    chatStatusBar.visible = true;
    modelSelect.visible = false;
    inputBox.height = 5;
    input.placeholder = "Ask a follow-up...";

    activeHeight = nextHeight;
    activeHeightWithModel = nextHeight + 1;

    container.left = nextLeft;
    container.top = nextTop;
    container.width = nextWidth;
    container.height = nextHeight;
    container.backgroundColor = THEME.transparent;
    container.visible = true;
  };

  const setRunning = (running: boolean) => {
    if (!alive) return;
    if (running) {
      input.focusable = false;
      startSpinner();
    } else {
      stopSpinner();
      input.focusable = true;
      input.focus();
    }
  };

  const destroy = () => {
    alive = false;
    stopSpinner();
  };

  return { container, modelSelect, input, enterChatMode, setRunning, destroy };
}
