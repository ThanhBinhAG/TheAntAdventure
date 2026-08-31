# Kế hoạch tái thiết kế UI/UX CRM du lịch

**Phiên bản:** 1.0  
**Phạm vi:** giao diện CRM nội bộ The Ant Adventures, không thay đổi nghiệp vụ, API, quyền hay cấu trúc dữ liệu.  
**Nguồn lực:** 2 dev full-stack/front-end, làm song song trong 8 tuần (8 sprint một tuần).  
**Mục tiêu:** biến CRM từ một tập hợp màn hình quản trị thành một không gian làm việc cho đội ngũ du lịch: bình tĩnh, rõ ưu tiên, giàu ngữ cảnh hành trình và nhanh trong thao tác lặp lại.

## 1. Kết quả cần đạt

Khi hoàn tất, người dùng có thể nắm việc cần làm và đi đến thao tác chính của từng màn hình trong một lần quét; dữ liệu dày đặc vẫn dễ đọc trên laptop; các thao tác bán tour, thiết kế tour và vận hành có ngôn ngữ giao diện thống nhất.

Các tiêu chí đầu ra:

| Trục | Kết quả cụ thể |
| --- | --- |
| Nhận diện du lịch | Bảng màu lấy cảm hứng từ rừng nhiệt đới, giấy ngà và nắng ấm; ảnh điểm đến được dùng có chủ đích tại catalogue, tour design, weather và proposal, không dùng ảnh nền trang trí tràn lan. |
| Trải nghiệm | Mỗi trang có page header, một CTA chính, bộ lọc rõ trạng thái, loading/empty/error nhất quán và đường đi rõ sang tác vụ kế tiếp. |
| Tính nhất quán | Token chung cho màu, chữ, khoảng cách, bo góc, đổ bóng, trạng thái; thành phần cơ sở dùng chung thay cho CSS/inline style rời rạc. |
| Khả dụng | Hoàn chỉnh desktop trước, đáp ứng tốt từ 360 px; sidebar drawer hoạt động với bàn phím; thao tác chạm tối thiểu 44 × 44 px. |
| Khả năng truy cập | WCAG 2.2 AA cho tương phản văn bản và focus; không chỉ truyền đạt trạng thái bằng màu; hỗ trợ `prefers-reduced-motion`. |
| An toàn kỹ thuật | Không đổi endpoint, DTO, phân quyền `PermissionGate`/`usePagePermission`, BFF hay luồng session; thay đổi giao diện có test hồi quy phù hợp. |

### Chỉ số đánh giá

Chụp baseline trước Sprint 1 và đo lại sau Sprint 8 với 5 người dùng đại diện (sales, điều hành tour, quản lý):

| Chỉ số | Cách đo | Mục tiêu sau làm lại |
| --- | --- | --- |
| Hoàn thành tác vụ cốt lõi | 5 tác vụ có kịch bản, không trợ giúp | ít nhất 90% hoàn thành |
| Thời gian tìm CTA | từ khi vào trang đến khi nhận ra hành động chính | giảm ít nhất 30% so với baseline |
| Thời gian tạo tour nháp | brief → chọn trải nghiệm → lưu nháp | giảm ít nhất 20% |
| Lỗi lọc/tìm dữ liệu | số lần chọn sai hoặc không biết đang có filter | giảm ít nhất 30% |
| Khả dụng mobile | kiểm tra 360, 768 và 1280 px trên 6 luồng P0 | không có tràn ngang ngoài bảng/lịch được bao rõ |
| Accessibility | keyboard walkthrough + Lighthouse/axe theo mẫu trang | không có lỗi critical/serious; AA đạt cho màu token |

## 2. Hiện trạng đã xác nhận

### 2.1 Nền tảng có thể tái sử dụng

Không thêm thư viện mới trong kế hoạch này. Dùng lại các dependency đã có:

| Có sẵn | Dùng trong thiết kế lại |
| --- | --- |
| `antd` 6 + `@ant-design/icons` | `ConfigProvider`/token, Button, Dropdown, Drawer, Modal, Tabs, Table, Form, Input, Select, DatePicker, Segmented, Tag, Badge, Empty, Skeleton, Tooltip và Result. Icon Ant Design thay cho emoji/biểu tượng màu rời rạc ở shell và CTA. |
| `@ant-design/nextjs-registry` | Mở rộng registry từ phạm vi Access Control sang provider CRM **chỉ khi** các component AntD được SSR trong CRM; phải kiểm tra bundle `/login` vẫn không tải phần CRM. |
| `chart.js` + `react-chartjs-2` | Giữ biểu đồ Dashboard, chỉ chuẩn hóa palette, tooltip, legend, empty/loading và thứ tự ưu tiên dữ liệu. |
| `@dnd-kit/*` | Giữ kéo-thả trải nghiệm trong Tour Design; bổ sung focus, chỉ báo vị trí, hướng dẫn bàn phím và trạng thái lưu. |
| `react-easy-crop`, `browser-image-compression`, `sharp` | Giữ luồng ảnh và logo; tái sử dụng `StorageImage`/gallery để lấy ảnh điểm đến, không dùng CDN ảnh hoặc API trả phí. |
| `SWR`, `Zustand`, `Zod` | Giữ data loading, cache, validation hiện có; không chuyển state chỉ để đổi UI. |

