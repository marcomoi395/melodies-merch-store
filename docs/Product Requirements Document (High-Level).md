# Vấn Đề Chung

**Người mua (fans, collectors) khó tìm kiếm các đĩa vật và quà lưu niệm từ các nghệ sĩ quốc tế.**
**Nghệ sĩ quốc tế lẫn trong nước gặp khó khăn trong việc quảng bá và bán sản phẩm đến các fan ở vị trí chưa thể mua được. Họ thiếu một kênh phân phối chính thức, chuyên nghiệp để tiếp cận tệp khách hàng này.**

# Giải Pháp Đề Xuất

Xây dựng một nền tảng **Cross-border & Local Commerce** chuyên biệt cho âm nhạc.

- **Make it Accessible (Dễ tiếp cận):** Mua đĩa than từ London hay CD từ Hà Nội đều dễ dàng như mua hàng trên Shopee. Xóa bỏ rào cản thanh toán và vận chuyển.
- **Make it Discoverable (Dễ tìm kiếm):** Định hướng tìm kiếm theo "Nghệ sĩ". Trang của Nghệ sĩ là trung tâm, liệt kê toàn bộ discography (danh sách đĩa nhạc) có thể mua được.
- **Authentic Connection (Kết nối chính hãng):** Là đại lý phân phối chính thức, giúp nghệ sĩ quảng bá sản phẩm trực tiếp tới cộng đồng fan địa phương.

**Nằm ngoài mục tiêu:**

- Không hỗ trợ hủy đơn hàng
- Không hỗ trợ bán vé show diễn
- Không xây dựng tính năng mạng xã hội phức tập cho fan (comment, like, share), chỉ tập trung vào bán sản phẩm.

**Đối tượng người dùng mục tiêu:**

- **The International Fan:** Fan của Taylor Swift, Blackpink,... tại Việt Nam. Cần nơi order album gốc an toàn, giá đã bao gồm thuế phí, thanh toán bằng tiền Việt.
- **The Local Supporter:** Fan của nghệ sĩ Việt (Indie/Mainstream). Muốn mua ủng hộ thần tượng nhưng ở xa các thành phố lớn (nơi thường diễn ra các event bán đĩa).
- **The Artist/Label:** Cần kênh phân phối để không phải tự lo logistics (đóng gói, ship hàng), chỉ tập trung làm nhạc.

## Các tính năng yêu cầu

### Giao diện người mua

**Giao diện**

- **[P0] Ưu tiên giao diện dành cho điện thoại**
- **[P0] Người dùng có thể truy cập và thêm sản phẩm vào giỏ hàng mà không cần đăng nhập.**
- **[P0] Giỏ hàng cần đảm bảo tính năng cần thiết**
    - Xóa, thêm sản phẩm
    - Kiểm tra mã giảm giá.
    - Với khách hàng không đăng nhập thì vẫn tạo giỏ hàng (có thời hạn) và nó được lưu theo id trong cookies.
- **[P0] Tính năng tìm kiếm**
    - Cần trả về các sản phẩm liên quan đến từ khóa tìm kiếm.
    - Bao gồm các công cụ lọc (thời gian phát hành, giá, danh mục cụ thể).
- **[P0] Trang chi tiết sản phẩm cần đầy đủ thông tin**
    - Thông tin sản phẩm.
    - Câu chuyện về sản phẩm.
    - Danh sách ghi công các nghệ sĩ của sản phẩm (nếu là CD, Vinyl, Cassette).
    - Nhúng đường dẫn Youtube để người dùng có thể nghe trước khi mua.
    - Đường dẫn đầy đủ các trang nền tảng nhạc số.
- **[P0] Trang chi tiết về công ty, thể hiện sự uy tính trong các sản phẩm.**
- **[P0] Cuối trang cần có đường dẫn đến các kênh truyền thông và đầy đủ thông tin về giấy phép kinh doanh, chính sảch hoàn trả, và chính sách bảo mật (địa chỉ cửa hàng nếu có).**
- **[P1] Người dùng có thể đổi mật khẩu (cần xác nhận qua email)**

