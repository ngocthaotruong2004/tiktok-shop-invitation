import { GifReader } from 'omggif';

// Canvas drawImage(image) uses a GIF's first frame. Decode into one reusable
// canvas instead, so preview and video export share the same animation clock.
export class AnimatedGif {
  readonly canvas: HTMLCanvasElement;
  private readonly reader: GifReader;
  private readonly context: CanvasRenderingContext2D;
  private readonly pixels: ImageData;
  private readonly ends: number[] = [];
  private readonly duration: number;
  private index = -1;

  constructor(bytes: Uint8Array) {
    this.reader = new GifReader(bytes);
    let duration = 0;
    for (let index = 0; index < this.reader.numFrames(); index += 1) {
      const frame = this.reader.frameInfo(index);
      // This invitation retains previous pixels between its delta frames.
      if (frame.disposal > 1) throw new Error('GIF nền có chế độ khung hình chưa được hỗ trợ.');
      duration += Math.max(1, frame.delay) / 100;
      this.ends.push(duration);
    }
    if (!this.ends.length) throw new Error('GIF nền không có khung hình.');
    this.duration = duration;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.reader.width;
    this.canvas.height = this.reader.height;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Không thể khởi tạo hiệu ứng thiệp.');
    this.context = context;
    this.pixels = context.createImageData(this.canvas.width, this.canvas.height);
    this.frameAt(0);
  }

  frameAt(seconds: number): HTMLCanvasElement {
    // Round away floating-point drift at the 8 s loop boundary.
    const time = Math.max(0, seconds) % this.duration;
    let target = this.ends.findIndex((end) => time < end - 1e-6);
    if (target < 0) target = 0;
    if (target === this.index) return this.canvas;
    if (target < this.index) {
      this.pixels.data.fill(0);
      this.index = -1;
    }
    // Composite all skipped delta frames as well; storing only one RGBA buffer
    // keeps memory bounded instead of retaining 160 full-height bitmaps.
    while (this.index < target) {
      this.index += 1;
      this.reader.decodeAndBlitFrameRGBA(this.index, this.pixels.data);
    }
    this.context.putImageData(this.pixels, 0, 0);
    return this.canvas;
  }
}