### 2.2 Audit giao diện hiện tại

Các nhận định dưới đây là cơ sở ưu tiên, không phải yêu cầu sửa mọi phần trong một lần:

| Phát hiện | Bằng chứng trong mã | Hướng xử lý |
| --- | --- | --- |
| Đã có hạt nhân nhận diện phù hợp | `app/globals.css` có xanh rừng `--g/#2E7D52`, xanh đậm, gold, nền ngà và font DM Sans/DM Serif fallback. | Giữ tinh thần xanh–ngà–gold, thay token cũ bằng hệ semantic có đủ mức surface/text/border; không chuyển sang tím/neon hoặc gradient. |
| CSS toàn cục đang ôm quá nhiều domain | `app/globals.css` có 2.895 dòng và breakpoint đan xen từ 480 đến 1.400 px. | Không viết lại “big bang”; trích token + primitive trước, sau đó di chuyển CSS theo page/module sau mỗi nhóm P0/P1. |
| Shell đã có nền tảng responsive | `CRMShell`, `Sidebar`, `Topbar` đã hỗ trợ pin/unpin, drawer, Escape; sidebar chuyển tại 800 px. | Giữ hành vi đã quen; làm lại hierarchy, nhóm menu, focus trap/drawer và trạng thái active thay vì thay router. |
| Điều hướng quá dài với nhiều màu icon | `NAV_SECTIONS` có 5 nhóm và `Sidebar` tô màu từng icon. | Gộp theo hành trình công việc, dùng một icon neutral/active trong shell; badge chỉ xuất hiện khi có tín hiệu hành động thật. |
| Các trang dùng pattern không đồng nhất | Có `card`, `tbl`, `tabs`, `search-row`, nhiều modal và inline style trong domain components. | Tạo PageFrame, CommandBar, DataTableShell, StatusTag, EmptyState/Skeleton/ErrorState và Dialog chuẩn; migrate dần. |
| Nhiều luồng du lịch tốt đã có | Tour Design 5 bước, Products, Bookings, Sales pipeline, Gallery, Weather, Guides, Pricing, Suppliers. | Giữ mô hình và API, nâng nội dung ngữ cảnh: khách nào, chuyến nào, ngày khởi hành nào, việc tiếp theo là gì. |
| Accessibility có nền nhưng chưa đồng đều | Có `aria-*`, skeleton và focus rải rác; một số tab/card dùng `div role="button"`. | Ưu tiên native `button`, cấu trúc heading và keyboard; không dùng màu làm tín hiệu duy nhất. |
| AntD mới đang được khoanh ở Access Control | `AccessControlUiProvider` là nơi dùng `AntdRegistry` và `ConfigProvider`. | Có một dev sở hữu quyết định mở rộng provider CRM; không để từng domain tự tạo theme hoặc registry. |

### 2.3 Ràng buộc không được phá vỡ

- Route CRM tiếp tục đi qua `app/(crm)/[page]`, `VALID_PAGES`, `PAGE_COMPONENTS`, `PermissionGate` và `PageDataGate`.
- Mọi nút ghi dữ liệu tiếp tục dùng BFF hiện có, quyền hiện có, `toast` và `confirmDialog`; không gọi Supabase từ browser.
- Giữ URL `tourdesign` (không đổi thành `tour-design`), pagination server-side và contract BFF hiện hữu.
- Không thay đổi thứ tự trạng thái sales, dữ liệu booking, logic proposal/PDF, tải ảnh `StorageImage`, hay hành vi xác thực.
- Không đặt ảnh nền lớn trên shell/dashboard; ưu tiên ảnh thumbnail có sẵn, lazy-load và có placeholder.

## 3. Design contract

### 3.1 Người dùng, mục tiêu và thao tác chính

| Persona | Việc chính | Màn hình ưu tiên | CTA phải nổi bật |
| --- | --- | --- | --- |
| Sales | nắm lead nóng, follow-up, gửi sang Tour Design | Dashboard, Sales, Customers | Thêm lead/khách, cập nhật follow-up, bắt đầu thiết kế tour |
| Tour designer | chuyển brief thành itinerary và proposal | Tour Design, Products, Gallery, Pricing | Chọn trải nghiệm, lưu outline, gửi proposal |
| Điều hành | bảo đảm chuyến đi sẵn sàng và xử lý thay đổi | Bookings, Guides, Suppliers, Weather, Attractions | Tạo booking, phân guide, ghi nhận thay đổi |
| Quản lý | nhìn doanh số, rủi ro chuyến đi, công việc quá hạn | Dashboard, Planner, Finance | Mở danh sách cần xử lý, giao việc |

Nguyên tắc: tại một thời điểm giao diện trả lời ba câu hỏi theo thứ tự: **đây là gì**, **cái gì cần chú ý**, **tôi làm gì tiếp theo**.

### 3.2 Kiến trúc thông tin mục tiêu

Không xóa route hoặc quyền; chỉ đổi nhãn nhóm và thứ tự hiển thị theo công việc. Kiểm tra bản thử với người dùng trước khi sửa `NAV_SECTIONS`.

