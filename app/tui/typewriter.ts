export type TypewriterHandle = {
  /** Skip animation and show the full text immediately. */
  finish: () => void;
  /** Stop animation without updating the UI. */
  cancel: () => void;
};

/**
 * Progressively reveals `text` by calling `onUpdate` in small chunks,
 * simulating a typewriter / streaming effect.
 *
 * @param text         Full string to reveal.
 * @param onUpdate     Called with the currently visible slice on every tick.
 * @param onDone       Called once the full text is shown.
 * @param charsPerTick Characters revealed per tick (default 6).
 * @param tickMs       Milliseconds between ticks (default 16 ≈ 60 fps).
 */
export function typewrite(
  text: string,
  onUpdate: (partial: string) => void,
  onDone?: () => void,
  charsPerTick = 6,
  tickMs = 16,
): TypewriterHandle {
  let pos = 0;
  let done = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const stopTimer = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  const cancel = () => {
    if (done) return;
    done = true;
    stopTimer();
  };

  const finish = () => {
    if (done) return;
    done = true;
    stopTimer();
    onUpdate(text);
    onDone?.();
  };

  // Kick off on next tick so callers can capture the handle first.
  timer = setInterval(() => {
    if (done) return;
    if (pos >= text.length) {
      finish();
      return;
    }
    pos = Math.min(pos + charsPerTick, text.length);
    onUpdate(text.slice(0, pos));
  }, tickMs);

  return { finish, cancel };
}
