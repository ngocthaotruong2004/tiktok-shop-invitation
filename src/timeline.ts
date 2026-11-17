import { eventConfig, type CardVariant } from './config';
import { drawScene, type SceneAssets } from './scene';

export class InvitationTimeline {
  private frameId = 0;
  private startedAt = 0;
  private readonly context: CanvasRenderingContext2D;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly assets: SceneAssets,
    private readonly guestName: string,
    private readonly variant: CardVariant,
    private reducedMotion: boolean,
  ) {
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D is not available in this browser.');
    this.context = context;
  }

  start(reducedMotion = this.reducedMotion): void {
    this.stopFrames();
    this.reducedMotion = reducedMotion;
    this.startedAt = performance.now();
    if (this.reducedMotion) {
      this.render(eventConfig.durationSeconds);
      return;
    }
    const tick = (now: number): void => {
      const elapsed = (now - this.startedAt) / 1000;
      this.render(elapsed);
      this.frameId = requestAnimationFrame(tick);
    };
    this.frameId = requestAnimationFrame(tick);
  }

  prepareRecording(): void {
    this.stopFrames();
    this.render(0);
  }

  playOnce(onProgress: (progress: number) => void, frameAlreadyRendered = false): Promise<void> {
    if (this.reducedMotion) {
      this.render(eventConfig.durationSeconds);
      onProgress(1);
      return Promise.resolve();
    }

    this.stopFrames();
    if (!frameAlreadyRendered) this.render(0);
    this.startedAt = performance.now();
    return new Promise((resolve) => {
      const tick = (now: number): void => {
        const elapsed = (now - this.startedAt) / 1000;
        const progress = Math.min(1, elapsed / eventConfig.durationSeconds);
        this.render(Math.min(elapsed, eventConfig.durationSeconds));
        onProgress(progress);
        if (progress < 1) {
          this.frameId = requestAnimationFrame(tick);
          return;
        }
        resolve();
        this.startIdle(now);
      };
      this.frameId = requestAnimationFrame(tick);
    });
  }

  private render(seconds: number): void {
    drawScene(this.context, this.assets, this.guestName, seconds, this.variant);
  }

  private startIdle(now: number): void {
    const tick = (frameTime: number): void => {
      const idleSeconds = eventConfig.durationSeconds + Math.max(0, frameTime - now) / 1000;
      this.render(idleSeconds);
      this.frameId = requestAnimationFrame(tick);
    };
    this.frameId = requestAnimationFrame(tick);
  }

  private stopFrames(): void {
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.frameId = 0;
  }
}
