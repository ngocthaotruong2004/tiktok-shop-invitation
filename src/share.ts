export function isInAppBrowser(): boolean {
  return /FBAN|FBAV|Instagram|TikTok|Bytedance|Zalo/i.test(navigator.userAgent);
}
