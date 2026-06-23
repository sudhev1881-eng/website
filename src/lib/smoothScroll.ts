/** Ease-out cubic — gentle deceleration at the end of scroll snaps */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function smoothScrollToY(
  targetY: number,
  duration = 1050,
  onComplete?: () => void
): void {
  const startY = window.scrollY;
  const distance = targetY - startY;
  if (Math.abs(distance) < 2) {
    onComplete?.();
    return;
  }

  const startTime = performance.now();

  const step = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    window.scrollTo(0, startY + distance * easeOutCubic(progress));

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      onComplete?.();
    }
  };

  requestAnimationFrame(step);
}

export function smoothScrollToElement(
  element: HTMLElement,
  options?: { duration?: number; offset?: number }
): void {
  const { duration = 1050, offset = 0 } = options ?? {};
  const targetY = element.getBoundingClientRect().top + window.scrollY + offset;
  smoothScrollToY(targetY, duration);
}
