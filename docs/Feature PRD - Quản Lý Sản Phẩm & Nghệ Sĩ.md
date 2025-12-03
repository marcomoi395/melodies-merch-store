# Vấn đề

**Hiện tại, việc quản lý dữ liệu về Nghệ sĩ và Sản phẩm đang bị phân mảnh và thiếu tính liên kết chặt chẽ.**

- Thông tin nghệ sĩ (tiểu sử, hình ảnh, liên kết mạng xã hội) và thông tin sản phẩm (nhạc, merch) thường nằm ở các cơ sở dữ liệu hoặc bảng tính tách biệt.
- Rất khó để xác định nhanh một sản phẩm thuộc về nghệ sĩ nào để tính toán doanh thu hoặc hiển thị đúng trên giao diện người dùng cuối.
- Quy trình "gán" nghệ sĩ vào sản phẩm đang thực hiện thủ công, dễ gây lỗi và tốn thời gian khi số lượng nghệ sĩ (collaborations) trên một sản phẩm tăng lên.

## Trường hợp sử dụng mục tiêu

- **Là một Content Manager:** Tôi muốn tạo hồ sơ cho một nghệ sĩ mới gia nhập, bao gồm đầy đủ thông tin định danh và hình ảnh visual, để chuẩn bị cho việc ra mắt sản phẩm.
- **Là một Merchandiser:** Tôi muốn tạo một sản phẩm mới (ví dụ: Áo thun tour) và gán nó cho đúng nghệ sĩ, để doanh thu được ghi nhận chính xác.
- **Là một Admin:** Tôi muốn xem danh sách tất cả các sản phẩm mà một nghệ sĩ cụ thể đã phát hành để kiểm tra và đối soát số liệu.

# Giải pháp đề xuất

- Tạo cơ chế liên kết **Many-to-Many** (Nhiều - Nhiều): Một nghệ sĩ có thể có nhiều sản phẩm, và một sản phẩm có thể thuộc về nhiều nghệ sĩ (trường hợp feat/collab).
- Giao diện quản lý thống nhất (Dashboard) để thao tác nhanh mà không cần switch giữa các tool khác nhau.

## Mô hình

![[Pasted image 20251126084907.png|800]]

Một vài điều cần lưu ý như sau:

- **Artist Profile:** Chứa thông tin định danh (Stage name, Real name, Bio, Avatar).
- **Product Item:** Chứa thông tin gốc của sản phẩm (Base Price, Description).
- **Product Variants:** Các biến thể (Size, Color, Format - Digital/Physical).

## Mục tiêu

- Giảm 50% thời gian nhập liệu khi tạo mới sản phẩm và gán nghệ sĩ.
- Đảm bảo tính toàn vẹn dữ liệu: Không có sản phẩm nào không có chủ sở hữu (Orphan products).
- Hỗ trợ tìm kiếm và lọc đa chiều (Tìm sản phẩm theo tên nghệ sĩ và ngược lại).

## Phạm vi không bao gồm

- Quản lý tồn kho chi tiết (Inventory Management) ở cấp độ kho bãi (Out of scope cho MVP).
- Tính toán chia sẻ doanh thu (Royalties Calculation) tự động.

## Yêu cầu

**Artist Management:**

- [P0] Admin có thể tạo mới Artist với các trường: Tên nghệ danh (bắt buộc), Tên thật, Bio ngắn, Hình ảnh đại diện (Thumbnail).
- [P0] Admin có thể chỉnh sửa hoặc vô hiệu hóa (deactivate) một Artist (Soft delete).
- [P0] Hệ thống validate trùng tên nghệ sĩ để tránh duplicate data.

**Product Management:**

- [P0] Admin có thể tạo Product với các trường: Tên sản phẩm, Loại sản phẩm (Nhạc/Merch), Giá cơ bản, Trạng thái (Draft/Published).
- [P0] Admin có thể gán (link) một hoặc nhiều Artist vào một Product ngay tại màn hình tạo sản phẩm. - _Logic:_ Cần có ít nhất 1 "Main Artist" cho mỗi sản phẩm.

**Viewing & Searching:**

- [P0] Admin có thể xem danh sách Artist dạng bảng (Grid View) với bộ lọc theo trạng thái (Active/Inactive).
- [P0] Admin có thể xem danh sách Product và thấy cột "Artist" hiển thị tên các nghệ sĩ liên quan.

**Advanced Linking:**

- [P1] Định nghĩa vai trò của Artist trong Product (Ví dụ: Dropdown chọn Main, Featuring, Producer).
- [P1] Hiển thị tab "Sản phẩm liên quan" trong màn hình chi tiết của Artist (Artist Detail View).

**Media & Metadata:**

- [P1] Hỗ trợ upload nhiều hình ảnh cho Product (Gallery).
- [P1] Thêm các trường metadata cho Artist: Link Spotify, Link Instagram, Link Youtube.
- [P2] Bulk Action: Chọn nhiều sản phẩm để gán cho một nghệ sĩ cùng lúc (dùng cho việc migrate dữ liệu cũ).
- [P2] Lịch sử chỉnh sửa (Audit Log): Ai đã sửa thông tin sản phẩm/nghệ sĩ và vào lúc nào.

# Phụ lục

**Logic xử lý khi Xóa Artist**

- _Câu hỏi:_ Điều gì xảy ra với Sản phẩm khi Nghệ sĩ bị xóa?
- _Quyết định:_ Chúng ta không xóa vĩnh viễn (Hard delete). Khi Artist chuyển sang trạng thái "Inactive", các sản phẩm liên quan vẫn giữ liên kết lịch sử nhưng sẽ bị ẩn khỏi các bộ lọc tìm kiếm "Active". Nếu Artist đó là "Main Artist" duy nhất, hệ thống sẽ cảnh báo admin cần chuyển quyền sở hữu trước khi deactivate.

**Phân loại Sản phẩm**

- **Digital Music:** Single, Album, EP.
- **Physical Recordings:** CD, Vinyl, Cassette.
- **Physical Merch:** T-shirt, Lightstick, Photobook,...
