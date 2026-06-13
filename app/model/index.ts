export type ModelFlag = "-free" | "-claude" | "-qwen" | "-gemini" | "-openRouter";

export const MODEL_OPTIONS = [
  {
    name: "Free",
    description: "ibm-granite/granite-4.1-8b",
    value: "-free" as ModelFlag,
  },
  {
    name: "Claude",
    description: "anthropic/claude-haiku-4.5",
    value: "-claude" as ModelFlag,
  },
  {
    name: "qwen",
    description: "qwen/qwen3.7-plus",
    value: "-qwen" as ModelFlag,
  },
  {
    name: "gemini",
    description: "google/gemini-3.1-flash-lite",
    value: "-gemini" as ModelFlag,
  },
  {
    name: 'openRouter',
    description: "openrouter/owl-alpha",
    value: "-openRouter" as ModelFlag,
  }
] as const;

export const isValidModelFlag = (flag: string): flag is ModelFlag =>
  flag === "-free" || flag === "-claude" || flag === "-qwen" || flag === "-gemini" || flag === "-openRouter";

export const selectModel = (flag: ModelFlag) => {
  switch (flag) {
    case "-free":
      return "ibm-granite/granite-4.1-8b";
    case "-claude":
      return "anthropic/claude-haiku-4.5";
    case "-qwen":
      return "sourceful/riverflow-v2.5-pro:free";
    case "-gemini":
      return "google/gemini-3.1-flash-lite";
    case "-openRouter":
      return "openrouter/owl-alpha";
  }
};
