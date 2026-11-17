declare module 'omggif' {
  export class GifReader {
    constructor(bytes: Uint8Array);
    readonly width: number;
    readonly height: number;
    numFrames(): number;
    frameInfo(index: number): {
      x: number;
      y: number;
      width: number;
      height: number;
      delay: number;
      disposal: number;
    };
    decodeAndBlitFrameRGBA(index: number, pixels: Uint8ClampedArray): void;
  }
}