| Nhóm sidebar mới | Nội dung | Quy tắc |
| --- | --- | --- |
| Tổng quan | Dashboard, Daily Planner | Luôn ở đầu; badge chỉ cho việc quá hạn/đang chờ. |
| Bán tour | Clients, B2B Agents, Sales Pipeline, Tour Design | Cùng một hành trình lead → thiết kế → chốt. |
| Sản phẩm & cảm hứng | Tour Products, Photo Gallery, Weather Guide, Attractions, Pricing | Không lặp nút “create”; dùng liên kết ngữ cảnh giữa product/photo/weather. |
| Vận hành chuyến đi | Bookings, Contracts, Suppliers, Guides, Post-tour | Ưu tiên booking sắp khởi hành và ngoại lệ. |
| Quản trị | Finance, Tax, Salary, Company Portal, Access Control, Dev Notes | Thu gọn mặc định, chỉ mở khi cần. |

Quy tắc navigation:

- Desktop ≥ 1.200 px: sidebar cố định 256 px, tên nhóm rõ, cho phép thu gọn từng nhóm.
- Tablet 768–1.199 px: sidebar 72 px ở chế độ compact hoặc drawer; tooltip tên item.
- Mobile < 768 px: drawer, overlay, focus được giữ trong drawer khi mở, Escape/overlay đóng, link được chạm tối thiểu 44 px.
- Topbar chứa breadcrumb ngắn `Nhóm / Trang`, tìm kiếm nhanh (phase 2) và menu hồ sơ; tiêu đề dài không dùng emoji để truyền nghĩa.

### 3.3 Bố cục chuẩn cho mọi trang

```
Breadcrumb (nếu cần)
Tên trang + mô tả một dòng                      [secondary] [CTA chính]
Tóm tắt / cảnh báo có thể hành động (tuỳ trang)
Thanh lệnh: tìm kiếm | bộ lọc | view/sort | [clear n filters]
Nội dung chính: bảng / card / kanban / wizard
Pagination hoặc action footer
```

- Page header không quá hai dòng; CTA chính duy nhất là solid green. Action phụ là outline/ghost hoặc `Dropdown`.
- Command bar giữ bộ lọc thường dùng mở sẵn; filter hiếm đưa vào `Drawer` trên hẹp và popover/dropdown trên rộng.
- Bảng lớn có sticky header, cột nhận diện và action; mobile chuyển thành card list, ngoại trừ lịch/bảng giá vẫn cho cuộn ngang có nhãn/hướng dẫn rõ.
- Phần hiển thị theo vai trò không được chỉ ẩn bằng CSS: giữ `PermissionGate` và quyền write hiện có.

### 3.4 Visual direction: “calm journeys, confident operations”

**Tỉ lệ màu 60–30–10:** nền giấy/neutral 60%, surface và green soft 30%, green action hoặc gold context 10%. Không dùng gradient trên text, button hoặc surface; không dùng purple/neon làm primary.

| Nhóm token | Giá trị đề xuất | Dùng cho |
| --- | --- | --- |
| `color.bg.canvas` | `#F7F8F4` | nền app, nhẹ và ấm hơn trắng thuần |
| `color.bg.surface` | `#FFFFFF` | card, table, modal |
| `color.bg.subtle` | `#EEF3ED` | command bar, selected subtle, skeleton track |
| `color.brand.primary` | `#276749` | CTA, focus theme, active navigation |
| `color.brand.strong` | `#1F5139` | hover/pressed, sidebar |
| `color.brand.soft` | `#E4F2E8` | selected background, tag positive |
| `color.accent.sun` | `#B7791F` | highlight hành trình, số liệu phụ; không thay CTA |
| `color.text.primary` | `#183126` | heading, số liệu chính |
| `color.text.secondary` | `#607368` | helper/meta |
| `color.border.default` | `#D8E1D9` | border/divider |
| `color.status.*` | success `#26734D`, warning `#B45309`, error `#B42318`, info `#2463A6` | status + icon + text, không chỉ màu |

Typography và layout:

| Token | Giá trị | Ghi chú |
| --- | --- | --- |
| `font.sans` | DM Sans fallback system hiện có | văn bản, control, số liệu bảng |
| `font.editorial` | DM Serif fallback hiện có | chỉ dashboard value lớn, title/cover proposal; không dùng trong form/bảng |
| `text.xs/sm/md/lg/xl/2xl` | 12 / 14 / 16 / 20 / 24 / 32 px | body mặc định 14 px; không quá 3 cỡ chữ chính một khu vực |
| `space.1…8` | 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 px | grid 4 px, khoảng cách section 32–40 px |
| `radius.sm/md/lg` | 8 / 12 / 16 px | control/card/modal; không tạo radius tuỳ tiện |
| `shadow.raised/overlay` | nhẹ / modal | shadow chỉ biểu thị elevation, không trang trí |
| motion | hover 120 ms, component 180 ms, panel 220 ms | `ease-out`; tắt/chỉ fade khi reduced motion |

### 3.5 Thành phần và đầy đủ trạng thái

Mỗi primitive được định nghĩa một API và stylesheet/token duy nhất. Dev không tự thêm “button/page-card/blue-tag” biến thể mới nếu chưa kiểm tra các primitive dưới đây.

