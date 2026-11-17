# TikTok Shop Vietnam invitation

Thiệp mời cá nhân hóa dựng trên canvas rộng 1080 px, chiều cao theo tỉ lệ ảnh nền, dùng Vite + TypeScript và Canvas 2D; không cần backend.

## Chạy dự án

```sh
npm install
npm run dev
```

Tạo bản production bằng `npm run build`; Vite xuất trang tĩnh trong `dist/`, có thể deploy lên Vercel hoặc Netlify.

## Video MP4 và GitHub Pages

- `public/video/thiep-moi-phat-la-1080p.mp4`: bản MP4 H.264, 1080 × 1928, 30 fps, dài 8 giây, dựng từ ảnh PNG gốc với hiệu ứng, cắt đến hết dòng lưu ý dưới Dress Code.
- `public/video/index.html`: trang xem video và tải MP4, dùng được trên điện thoại.
- Workflow `.github/workflows/pages.yml` xuất bản trang video lên GitHub Pages mỗi khi đẩy nhánh `main`. Cấu hình Pages dùng GitHub Actions.
- Trên macOS, dựng lại video bằng `INVITATION_FONT=/duong-dan/BeVietnamPro-ExtraBold.ttf node scripts/export-mp4.mjs`. Script xuất vào `output/` và đọc lại để kiểm tra đủ 240 khung hình.

## Nội dung và asset

- Sửa ngày, địa điểm, mô tả, lịch trình, màu và thời lượng trong `src/config.ts`.
- `public/assets/group-2147255056-effects.gif` là nền động tiếng Việt của thiệp, được sao chép từ `output/group-2147255056-effects.gif`. `backgroundIncludesEffects: true` giữ các hiệu ứng có sẵn trong GIF. Ảnh `public/assets/phatla.png` được cắt vào khung tròn; tên mặc định “PHÁT LA” hiển thị in hoa màu cyan. Ô vuông bên dưới giữ nguyên nội dung nền.
- GIF được giải mã từng khung bằng `omggif` vào một canvas dùng lại, chạy theo cùng đồng hồ với bản xem trước và video tải xuống. Nút “Phát lại hiệu ứng” chạy lại từ đầu; nếu thiết bị bật giảm chuyển động, bấm “Chạy hiệu ứng” để chủ động bật chuyển động. Chạy `npm run check:effects` để kiểm tra khung hình, vòng lặp và đồng hồ ghi video.
- Xuất GIF bằng `npm run gif:export` hoặc `npm run gif:export -- "PHÁT LA"`. Lệnh tạo GIF lặp 8 giây, 20 fps và ảnh xem trước trong `output/`, dùng đúng các khung hình của GIF nền. Có thể dùng `--preview` để chỉ dựng ảnh xem trước. Tạo link tải trên máy bằng `python3 scripts/serve-download.py output/thiep-moi-tiktokshop-phat-la.gif --port 8771`.
- Thay ảnh preview chia sẻ trong `public/og-image.svg`; cập nhật nội dung preview trong `index.html`. Khi triển khai production, nên đổi `og:image` thành URL tuyệt đối cùng tên miền. Một PNG/JPG 1200 × 630 thường tương thích preview mạng xã hội rộng hơn SVG.
- Đặt biến môi trường build `VITE_SITE_URL=https://ten-mien-cua-ban.com` trên Vercel/Netlify để Vite tự tạo `og:image` URL tuyệt đối; khi chưa đặt, HTML giữ đường dẫn `/og-image.svg`.

## Link cá nhân hóa

Thêm tên khách vào query string, chẳng hạn `https://domain.com/invite?name=Nguyen+Van+A`. Có thể tạo URL an toàn bằng `new URL('/invite', domain)` rồi gọi `url.searchParams.set('name', guestName)`. Tên được trim, lọc ký tự điều khiển và giới hạn 30 ký tự Unicode.

## Xuất và chia sẻ

Thiệp ghi một vòng animation 8 giây từ frame đầu qua `canvas.captureStream(30)` và MediaRecorder. Chọn MP4 khi trình duyệt báo hỗ trợ, nếu không chọn WebM. Trình duyệt không hỗ trợ ghi canvas xuất PNG tĩnh; chế độ giảm chuyển động cũng xuất PNG. Chia sẻ dùng Web Share API: chia sẻ file video nếu hỗ trợ chia sẻ file, nếu không gửi liên kết. Trên thiết bị hỗ trợ chia sẻ file, lần bấm đầu chuẩn bị video và lần bấm kế tiếp mở bảng chia sẻ để đáp ứng yêu cầu user activation của trình duyệt. Không có GIF encoder trong bundle.

## Giới hạn trình duyệt

- MP4, codec được chấp nhận, chất lượng và giới hạn thời lượng tùy phiên bản trình duyệt; video lớn có thể tốn RAM đáng kể trên điện thoại.
- Safari iOS, Android Chrome và trình duyệt nhúng có thể giới hạn MediaRecorder, tải file, clipboard hoặc Web Share. HTTPS là điều kiện thực tế cần có cho các API chia sẻ hiện đại.
- Web Share chỉ hoạt động từ thao tác người dùng và phụ thuộc ứng dụng nhận. Một số in-app browser chặn lưu file hoặc chuyển sang app chia sẻ; khi đó trang nhắc người dùng chọn “Mở bằng trình duyệt”.
- Google Fonts cần kết nối mạng; nếu font không tải được, trình duyệt dùng sans-serif dự phòng. Các asset không có trong workspace hiện tại; thêm PNG thật vào `public/assets/` trước khi deploy để khớp thiết kế đính kèm.
