import { getCardVariant, getGuestName } from './config';
import { loadSceneAssets } from './scene';
import { InvitationTimeline } from './timeline';
import { downloadBlob, downloadStaticCard, recordInvitation, supportsCanvasRecording, type RecordingResult } from './recorder';
import { isInAppBrowser } from './share';
import './style.css';

function requireElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing invitation element: ${selector}`);
  return element;
}

const canvas = requireElement<HTMLCanvasElement>('#invitation-canvas');
const loading = requireElement<HTMLDivElement>('#loading');
const downloadButton = requireElement<HTMLButtonElement>('#download');
const replayButton = requireElement<HTMLButtonElement>('#replay');
const progress = requireElement<HTMLDivElement>('#progress');
const progressLabel = requireElement<HTMLSpanElement>('#progress-label');
const progressFill = requireElement<HTMLSpanElement>('#progress-fill');
const notice = requireElement<HTMLParagraphElement>('#notice');

const guestName = getGuestName(window.location.search);
const variant = getCardVariant(window.location.pathname);
let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const inAppBrowser = isInAppBrowser();
let timeline: InvitationTimeline | undefined;
let busy = false;

function setBusy(value: boolean): void {
  busy = value;
  downloadButton.disabled = value;
  replayButton.disabled = value;
  progress.hidden = !value;
}

function showStatus(message = ''): void {
  const browserHint = inAppBrowser
    ? 'Nếu tải xuống không bắt đầu, hãy chọn Mở bằng trình duyệt trong menu của ứng dụng.'
    : '';
  notice.textContent = [message, browserHint].filter(Boolean).join(' ');
}

function startProgress(label: string): void {
  progressLabel.textContent = label;
  progressFill.style.width = '0%';
  setBusy(true);
}

async function createVideo(): Promise<RecordingResult> {
  if (!timeline) throw new Error('Thiệp chưa sẵn sàng.');
  startProgress('Đang tạo thiệp…');
  try {
    const result = await recordInvitation(canvas, timeline, guestName, (value) => {
      progressFill.style.width = `${Math.round(value * 100)}%`;
    });
    return result;
  } finally {
    setBusy(false);
  }
}

replayButton.addEventListener('click', () => {
  if (busy || !timeline) return;
  reducedMotion = false;
  timeline.start(false);
  replayButton.textContent = 'Phát lại hiệu ứng';
  showStatus();
});

downloadButton.addEventListener('click', async () => {
  if (busy || !timeline) return;
  try {
    if (variant.downloadAs === 'image') {
      const filename = await downloadStaticCard(canvas, guestName);
      showStatus(`Đã tải ảnh thiệp ${filename}.`);
      return;
    }
    if (reducedMotion || !supportsCanvasRecording(canvas)) {
      const filename = await downloadStaticCard(canvas, guestName);
      showStatus(`Đã xuất ảnh tĩnh ${filename}. Trình duyệt này chưa hỗ trợ ghi video từ canvas.`);
      return;
    }
    const result = await createVideo();
    downloadBlob(result.blob, result.filename);
    showStatus(`Đã tạo ${result.filename}.`);
  } catch (error) {
    showStatus(error instanceof Error ? error.message : 'Không thể tạo thiệp lúc này.');
  }
});

async function initialize(): Promise<void> {
  try {
    const [assets] = await Promise.all([
      loadSceneAssets(),
      document.fonts.load('900 48px "Be Vietnam Pro"'),
      document.fonts.load('400 16px "Be Vietnam Pro"'),
      document.fonts.load('500 34px "Be Vietnam Pro"'),
      document.fonts.load('800 34px "Be Vietnam Pro"'),
      document.fonts.ready,
    ]);
    timeline = new InvitationTimeline(canvas, assets, guestName, variant, reducedMotion);
    timeline.start();
    loading.hidden = true;
    canvas.classList.add('is-ready');
    downloadButton.disabled = false;
    replayButton.disabled = false;
    if (reducedMotion) {
      replayButton.textContent = 'Chạy hiệu ứng';
      showStatus('Đang bật chế độ giảm chuyển động. Bấm “Chạy hiệu ứng” để phát thiệp động.');
    }
    else showStatus();
  } catch (error) {
    loading.textContent = error instanceof Error ? error.message : 'Không thể tải thiệp mời.';
  }
}

void initialize();