| Component | Cách làm | Bắt buộc có |
| --- | --- | --- |
| `CrmButton` / AntD Button theme | Wrapper nhẹ quanh `antd/Button` hoặc class hiện có trong giai đoạn chuyển tiếp | primary, secondary, tertiary, danger; default/hover/pressed/focus/disabled/loading; icon có nhãn accessible. |
| `PageFrame` + `PageHeader` | component local | breadcrumb, h1, description, action slot, responsive stacking. |
| `CommandBar` | local, ghép Input/Select/DatePicker/Dropdown AntD | search debounce theo contract hiện có, filter count, clear all, mobile drawer. |
| `DataTableShell` | Table AntD hoặc table semantic hiện hữu theo từng domain | loading Skeleton, empty có CTA, error + retry, sticky header, pagination, mobile card fallback. |
| `StatusTag` | local mapping từ status business hiện hữu | text + icon + semantic color; không hard-code hex trong page. |
| `MetricCard` | local + Chart.js | label, value, delta/period, loading, zero, unavailable; số dùng tabular figures. |
| `JourneyCard` | local cho booking/lead/tour | destination/image optional, journey date, guest, owner, status, next action. |
| Dialog/Drawer | AntD Modal/Drawer dần thay overlay custom | focus trap, Escape, overlay click theo mức rủi ro, title/description, sticky action footer, destructive confirm. |
| Feedback | `ToastHost`, `confirmDialog`, AntD Empty/Skeleton/Result có theme | không `alert`, không spinner trống, mọi mutation có pending/success/error. |

### 3.6 Ma trận responsive

| Vùng | 360–479 px (narrow) | 480–1.199 px (medium) | ≥ 1.200 px (wide) |
| --- | --- | --- | --- |
| Shell | topbar 56 px, drawer, 16 px gutter | compact/drawer sidebar, 20 px gutter | sidebar 256 px, 24 px gutter |
| Header/CTA | xếp dọc, CTA full width nếu là action chính | wrap action | cùng hàng, action bên phải |
| KPI | 1 cột | 2 cột | 4 cột hoặc theo nội dung |
| Command bar | search + “Filters” drawer; chips cuộn ngang | wrap hai hàng | một hàng ưu tiên, advanced trong menu |
| Table/kanban | card list; kanban cuộn ngang có nhãn | table scroll container hoặc 2–3 cột | table đầy đủ hoặc kanban 6 cột |
| Wizard Tour Design | stepper ngang cuộn/step label rút gọn; action sticky bottom | stepper đầy đủ, panel xếp dọc khi cần | main + inspector/preview rail |
| Modal | full-screen drawer/dialog | tối đa 90vw | max-width theo tác vụ, không quá 960 px |

### 3.7 Accessibility và nội dung

- Tiêu đề trang dùng đúng một `h1`; section dùng `h2`; label form liên kết input; lỗi có `aria-invalid` và thông điệp ngay cạnh field.
- Focus ring 2 px primary, `outline-offset: 2px` cho tất cả element tương tác, không xóa outline mặc định nếu chưa có thay thế.
- Chuyển các `div role="button"` trong phạm vi P0 thành `button` hoặc bổ sung Enter/Space, focus, disabled đúng nghĩa; ưu tiên native button.
- Dialog trả focus về trigger khi đóng; tab dùng semantic tablist/tab; drawer khóa focus khi mở.
- `prefers-reduced-motion`: bỏ transform/marquee/shimmer liên tục, giữ phản hồi tức thời không gây nhảy layout.
- Nhãn status/biểu đồ luôn kèm text/icon/pattern. Biểu đồ có table/summary tương đương cho screen reader.
- Chuẩn hóa bản dịch qua `useLanguage` và resource i18n trước khi sửa copy. Không trộn “Client/Customer/Khách hàng” cho cùng một thực thể trong cùng ngôn ngữ.

## 4. Phạm vi theo mức ưu tiên

| Mức | Trang/luồng | Kết quả UX | Lý do |
| --- | --- | --- | --- |
| P0 | Shell, Dashboard, Sales, Clients, Tour Design, Products, Bookings | hành trình bán tour và vận hành có page frame/command bar/feedback đồng nhất; Tour Design là trung tâm trải nghiệm | tần suất và giá trị nghiệp vụ cao nhất |
| P1 | Planner, Gallery, Weather, Attractions, Pricing (3 trang), Suppliers, Guides, Contracts, Post-tour | điều hành và dữ liệu sản phẩm có thiết kế nhất quán; ảnh và thông tin điểm đến tạo cảm hứng có kiểm soát | bổ trợ trực tiếp P0 |
| P2 | Finance, Tax, Salary, About, Culture, Regulations, HR, AI, Dev Notes, Team Chat, Access Control | áp dụng shell/token/primitive, chỉ tái bố cục sâu khi có nhu cầu được xác nhận | không làm chậm hành trình bán-vận hành |

**Ngoài phạm vi đợt này:** thay brand/logo, thay dữ liệu mẫu, sửa schema/API, xây customer-facing booking portal, mua UI kit/Figma plugin/ảnh stock, hoặc đổi toàn bộ trang P2 theo kiểu big-bang.

## 5. Thay đổi UX cụ thể theo luồng P0

### 5.1 Dashboard: từ “báo cáo” thành “bàn điều hành sáng nay”

