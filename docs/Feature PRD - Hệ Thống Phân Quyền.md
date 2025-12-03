# Vấn đề

Hệ thống quản trị (Admin Portal) đang được thiết kế dưới dạng "một chìa khóa vạn năng". Nếu chúng ta cấp quyền truy cập cho nhân viên kho (để cập nhật trạng thái đơn hàng) hoặc nhân viên CSKH (để xem khiếu nại), họ cũng sẽ có quyền truy cập vào các dữ liệu nhạy cảm như doanh thu tổng, hoặc nguy hiểm hơn là quyền xóa/sửa sản phẩm và mã giảm giá .

- **Rủi ro bảo mật:** Nhân viên thời vụ có thể truy xuất dữ liệu khách hàng hoặc doanh thu.
- **Rủi ro vận hành:** Một nhân viên kho sơ ý có thể xóa nhầm danh mục sản phẩm hoặc thay đổi giá bán của một Album Limited Edition, gây thiệt hại tài chính.
- **Thiếu chuyên biệt hóa:** Nhân viên CSKH bị quá tải thông tin bởi các tính năng nhập kho không liên quan đến họ.

# **Giải pháp đề xuất**

## Mục tiêu

- **Bảo mật:** Đảm bảo nhân viên chỉ truy cập được dữ liệu cần thiết cho công việc của họ (Principle of Least Privilege).
- **Linh hoạt:** Quản trị viên cấp cao (Super Admin) có thể dễ dàng tạo thêm vai trò mới hoặc điều chỉnh quyền hạn mà không cần Dev can thiệp code.
- **Minh bạch:** Biết rõ ai là người đã thực hiện hành động (VD: Ai là người đã hủy đơn hàng này?).

## Phạm vi không bao gồm

- Phân quyền cho phía Nghệ sĩ/Label (Vendor Portal riêng biệt sẽ được phát triển ở giai đoạn sau, PRD này tập trung vào nhân sự vận hành nội bộ của sàn).
- Phân quyền chi tiết đến mức độ từng trường dữ liệu (Field-level security) – VD: Nhân viên kho thấy đơn hàng nhưng không thấy giá tiền (Giai đoạn sau).

## Yêu cầu

**Quản lý nhân viên (Staff Management)**

- **[P0]** Super Admin có thể mời/tạo tài khoản nhân viên mới thông qua Email.
- **[P0]** Super Admin có thể Kích hoạt (Active) hoặc Vô hiệu hóa (Deactivate) tài khoản nhân viên ngay lập tức (trường hợp nhân viên nghỉ việc).
- **[P0]** Gán một hoặc nhiều Role cho một nhân viên.

**Ma trận phân quyền (Permission Matrix UI)**

- **[P0]** Giao diện danh sách Role: Hiển thị tên Role, số lượng nhân viên đang giữ Role này.
- **[P0]** Giao diện Tạo/Sửa Role:
    - Tên Role (VD: "Senior Marketing").
    - Mô tả.
    - Bảng chọn quyền (Checkbox Matrix)

**Logic thực thi (Enforcement Logic)**

- **[P0] API Guard:** Mọi API request từ Admin Portal đều phải đi qua một Middleware kiểm tra quyền.
    - Nếu nhân viên CSKH gọi API `DELETE /api/products/123` -> Hệ thống trả về lỗi `403 Forbidden`.
- **[P0] UI Hiding:**
    - Nếu User không có quyền `Order.View`, ẩn hoàn toàn menu "Đơn hàng" trên thanh sidebar.
    - Nếu User có quyền `View` nhưng không có `Edit`, nút "Lưu/Cập nhật" sẽ bị mờ (disabled) hoặc ẩn đi.

