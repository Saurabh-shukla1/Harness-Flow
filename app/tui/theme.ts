export const THEME = {
  bg: "#000000",
  transparent: "transparent",
  panelBg: "#222222",
  panelBorder: "#444444",
  accent: "#f0cea4",
  text: "#FFFFFF",
  textDim: "#666666",
  textMuted: "#888888",
  inputBg: "#1a1a1a",
  inputFocusedBg: "#2a2a2a",
  link: "#7fb3f5",
} as const;

type Layout = {
  panelLeft: number;
  panelWidth: number;
};

function baseLayout(rendererWidth: number): Layout {
  const margin = 4;
  const panelWidth = Math.min(rendererWidth - margin * 2, 90);
  const panelLeft = Math.max(margin, Math.floor((rendererWidth - panelWidth) / 2));
  return { panelLeft, panelWidth };
}

export function setupLayout(rendererWidth: number, _rendererHeight: number) {
  const { panelLeft, panelWidth } = baseLayout(rendererWidth);
  const controlTop = 12;
  const controlHeight = 6;
  const controlHeightWithModel = 7;

  return { panelLeft, panelWidth, controlTop, controlHeight, controlHeightWithModel };
}

export function chatLayout(rendererWidth: number, rendererHeight: number) {
  const { panelLeft, panelWidth } = baseLayout(rendererWidth);
  const inputHeight = 7;
  const inputTop = rendererHeight - inputHeight;
  const contentHeight = inputTop - 1;

  return {
    panelLeft,
    panelWidth,
    contentHeight,
    inputTop,
    inputHeight,
  };
}