1. Header hiển thị lời chào theo thời điểm, kỳ dữ liệu và một CTA theo quyền: `Tạo lead` hoặc `Mở Daily Planner`.
2. Hàng đầu là 4 metric có thể hành động: lead cần follow-up, giá trị pipeline, booking sắp khởi hành, công việc quá hạn. Mỗi card mở đúng danh sách đã lọc.
3. Thay biểu đồ không ưu tiên bằng “Attention rail”: follow-up hôm nay, payment cần xử lý, chuyến khởi hành 7 ngày, outline chờ duyệt. Tất cả có count, deadline và deep link.
4. Chart.js dùng palette token, tooltip có tên + số + kỳ; khi không có dữ liệu dùng empty copy và link tạo dữ liệu, không để chart rỗng.
5. Không nhồi dashboard: giữ tối đa một insight chính/chart trong mỗi khối; summary finance cao cấp nằm ở Finance.

### 5.2 Sales và Clients: một bề mặt bán tour liên tục

1. Sales mặc định Pipeline; toolbar cho search, time filter, stage, “Clear N filters” và chuyển Pipeline/List. Lưu/đọc filter URL khi hiện có, không tạo state trùng lặp.
2. Mỗi lead card chỉ có: khách, destination/travel date, giá trị/probability, follow-up kế tiếp, owner và status; action còn lại trong menu. Card quá hạn có icon + text, không chỉ viền đỏ.
3. Quick action trên card: `Follow up`, `Open client`, `Start design`, `Confirm`; action phụ trong dropdown để giảm dày đặc.
4. Clients dùng cùng CommandBar/StatusTag; list giữ pagination BFF và mở profile drawer/modal. Profile có timeline rõ `Inquiry → Designing → Quoted → …` với thời điểm và next action.
5. Form khách/lead chia section “Thông tin liên hệ”, “Nhu cầu chuyến đi”, “Nguồn & owner”; validation inline, field lỗi đầu tiên nhận focus khi submit thất bại.

### 5.3 Tour Design: studio có định hướng thay vì wizard nhiều chi tiết

1. Stepper 5 bước giữ nguyên nghiệp vụ nhưng mỗi bước có mô tả outcome và trạng thái `Not started / In progress / Ready`; không cho nhảy sang bước thiếu dữ liệu bắt buộc mà không nêu lý do.
2. Header session cố định: khách, destination, ngày đi, số khách, draft status và `Save`. Queue cards chuyển thành notification/task drawer, không cạnh tranh với CTA chính.
3. Step Experiences: filter theo destination/loại/nhịp độ, card ảnh từ Gallery/StorageImage, thông tin ngắn, selected tray; kéo-thả dùng dnd-kit có keyboard instruction và announce vị trí.
4. Step Outline: timeline ngày theo ngày với summary ngày; thao tác edit/add/remove rõ; preview có chế độ split trên wide, stacked trên medium/narrow.
5. Step Pricing: phân tách `base`, optional và hotel rates; hiển thị currency/đơn vị pax nhất quán; thay đổi có confirmation nếu ảnh hưởng proposal.
6. Step Proposal: preview A4 giữ luồng export hiện hữu, inspector rail sticky desktop; mobile chuyển preview trước và panel setting dạng drawer; loading export có progress/text.
7. Auto-save chỉ khi contract hiện tại cho phép; nếu không, nhãn trạng thái rõ `Unsaved changes`, `Saving…`, `Saved at …`, `Save failed — Retry`.

### 5.4 Products và Bookings: catalogue giàu ngữ cảnh, vận hành ít sai sót

1. Products: hero/filter không quá lớn; command bar theo region, destination, duration, category, price. Product card ưu tiên ảnh thumb, title, destination, duration, price-from, tag loại tour và CTA `Open`; card đồng chiều cao để scan nhanh.
2. Product drawer chia Overview/Itinerary/Included/Pricing/Media; edit panel dùng section + sticky save bar; ảnh absent có `DestinationCoverPlaceholder` thay vì vùng trống.
3. Bookings: 4 KPI vận hành ở đầu (upcoming, on tour, payment due, changes). Bảng desktop có column đúng thứ tự hành động: booking/khách/tour/ngày/status/financial/action; mobile JourneyCard.
4. Booking detail nhấn journey timeline và tình trạng payment; form tạo/sửa giữ validation hiện có, bổ sung inline helper (pax, date, deposit) và error summary.
5. “On Tour”/“change” là signal giàu ngữ nghĩa: icon + text + accessible tag, không chỉ highlight hàng.

## 6. Kế hoạch triển khai cho hai dev

### 6.1 Phân vai cố định

| Dev | Chủ sở hữu | Không tự ý đụng nếu chưa thống nhất |
| --- | --- | --- |
| **Dev 1 — Foundation & shell** | token CSS/AntD theme, CRM provider quyết định SSR, typography, shell/sidebar/topbar, primitive chung, dashboard, responsive/accessibility QA, visual regression và giới hạn bundle | logic domain, DTO/API, các file P0 do Dev 2 đang chỉnh |
| **Dev 2 — Journey & domain UX** | discovery task, page frame sử dụng primitive, Sales/Clients/Tour Design/Products/Bookings, form/modal/table migration, copy/i18n, domain acceptance | token base, shell, ConfigProvider/AntD registry, code dashboard do Dev 1 sở hữu |

