# Vấn đề

Người dùng hiện tại gặp nhiều ma sát và rủi ro khi cố gắng hoàn tất giao dịch mua gói dịch vụ/sản phẩm trên nền tảng.

- **Tỷ lệ bỏ dở cao:** Quy trình checkout hiện tại quá phức tạp, thiếu minh bạch về chi phí cuối cùng (thuế, phí) trước bước thanh toán.
- **Thiếu phương thức thanh toán cục bộ:** Người dùng tại các thị trường cụ thể (ví dụ: Việt Nam) gặp khó khăn khi chỉ có lựa chọn thẻ Credit quốc tế mà thiếu các cổng nội địa (ATM, QR Code, Ví điện tử).
- **Xử lý lỗi kém:** Khi thanh toán thất bại (do hết hạn mức, lỗi mạng), hệ thống không giải thích rõ ràng hoặc không cho phép thử lại (retry) dễ dàng, dẫn đến mất đơn hàng.
- **Vấn đề đồng bộ dữ liệu:** Đôi khi tiền đã trừ nhưng trạng thái đơn hàng (Order Status) không cập nhật tức thì, gây hoang mang cho khách hàng.

## Trường hợp sử dụng mục tiêu

- **As a Guest Shopper (Khách vãng lai):** Tôi muốn mua nhanh một món đồ mà **không cần tạo tài khoản**, chỉ cần điền địa chỉ và thanh toán để tiết kiệm thời gian.
- **As a Returning Customer (Khách quen):** Tôi muốn hệ thống tự động điền địa chỉ giao hàng và thông tin thanh toán đã lưu từ lần trước để hoàn tất đơn hàng trong < 30 giây.

# Giải pháp đề xuất

Xây dựng lại luồng Checkout tập trung vào tốc độ và sự tin cậy .

- **Tối ưu hóa minh bạch:** Hiển thị "Giá trọn gói" (Landed Cost) bao gồm phí ship và thuế ngay khi người dùng nhập địa chỉ, _trước_ khi họ chọn phương thức thanh toán.
- **Địa phương hóa thanh toán (Localization):** Tích hợp cổng thanh toán đa phương thức. Sử dụng Stripe cho quốc tế và cổng nội địa (như Momo/VNPay) cho QR/ATM/Ví tại Việt Nam.
- **Cơ chế "Fail-safe" (An toàn lỗi):** Xây dựng luồng xử lý lỗi thông minh (Smart Error Handling) cho phép thử lại (Retry) mà không mất dữ liệu form, và cơ chế Webhook/IPN để đồng bộ trạng thái đơn hàng bất kể kết nối của người dùng bị ngắt.

## Mô hình

Luồng dữ liệu và trạng thái đơn hàng được định nghĩa như sau:

![[Pasted image 20251126095918.png|500]]

- **Guest Session:** Sử dụng `session_id` tạm thời để lưu thông tin giỏ hàng và địa chỉ, được chuyển đổi thành `Order` chính thức khi thanh toán thành công.
- **Payment Status Sync:** Hệ thống không chỉ dựa vào client-side (trình duyệt người dùng) mà lắng nghe server-side (Webhook) từ cổng thanh toán để cập nhật trạng thái đơn hàng, giải quyết vấn đề "tiền trừ nhưng đơn chưa lên".

## Phạm vi không bao gồm

- **Hệ thống hủy đơn hàng tự động từ phía người dùng:** MVP sẽ không hỗ trợ người dùng tự hủy đơn hàng sau khi đã thanh toán thành công (việc này cần xử lý thủ công qua CS hoặc admin).
- **Các phương thức thanh toán phức tạp:** Không tích hợp thanh toán trả góp (Buy Now Pay Later - BNPL) hoặc thanh toán bằng tiền điện tử (Crypto) trong giai đoạn này.
- **Chỉnh sửa đơn hàng sau thanh toán:** Không cho phép người dùng tự thay đổi địa chỉ hoặc thêm/bớt sản phẩm sau khi đơn hàng đã được khởi tạo và thanh toán.

## Yêu cầu

**Luồng Guest Shopper & Thông tin**

- **[P0] Guest Checkout Entry:** Cho phép người dùng nhập email để bắt đầu thanh toán mà không cần đăng nhập hay đăng ký.
- **[P0] Address Form & Validation:**
    - Tự động tính toán lại tổng tiền (Ship + Thuế) ngay khi địa chỉ được điền xong.
- **[P1] Account Creation Prompt:** Sau khi thanh toán thành công, gợi ý Guest Shopper tạo mật khẩu để lưu đơn hàng vào tài khoản mới (dựa trên email đã nhập).

**Minh bạch chi phí (Cost Transparency)**

- **[P0] Landed Cost Display:** Trước khi bấm nút "Thanh toán" cuối cùng, màn hình phải hiển thị bảng phân tích chi phí rõ ràng:
    - Giá sản phẩm (Subtotal)
    - Phí vận chuyển (Shipping)
    - Thuế & Phí xử lý (Tax & Handling)
    - **TỔNG CỘNG (Total)**

**Phương thức thanh toán & Địa phương hóa (Payment Methods)**

- **[P0] Cổng thanh toán nội địa (Local Gateways):**
    - Tích hợp VietQR (Quét mã ngân hàng tự động).
    - Tích hợp Ví điện tử (MoMo/ZaloPay).
- **[P0] Cổng thanh toán quốc tế:** Tích hợp Stripe/PayPal cho thẻ Visa/Mastercard.
- **[P0] Returning Customer Quick-Pay:** Với user đã đăng nhập, tự động chọn phương thức thanh toán cũ (nếu token còn hạn) hoặc hiển thị lại thẻ đã lưu.

**Xử lý lỗi & Đồng bộ (Error Handling & Reliability)**

- **[P0] Smart Error Messaging:** Khi thanh toán thất bại, hệ thống phải trả về lỗi cụ thể từ cổng thanh toán:
    - _Thay vì:_ "Error 503"
    - _Hiển thị:_ "Thẻ của bạn không đủ số dư" hoặc "Ngân hàng từ chối giao dịch, vui lòng thử thẻ khác".
- **[P0] Retry Mechanism:** Giữ nguyên trạng thái giỏ hàng và thông tin đã điền khi lỗi xảy ra. Cho phép người dùng chọn phương thức khác và bấm "Thử lại" ngay lập tức.
- **[P0] Order Status Webhook:** Xây dựng API lắng nghe (Listening API) để nhận tín hiệu từ cổng thanh toán. Ngay cả khi người dùng tắt trình duyệt lúc đang quay, nếu tiền đã trừ, Webhook sẽ bắn về server để cập nhật trạng thái đơn hàng thành "Paid".

# Phụ lục

**Hết thời gian giữ đơn (Timeout):** Với mã QR, nếu người dùng không quét trong 10-15 phút, tự động hủy session thanh toán và nhả tồn kho.
