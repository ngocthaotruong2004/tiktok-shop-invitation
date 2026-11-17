import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { createCanvas } from '@napi-rs/canvas';
import omggif from 'omggif';

const root = path.resolve(import.meta.dirname, '..');
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'invitation-effects-check-'));
try {
  const outfile = path.join(temporary, 'effects.mjs');
  await build({
    stdin: {
      contents: `export { AnimatedGif } from './src/animatedGif'; export { InvitationTimeline } from './src/timeline'; export { getCardVariant } from './src/config';`,
      resolveDir: root,
      loader: 'ts',
    },
    bundle: true, platform: 'node', format: 'esm', outfile,
  });
  globalThis.document = { createElement: () => createCanvas(1, 1) };
  const { AnimatedGif, InvitationTimeline, getCardVariant } = await import(pathToFileURL(outfile));
  const bytes = await fs.readFile(path.join(root, 'public/assets/group-2147255056-effects.gif'));
  const reader = new omggif.GifReader(bytes);
  const animation = new AnimatedGif(bytes);
  const readPixels = canvas => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  const expected = index => {
    const pixels = new Uint8ClampedArray(reader.width * reader.height * 4);
    for (let frame = 0; frame <= index; frame += 1) reader.decodeAndBlitFrameRGBA(frame, pixels);
    return pixels;
  };
  const first = readPixels(animation.frameAt(0));
  for (const [seconds, index] of [[0, 0], [0.05, 1], [0.45, 9], [1, 20], [4, 80], [7.95, 159], [8, 0], [8.05, 1], [2, 40], [0, 0]]) {
    assert.deepEqual(readPixels(animation.frameAt(seconds)), expected(index), `Wrong GIF frame at ${seconds}s`);
  }
  const moving = readPixels(animation.frameAt(1));
  assert.notDeepEqual(moving.slice(0, reader.width * 1000 * 4), first.slice(0, reader.width * 1000 * 4), 'Effects must move');
  assert.deepEqual(moving.slice(reader.width * 1000 * 4), first.slice(reader.width * 1000 * 4), 'Invitation notes must remain intact');

  // Exercise the actual preview/replay/recording clock against the decoded GIF.
  let callback;
  globalThis.requestAnimationFrame = tick => { callback = tick; return 1; };
  globalThis.cancelAnimationFrame = () => { callback = undefined; };
  const canvas = createCanvas(1080, 1920);
  const timeline = new InvitationTimeline(canvas, { background: animation.canvas, backgroundAnimation: animation }, 'PHÁT LA', getCardVariant('/'), true);
  timeline.start();
  assert.equal(callback, undefined, 'Reduced motion must initially stay still');
  timeline.start(false);
  assert.equal(typeof callback, 'function', 'Explicit replay must enable animation');
  callback(performance.now());
  const previewStart = readPixels(canvas);
  callback(performance.now() + 1000);
  assert.notDeepEqual(readPixels(canvas), previewStart, 'Canvas preview must animate');
  timeline.prepareRecording();
  assert.deepEqual(readPixels(animation.canvas), expected(0), 'Recording must reset the GIF');
  let progress = 0;
  const recording = timeline.playOnce(value => { progress = value; }, true);
  callback(performance.now() + 1000);
  assert.notDeepEqual(readPixels(animation.canvas), expected(0), 'Recording must include moving GIF frames');
  callback(performance.now() + 8100);
  await recording;
  assert.equal(progress, 1);
  assert.equal(typeof callback, 'function', 'Animation must continue after recording');
  console.log('PASS: GIF frame timing, skipped frames, loop, backward seek, static notes, reduced motion, replay, canvas preview and recording timeline.');
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}