Quy tắc phối hợp:

1. `docs/UI-UX-REDESIGN-PLAN-vi.md` là contract; mỗi thay đổi pattern phải cập nhật catalog/Story trước khi áp dụng trang thứ hai.
2. Dev 1 merge token/primitive trước khi Dev 2 migrate page; Dev 2 dùng adapter tạm nếu component chung chưa sẵn sàng, không copy CSS.
3. Chỉ một dev sửa `app/globals.css` phần token chung trong mỗi PR. CSS theo domain ở stylesheet/module đã được thống nhất theo folder owner.
4. PR không trộn refactor BFF với redesign UI. Nếu phát hiện lỗi nghiệp vụ, mở issue/link riêng và giữ UI PR không đổi contract.
5. Mỗi ngày 15 phút: chốt pattern mới, file ownership hôm nay, breakpoint lỗi và ảnh hưởng UI; thứ Sáu demo 3 task từ branch tích hợp.

### 6.2 Backlog theo sprint

Mỗi sprint kết thúc bằng bản triển khai trên staging, keyboard walkthrough 3 viewport và evidence (screenshot/video ngắn + checklist). Ngày công dưới đây là ước tính thực hiện, không bao gồm chờ feedback.

| Sprint | Dev 1 | Dev 2 | Cổng nghiệm thu / phụ thuộc |
| --- | --- | --- | --- |
| **S0 — Discovery & baseline** (3 ngày) | Audit shell/CSS 2.895 dòng, map breakpoint và bundle; inventory token/component; tạo checklist a11y. | Walkthrough 5 task với user, inventory P0 component/state/copy, lập screen map/wireframe low-fi. | Product owner chấp thuận IA, visual direction, P0, 5 task đo baseline. Không code UI lớn. |
| **S1 — Foundations** | Tạo semantic token, `CrmThemeProvider`/quyết định registry, reset focus/motion, primitive Button/StatusTag/Feedback. | Viết spec PageFrame, PageHeader, CommandBar, DataTableShell; prototype trên một màn hình mẫu không mutation. | Token contrast pass; `/login` không bị kéo CRM AntD bundle; design contract review. |
| **S2 — Shell & Dashboard** | Redesign Sidebar, Topbar, responsive drawer, breadcrumb; Dashboard metric/attention rail/chart theme. | Migrate Dashboard action/deep link copy; chuẩn hóa Empty/Skeleton/Error trên dashboard, review chức năng theo quyền. | 360/768/1280; tab/escape/focus; dashboard không thay API và chart có fallback. |
| **S3 — Sales & Clients** | Hỗ trợ DataTableShell, StatusTag mapping, responsive card-list, visual test harness. | Redesign Sales Pipeline/List và Clients/list/profile/form bằng primitive. | 5 kịch bản lead/client pass; state filter/pagination/BFF không regress. |
| **S4 — Tour Design** | Cải thiện layout rail/preview/responsive; dnd-kit keyboard/reduced-motion; dialog foundation nếu cần. | Redesign 5 step và queue/session header; migrate selected experience/outline/pricing/proposal copy. | Tạo tour nháp, reorder, save outline, export preview; wide + narrow pass. |
| **S5 — Products & Bookings** | Product/JourneyCard, media loading/skeleton/performance; table-to-card responsive. | Migrate catalog/drawer/edit; bookings KPI, list, detail, form. | Tạo/sửa booking và product; image fallback; keyboard/error state pass. |
| **S6 — P1 operational** | Apply shell/primitives to Planner, Weather, Gallery, Attractions; audit global CSS removal. | Apply patterns to Pricing, Suppliers, Guides, Contracts, Post-tour; check i18n/copy. | Không phát sinh class/token lặp; 6 màn P1 smoke pass. |
| **S7 — P2, hardening & release** | P2 skin tối thiểu, performance/lint/typecheck/test, Lighthouse/axe, bundle check, regression fixes. | Usability retest 5 task, triage feedback, release notes và handoff content. | Toàn bộ acceptance matrix xanh; stakeholder sign-off + rollback steps. |

### 6.3 Chi tiết hoàn thành của từng sprint

#### S0 — Discovery & quyết định trước khi code

- Dev 2 chuẩn bị 5 task test: tìm lead cần follow-up; tạo khách và vào Tour Design; chọn/reorder trải nghiệm; tạo booking và kiểm tra payment; kiểm tra weather/ảnh điểm đến cho proposal.
- Hai dev chụp ảnh hiện trạng desktop/mobile và đánh dấu điểm ma sát: CTA không rõ, field quá dày, bảng tràn, action lặp, màu không mang nghĩa.
- Tạo inventory: trang → user → CTA → data/loading/empty/error → desktop/mobile → owner. Có thể đặt vào issue/board, không cần thêm SaaS.
- Chốt vocabulary: `Khách hàng`, `Lead`, `Tour`, `Booking`, `Khởi hành`, `Điểm đến`, `Việc tiếp theo`; lập bảng EN/VI nếu người dùng chọn hai ngôn ngữ.
- **Exit:** owner phê duyệt IA + visual direction + nội dung P0, không còn câu hỏi mở làm thay đổi schema/route.

#### S1 — Foundation implementation

