export const eventConfig = {
  brand: 'TikTok Shop Vietnam',
  guestName: 'PHÁT LA',
  backgroundIncludesEffects: true,
  invitation: 'Thân mời,',
  description: 'Tham gia sự kiện Tiệc Tổng Kết Chương Trình',
  descriptionLines: [
    { y: 428, size: 36, weight: 600, parts: [{ text: 'Tham gia sự kiện', tone: 'white' }] },
    { y: 490, size: 52, weight: 800, parts: [{ text: 'Tiệc Tổng Kết Chương Trình', tone: 'cyan' }] },
  ],
  eventTitle: 'GALA NIGHT',
  guestRole: 'Nhà Sáng Tạo Nội Dung',
  partnerRole: 'Đối Tác Thương Hiệu',
  leadIn: 'Đến tham dự sự kiện',
  notesTitle: 'Lưu ý quan trọng',
  notes: [
    {
      creatorOnly: false,
      parts: [
        { text: 'Điểm đón khách tại ', tone: 'white' },
        { text: 'đường Điện Biên Phủ.', tone: 'cyan' },
      ],
    },
    {
      creatorOnly: false,
      parts: [
        { text: 'Mời quý khách ghé khu vực ', tone: 'white' },
        { text: 'Check-in và Photowall tại tầng G', tone: 'cyan' },
        { text: ' để lưu lại những khoảnh khắc đáng nhớ.', tone: 'white' },
      ],
    },
    {
      creatorOnly: false,
      parts: [
        { text: 'Vui lòng chuẩn bị sẵn ', tone: 'white' },
        { text: 'thư mời', tone: 'pink' },
        { text: ' và làm thủ tục check-in tại ', tone: 'white' },
        { text: 'tầng B2', tone: 'cyan' },
        { text: ' để quá trình diễn ra nhanh chóng.', tone: 'white' },
      ],
    },
    {
      creatorOnly: false,
      parts: [
        { text: 'Vui lòng xác nhận tham gia sự kiện với BTC ', tone: 'white' },
        { text: 'trước ngày 05/11/2026.', tone: 'pink' },
      ],
    },
    {
      creatorOnly: true,
      parts: [
        { text: 'Mỗi Nhà sáng tạo nội dung được dẫn theo ', tone: 'white' },
        { text: '01 Quản lý và 01 Trợ lý', tone: 'cyan' },
        { text: ' đi kèm. Vui lòng đăng ký sớm với BTC để được sắp xếp chỗ ngồi. ', tone: 'white' },
        { text: 'Số lượng có giới hạn.', tone: 'pink' },
      ],
    },
    {
      creatorOnly: false,
      parts: [
        { text: 'Trong suốt thời gian diễn ra sự kiện, khách mời vui lòng tuân thủ tuyệt đối các ', tone: 'white' },
        { text: 'quy định của pháp luật, nội quy của địa điểm tổ chức', tone: 'cyan' },
        { text: ' và các hướng dẫn từ Ban tổ chức.', tone: 'white' },
      ],
    },
  ],
  disclaimerTitle: 'Tuyên bố miễn trừ trách nhiệm',
  disclaimer: [
    'Khi tham dự sự kiện này, bạn đồng ý được chụp ảnh/quay phim và cho phép TikTok cũng như các đơn vị hợp tác của TikTok sử dụng công khai hình ảnh/bản ghi của bạn cho các mục đích thương mại và phi thương mại trên tất cả các phương tiện và nền tảng hiện được biết đến hoặc sẽ xuất hiện trong tương lai trên toàn thế giới.',
    'Bạn chịu trách nhiệm về tài sản và thân thể của mình. TikTok, địa điểm tổ chức sự kiện cũng như các nhà tổ chức sự kiện sẽ không chịu các trách nhiệm pháp lý và được bạn miễn trừ hết tất cả các trách nhiệm pháp lý (nếu có) về những thiệt hại hoặc thương tích của bạn.',
    'Bằng việc tham dự sự kiện, bạn sẽ không khiếu nại, khởi kiện hay làm ảnh hưởng đến TikTok với mọi trách nhiệm pháp lý về bất kỳ thiệt hại nào về tài sản cá nhân, hay thương tích về thân thể, của bất kỳ bên thứ ba nào vì lý do bạn tham gia sự kiện.',
  ],
  closing: 'BTC rất mong được đón tiếp Quý Khách!',
  date: '20.11.2026',
  schedule: '18:00 - 22:00, Ngày 20/11/2026.',
  venue: 'LANDMARK 81',
  address: [
    'Sảnh Saigon I & II,',
    '720A Điện Biên Phủ, Phường Thạnh Mỹ Tây, TPHCM',
  ],
  keyVisual: ['Hội', 'Chủ', 'CHỐT'],
  tagline: 'Nhà Sáng Tạo Bán Hàng Mới',
  dateTime: '20.11.2026',
  durationSeconds: 8,
  colors: {
    cyan: '#25F4EE',
    pink: '#FE2C55',
    white: '#F7F8FA',
    black: '#050709',
  },
  assets: {
    background: '/assets/group-2147255056-effects.gif',
    ribbonTop: '/assets/ribbon-top.png',
    ribbonBottom: '/assets/ribbon-bottom.png',
    bag: '/logo_update_bag.png',
    bagWhite: '/assets/bag_white.png',
    skyline: '/assets/skyline.png',
    logo: '/assets/logo.png',
    guestPhoto: '/assets/phatla.png',
  },
} as const;

export type CardVariant = {
  showGuestPhoto: boolean;
  animateBag: boolean;
  downloadAs: 'video' | 'image';
  showCreatorNote: boolean;
  layout: 'classic' | 'centered';
  guestRole: string;
};

const brandPath = '/brand&tiktok';
const testPath = '/test';
const testBrandPath = '/testbrand';

export function getCardVariant(pathname: string): CardVariant {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    // Keep the raw path when it is not valid percent-encoding.
  }
  const trimmed = path.replace(/\/+$/, '');
  if (trimmed === testBrandPath) {
    return { showGuestPhoto: false, animateBag: false, downloadAs: 'video', showCreatorNote: false, layout: 'centered', guestRole: eventConfig.partnerRole };
  }
  if (trimmed === testPath) {
    return { showGuestPhoto: true, animateBag: false, downloadAs: 'video', showCreatorNote: true, layout: 'centered', guestRole: eventConfig.guestRole };
  }
  if (trimmed === brandPath) return { showGuestPhoto: false, animateBag: false, downloadAs: 'image', showCreatorNote: false, layout: 'classic', guestRole: '' };
  return { showGuestPhoto: true, animateBag: true, downloadAs: 'video', showCreatorNote: true, layout: 'classic', guestRole: '' };
}

export function getGuestName(search: string): string {
  const requestedName = new URLSearchParams(search).get('name') ?? eventConfig.guestName;
  const normalized = requestedName
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return Array.from(normalized || eventConfig.guestName).slice(0, 30).join('');
}

export function makeFilename(name: string, extension: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'ngoc-thao-truong';

  return `thiep-moi-tiktokshop-${slug}.${extension}`;
}
