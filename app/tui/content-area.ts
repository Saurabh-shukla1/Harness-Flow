import {
  BoxRenderable,
  instantiate,
  ScrollBoxRenderable,
  type CliRenderer,
} from "@opentui/core";
import { createOutputSyntaxStyle, isMarkdown } from "./markdown";
import { harnessLogo, LOGO_HEIGHT, LOGO_WIDTH } from "./logo";
import { createTurnBlock, type TurnBlock } from "./turn-block";
import { typewrite, type TypewriterHandle } from "./typewriter";
import { THEME } from "./theme";

export type ContentArea = {
  container: ScrollBoxRenderable;
  addTurn: (query: string) => number;
  setTurnPending: (index: number) => void;
  updateTurn: (index: number, response: string) => void;
  animateTurn: (index: number, response: string, onDone?: () => void) => TypewriterHandle;
  resize: (left: number, width: number, height: number) => void;
  destroy: () => void;
};

export function createContentArea(
  renderer: CliRenderer,
  panelLeft: number,
  panelWidth: number,
  /** Initial height — pass renderer.height for setup, contentHeight for chat. */
  height: number,
): ContentArea {
  const syntaxStyle = createOutputSyntaxStyle();
  const turns: TurnBlock[] = [];

  // Scroll spans full terminal width so the scrollbar sits at the screen edge.
  const fullWidth = renderer.width;

  const scroll = new ScrollBoxRenderable(renderer, {
    id: "content-scroll",
    position: "absolute",
    left: 0,
    top: 0,
    width: fullWidth,
    height,
    visible: true,       // always visible — logo shows in setup mode too
    zIndex: 1,
    scrollY: true,
    stickyScroll: true,
    stickyStart: "bottom",
    backgroundColor: THEME.transparent,
    viewportOptions: { backgroundColor: THEME.transparent },
    contentOptions: {
      backgroundColor: THEME.transparent,
      flexDirection: "column",
      alignItems: "center",
      paddingTop: 1,
      paddingBottom: 1,
      width: "100%",
    },
    scrollbarOptions: {
      foregroundColor: THEME.accent,
      backgroundColor: THEME.inputBg,
    },
  });

  const column = new BoxRenderable(renderer, {
    id: "content-column",
    width: panelWidth,
    flexDirection: "column",
    gap: 1,
    backgroundColor: THEME.transparent,
  });

  scroll.content.add(column);

  // ── Logo lives at the top of the scroll column permanently ──
  const logoWrapper = new BoxRenderable(renderer, {
    id: "scroll-logo",
    width: "100%",
    height: LOGO_HEIGHT,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
    marginBottom: 2,
    backgroundColor: THEME.transparent,
  });

  const logo = instantiate(renderer, harnessLogo);
  logo.position = "relative";
  logo.left = 0;
  logo.top = 0;
  logo.width = LOGO_WIDTH;
  logo.height = LOGO_HEIGHT;

  logoWrapper.add(logo);
  column.add(logoWrapper);

  const scrollToBottom = () => {
    scroll.scrollTop = scroll.scrollHeight;
  };

  const addTurn = (query: string): number => {
    const block = createTurnBlock(renderer, syntaxStyle);
    block.setQuery(query);
    column.add(block.container);
    turns.push(block);
    scrollToBottom();
    return turns.length - 1;
  };

  const setTurnPending = (index: number) => {
    turns[index]?.setPending(true);
    scrollToBottom();
  };

  const updateTurn = (index: number, response: string) => {
    turns[index]?.setResponse(response);
    scrollToBottom();
  };

  const animateTurn = (
    index: number,
    response: string,
    onDone?: () => void,
  ): TypewriterHandle => {
    const block = turns[index];
    if (!block) {
      onDone?.();
      return { finish: () => {}, cancel: () => {} };
    }

    block.setResponse("");

    const usesMarkdown = isMarkdown(response);
    if (usesMarkdown) {
      block.setStreaming(true);
    }

    const handleDone = () => {
      if (usesMarkdown) {
        block.setStreaming(false);
      }
      onDone?.();
    };

    return typewrite(
      response,
      (partial) => {
        block.setResponse(partial);
        scrollToBottom();
      },
      handleDone,
    );
  };

  const resize = (nextLeft: number, nextWidth: number, nextHeight: number) => {
    scroll.height = nextHeight;
    column.width = nextWidth;
  };

  const destroy = () => {
    for (const block of turns) {
      block.destroy();
    }
  };

  return {
    container: scroll,
    addTurn,
    setTurnPending,
    updateTurn,
    animateTurn,
    resize,
    destroy,
  };
}