- Dev 1 chuyển `:root` từ token viết tắt (`--g`, `--b`, …) sang semantic token; giữ alias tương thích trong một sprint để không làm vỡ page chưa migrate, rồi ghi task loại alias.
- Xác định mô hình AntD: nếu CRM dùng SSR AntD, tạo provider CRM bên trong route group với `AntdRegistry`; nếu không cần SSR component AntD thì không nới registry. Không đặt provider ở `app/layout.tsx` vì login phải nhẹ theo contract hiện có.
- Dev 1 cấu hình AntD token (`colorPrimary`, `borderRadius`, `fontFamily`, `controlHeight`, component tokens cho Button/Input/Modal/Table/Tabs) và CSS của primitive custom.
- Dev 2 viết spec/ví dụ cho thành phần chung, bao gồm API, responsive và đủ state. Mọi prototype dùng dữ liệu giả cục bộ, không chạm store/API.
- **Exit:** page mẫu có default/hover/focus/disabled/loading/empty/error; token AA đã kiểm tra; không có inline hex mới.

#### S2 đến S6 — migration theo “vertical slice”

Mỗi vertical slice phải đi đủ các bước trước khi sang trang kế tiếp:

1. Xác định persona, outcome, CTA, fields/bảng nào giữ lại và fields nào vào disclosure.
2. Dùng PageFrame + CommandBar + primitive thay vì thêm class global.
3. Bảo toàn fetch, mutation, permission, URL query và pagination hiện có.
4. Thử state data thật/fixture: loading, empty, network error, read-only, disabled, mutation pending/success/error.
5. Thử 360/768/1280, mouse + keyboard + touch; so sánh payload mạng để không có fetch lặp gây chậm.
6. Thêm/sửa unit/E2E test khi selector/luồng người dùng thay đổi; review trực quan trước merge.

#### S7 — stabilization và phát hành

- Chạy `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` và `npm run test:e2e` trên môi trường có target phù hợp; xử lý lỗi trước khi release.
- Manual test permission `read-only`/`write` ở mỗi luồng P0: CTA ẩn/disabled đúng, không bypass mutation.
- Re-run 5 task S0, tổng hợp thời gian/lỗi/ý kiến và chỉ giữ fix đáp ứng mục tiêu. Những ý tưởng mới vào backlog sau release.
- Ghi hướng dẫn component/token, bảng page-owner, ảnh trước/sau và rollback: feature flag/CSS rollback theo PR, không rollback database vì sprint này không có migration.

### 6.4 Definition of Done cho một trang

- [ ] Page header, CTA, command bar và hierarchy theo contract.
- [ ] Sử dụng token/primitive có sẵn; không thêm màu/spacing/font/radius tự do.
- [ ] Đủ default, hover, focus, disabled, loading, empty, error và read-only state nếu áp dụng.
- [ ] Không đổi API/BFF/Zustand schema, permission, route slug hay URL filter hiện hữu.
- [ ] Không lỗi/tràn ở 360, 768, 1.280 px; bảng/lịch tràn có wrapper + hướng dẫn.
- [ ] Keyboard: tab order hợp lý, focus visible, Enter/Space hoạt động, modal/drawer Escape và trả focus.
- [ ] Màu/status có text/icon; contrast AA; reduced motion có hiệu lực.
- [ ] Unit/E2E affected pass; lint/typecheck pass; reviewer kiểm tra visual bằng screenshot.
- [ ] i18n/copy nhất quán và loading/empty/error giúp người dùng biết làm gì tiếp.

## 7. Handoff kỹ thuật đề xuất

### 7.1 Cấu trúc đích (để triển khai ở sprint 1)

Đây là hướng tổ chức, không tạo folder trước khi có code. Khi tạo folder mới phải thêm `AGENTS.md` theo quy ước repository.

```
components/
  crm-ui/                 # primitive dùng chung: PageFrame, CommandBar, StatusTag…
  dashboard/              # giữ ownership dashboard hiện có
  sales/                  # giữ ownership domain hiện có
  tour-design/            # giữ ownership domain hiện có
app/
  globals.css             # reset + token + shell tối thiểu; không chứa style domain mới
```

`crm-ui/` chỉ chứa presentation/accessibility. Domain data, BFF và workflow vẫn ở `lib/<domain>` và hooks hiện có. Mỗi page chỉ compose primitive và domain component; không biến `crm-ui` thành nơi chứa logic Sales/Booking/Tour Design.

### 7.2 Chuyển đổi CSS an toàn

1. Đưa token semantic vào đầu `app/globals.css`; thay token cũ theo từng vùng đã có visual review.
2. Với primitive: tạo class có namespace rõ (`crm-…`) hoặc CSS module theo convention được chốt; không tạo selector generic mới như `.card`/`.tab` mà page nào cũng có thể vô tình kế thừa.
3. Với domain: giữ style gần component/domain; chỉ xóa CSS cũ sau khi screen P0/P1 tương ứng đã được test ở ba viewport.
4. Theo dõi CSS dead code bằng search/Knip phù hợp, nhưng không xóa selector trong cùng PR với migration nếu chưa có visual verification.
5. Không hard-code `style={{ color: '#…' }}` cho trạng thái mới; `StatusTag` nhận semantic status hoặc token.

### 7.3 Dữ liệu, ảnh và hiệu năng