**Hệ thống thông báo**
- **[P0] Email thành công khi đặt hàng**
- **[P0] Email xác nhận thanh toán**
- **[P0] Email đặt lại mật khẩu**
- **[P1] Email nhắc khách hàng thanh toán với các sản phẩm đã để lâu trong giỏ hàng.**
- **[P2] Email các sản phẩm restock dành cho các khách hàng đã wishlist.** 

**Hệ thống đặt hàng (Pre-order & Stock)**

- **[P0] Mua hàng (Order):**
    - Bắt buộc thanh toán trước khi các sản phẩm.
    - Có thể thanh toán qua các ví điện tử (Mono, Stripe,...).
    - Giới hạn số lượng đặt mỗi sản phẩm là 4.
    - Hiển thị rõ ngày dự kiến về hàng (ETA).
- **[P0] Giá niêm yết trọn gói:**
    - Hiển thị giá cuối cùng bằng VND (đã bao gồm phí ship). Người dùng không bị shock vì phí phát sinh.
- **[P0] Thanh toán không cần đăng kí tài khoản:** Mua nhanh không cần đăng ký (giảm tỷ lệ rớt đơn).
- **[P0] Người dùng có thể kiểm tra tính trạng đơn hàng thông qua email/số điện thoại.**
- **[P1] Người dùng có thể chọn giao hàng gộp một lần nếu tồn tại cả pre-order và in-stock.**
- **[P1] Người dùng có thể đăng nhập thông qua tài khoản Google.**

**Khám phá theo Nghệ sĩ (Artist-Centric Discovery)**

- **[P0] Artist Profile Page:**
    - Mỗi nghệ sĩ (Việt Nam hoặc Quốc tế) có một trang riêng. Trang này không chỉ hiện sản phẩm mà còn có Bio, hình ảnh banner, liên kết mạng xã hội của nghệ sĩ đó. -> _Giải quyết vấn đề quảng bá cho nghệ sĩ._
- **[P0] Bộ lọc nghệ sĩ:** Tìm kiếm nhanh theo tên nghệ sĩ, quốc gia (US-UK, Kpop, Vpop).

**Nội dung & Trải nghiệm**

- **[P1] Audio Preview (Tích hợp Spotify):** Như đã đề cập, nhưng mục đích ở đây là để fan nghe thử và quyết định "xuống tiền" mua bản vật lý để sưu tầm.
- **[P1] Blog/News:** Chuyên mục tin tức về các đợt phát hành đĩa mới, lịch tour của nghệ sĩ (hỗ trợ việc quảng bá).

### Hệ thống quản trị (Admin/Vendor Portal)

- **[P0] Tình trạng đơn hàng chi tiết:**
    - Tracking chi tiết(VD: Hàng đã rời kho US -> Đang thông quan -> Đã về kho VN -> Đang giao khách).
    - Thông báo khi chuyển trạng thái đơn hàng qua email.
- **[P0] Quản trị viên có thể tạo danh mục theo thể loại hoặc tên nghệ sĩ.**
- **[P0] Quản lý tồn kho cho quản trị viên.
- **[P0] Quản trị viên có thể thêm/xóa/sửa, tùy chỉnh độ ưu tiên của sản phẩm.**
- **[P0] Quản trị viên có thể tạo và thu hồi mã giảm giá.**
- **[P0] Quản trị viên có thể tạo tài khoản nhân viên và phân quyền từng chức năng khác nhau.**
- **[P1] Dễ dàng thêm bài viết mới vào Blog/News thông qua file markdown.**
- **[P2] Thống kê chi tiết về doanh thu.**
- **[P2] Tải các báo cáo, thông kê về dạng PDF cho quản trị viên.**
