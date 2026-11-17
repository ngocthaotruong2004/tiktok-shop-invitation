import { eventConfig, makeFilename } from './config';
import type { InvitationTimeline } from './timeline';

export type RecordingResult = {
  blob: Blob;
  filename: string;
  mimeType: string;
};

export function supportsCanvasRecording(canvas: HTMLCanvasElement): boolean {
  return typeof MediaRecorder !== 'undefined' && typeof canvas.captureStream === 'function';
}

function chooseMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ].find((type) => MediaRecorder.isTypeSupported(type));
}

export async function recordInvitation(
  canvas: HTMLCanvasElement,
  timeline: InvitationTimeline,
  guestName: string,
  onProgress: (progress: number) => void,
): Promise<RecordingResult> {
  const mimeType = chooseMimeType();
  if (!mimeType || !supportsCanvasRecording(canvas)) {
    throw new Error('Trình duyệt chưa hỗ trợ ghi video từ thiệp.');
  }

  timeline.prepareRecording();
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];
  const recording = new Promise<Blob>((resolve, reject) => {
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    recorder.addEventListener('error', () => reject(new Error('Không thể tạo video trên trình duyệt này.')), { once: true });
    recorder.addEventListener('stop', () => resolve(new Blob(chunks, { type: mimeType })), { once: true });
  });

  recorder.start(250);
  try {
    await timeline.playOnce(onProgress, true);
    recorder.stop();
    const blob = await recording;
    const extension = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';
    return { blob, mimeType, filename: makeFilename(guestName, extension) };
  } catch (error) {
    if (recorder.state !== 'inactive') recorder.stop();
    throw error;
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

export async function downloadStaticCard(canvas: HTMLCanvasElement, guestName: string): Promise<string> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Không thể xuất ảnh thiệp.')), 'image/png');
  });
  const filename = makeFilename(guestName, 'png');
  downloadBlob(blob, filename);
  return filename;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const recordingDuration = eventConfig.durationSeconds;