- Dùng ảnh đã có qua `StorageImage`, `GalleryWorkspace` và URL/thumb BFF hiện tại. Mỗi ảnh có alt theo destination/tour; decorative image có `alt=""`/`aria-hidden`.
- Các danh sách dài giữ server pagination, debounce search theo behavior hiện có và không tải trước tất cả ảnh.
- Chart chỉ render khi container visible và có dữ liệu; giữ responsive configuration hiện có, giới hạn animation khi reduced motion.
- Dynamic import các preview/modal nặng tương tự Weather và AI hiện có; không dynamic import shell/CTA quan trọng làm chậm thao tác đầu tiên.

## 8. Kiểm thử, review và rủi ro

### 8.1 Ma trận acceptance tối thiểu

| Luồng | Data/state | Thiết bị & input | Kết quả cần có |
| --- | --- | --- | --- |
| Dashboard → lead quá hạn | có/không có/error/read-only | 360, 1280; keyboard | metric dẫn đúng filter; empty/error giải thích và có retry |
| Sales → follow-up → Tour Design | nhiều stage, lost, pending mutation | 768, 1280; mouse/keyboard | không mất filter; status rõ; save/permission đúng |
| Clients → profile → chỉnh sửa | duplicate email, field invalid | 360, 768; touch/keyboard | validation inline, focus field lỗi, drawer/modal không kẹt focus |
| Tour Design → reorder → proposal | ảnh thiếu, save fail, export loading | 360, 1280; mouse/keyboard DnD | thứ tự lưu đúng, fallback ảnh, thông báo state rõ |
| Products/Bookings | empty, pagination, on-tour, payment due | 360, 1280 | list/table đúng, mobile card, action không chỉ dựa màu |
| Shell/nav | permission khác nhau, sidebar pin/unpin | 360, 768, 1280; Escape | item quyền không lộ, drawer focus/đóng đúng, active context rõ |

### 8.2 Rủi ro và cách kiểm soát

| Rủi ro | Dấu hiệu sớm | Phòng ngừa / quyết định |
| --- | --- | --- |
| Redesign thành rewrite toàn app | PR sửa shell + nhiều domain + API | Giới hạn vertical slice, checklist không đổi contract, owner tách Dev 1/2. |
| AntD tăng bundle/SSR issue | hydration/style mismatch hoặc `/login` nặng | POC S1, không đưa registry vào root; đo build/bundle trước và sau. |
| CSS global regress trang chưa migrate | thay token làm UI P2 lệch | alias tạm, screenshot smoke P0/P1, chỉ xóa CSS sau migration. |
| UX “đẹp” nhưng chậm | hero ảnh tải nhiều, chart render không cần | Storage thumbs, lazy load, skeleton có kích thước cố định, kiểm tra network. |
| Mất nghiệp vụ qua simplification | field/action không còn trong page | progressive disclosure + action menu, review task với domain owner trước merge. |
| Không đồng bộ EN/VI | UI lẫn thuật ngữ | inventory copy và review i18n trong DoD. |
| Accessibility bị bỏ sót | div clickable, focus biến mất | keyboard walkthrough là gate từng PR, không để dồn cuối sprint. |

## 9. Mốc quyết định cần chủ dự án xác nhận

Các điểm này cần chốt trong S0; nếu chưa có phản hồi, áp dụng phương án khuyến nghị để không chặn nền tảng:

| Quyết định | Khuyến nghị |
| --- | --- |
| Ngôn ngữ mặc định | Giữ cơ chế EN/VI hiện có; thống nhất copy tiếng Việt cho nhân sự nội bộ Việt Nam, English là bản song song hoàn chỉnh. |
| Màu thương hiệu | Giữ xanh rừng + ngà + gold; không rebrand logo trong đợt UI/UX. |
| Mobile | Tối ưu để xem/tra cứu/chấp nhận tác vụ nhanh; không cố ép mọi bảng tài chính và editor phức tạp thành trải nghiệm tạo mới hoàn toàn trên điện thoại. |
| Độ sâu P2 | Chỉ áp theme/layout cơ sở trong 8 tuần; chỉ redesign sâu khi đo baseline xác nhận nhóm đó có tần suất cao. |
| Trình duyệt hỗ trợ | Theo phạm vi Next.js hiện tại; xác nhận Safari iOS/Chrome Android trong acceptance vì đội vận hành có thể dùng mobile. |

## 10. Bàn giao cuối dự án

- Design token và AntD token được ghi chú tại nguồn, có catalog component và state matrix.
- Danh sách page P0/P1/P2, owner, migration status và CSS legacy đã/xưa bỏ.
- Bộ screenshot desktop/mobile trước-sau, kết quả 5 usability task và acceptance matrix.
- Test/lint/typecheck/build/E2E evidence theo môi trường được phép chạy.
- Changelog người dùng và hướng dẫn phát triển UI: cách dùng token, primitive, responsive, a11y, i18n, ảnh và quy tắc không phá BFF/permission.

Kế hoạch này ưu tiên một CRM du lịch điềm tĩnh, giàu ngữ cảnh và đáng tin cậy: ảnh điểm đến làm rõ sản phẩm, màu sắc dẫn hướng vừa đủ, còn dữ liệu và hành động luôn giữ vai trò trung tâm.
