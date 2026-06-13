import { CliRenderEvents, createCliRenderer, InputRenderableEvents } from "@opentui/core";
import { AgentSession } from "./agent";
import type { ModelFlag } from "./model";
import { createContentArea } from "./tui/content-area";
import { createControlPanel } from "./tui/control-panel";
import { chatLayout, setupLayout, THEME } from "./tui/theme";
import type { TypewriterHandle } from "./tui/typewriter";

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
  backgroundColor: THEME.bg,
});

const setup = setupLayout(renderer.width, renderer.height);
const chat = chatLayout(renderer.width, renderer.height);

const { container: controlPanel, modelSelect, input, enterChatMode, setRunning, destroy: destroyControlPanel } =
  createControlPanel(
    renderer,
    setup.panelLeft,
    setup.panelWidth,
    setup.controlTop,
    setup.controlHeight,
    setup.controlHeightWithModel,
  );

// Start at full height so the logo is visible during the setup screen.
// Resized to contentHeight when chat mode begins.
const content = createContentArea(
  renderer,
  chat.panelLeft,
  chat.panelWidth,
  renderer.height,
);

let isRunning = false;
let session: AgentSession | null = null;
let activeTypewriter: TypewriterHandle | null = null;

function switchToChatMode() {
  // Shrink scroll to leave room for the bottom input dock.
  content.resize(chat.panelLeft, chat.panelWidth, chat.contentHeight);
  enterChatMode(
    chat.panelLeft,
    chat.inputTop,
    chat.panelWidth,
    chat.inputHeight,
  );
}

async function submitPrompt(prompt: string) {
  if (isRunning || !prompt.trim()) {
    return;
  }

  const trimmed = prompt.trim();
  const selected = modelSelect.getSelectedOption();
  const modelFlag = (selected?.value ?? "-free") as ModelFlag;

  input.value = "";

  if (!session) {
    session = new AgentSession(modelFlag);
    switchToChatMode();
  } else {
    session.setModel(modelFlag);
  }

  const turnIndex = content.addTurn(trimmed);

  isRunning = true;
  setRunning(true);
  content.setTurnPending(turnIndex);

  try {
    const result = await session.send(trimmed);

    activeTypewriter = content.animateTurn(turnIndex, result, () => {
      activeTypewriter = null;
      isRunning = false;
      setRunning(false);
    });
  } catch (error: any) {
    const isAbort =
      error?.name === "AbortError" ||
      error?.message?.toLowerCase().includes("abort") ||
      error?.message?.toLowerCase().includes("cancel");
    content.updateTurn(
      turnIndex,
      isAbort ? "_Interrupted._" : `**Error:** ${error?.message ?? "Unknown error"}`,
    );
    isRunning = false;
    setRunning(false);
  }
}

renderer.root.onKeyDown = (key) => {
  if (key.name === "escape" && isRunning) {
    if (activeTypewriter) {
      activeTypewriter.finish();
    } else if (session) {
      session.abort();
    }
  }
};

input.on(InputRenderableEvents.ENTER, (value) => {
  submitPrompt(value);
});

input.focus();

renderer.root.add(content.container);
renderer.root.add(controlPanel);
