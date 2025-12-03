## 1. Introduction and Overview

**Purpose**

Tài liệu này mô tả kiến trúc hệ thống cho nền tảng thương mại điện tử chuyên biệt về âm nhạc. Hệ thống giải quyết bài toán phân phối sản phẩm vật lý (CD, Vinyl, Cassette, Merch) cho nghệ sĩ trong và ngoài nước, tập trung vào trải nghiệm mua hàng không rào cản (Guest Checkout) và quản lý nội dung định hướng nghệ sĩ (Artist-Centric).

**Scope**
Hệ thống bao gồm các phân hệ chính:

1. **Storefront (User-facing):** Cho phép tìm kiếm, nghe thử, và mua hàng (Checkout) nhanh chóng.
2. **Admin Portal (Internal):** Quản lý sản phẩm, nghệ sĩ, đơn hàng và phân quyền nhân viên (RBAC).
3. **Backend Services:** Xử lý logic nghiệp vụ, thanh toán, và đồng bộ dữ liệu.

---

## 2. System Architecture

Hệ thống sẽ sử dụng kiến trúc **Modular Monolith** nhưng tách biệt rõ ràng giữa Frontend và Backend (Client-Server Architecture).

**High-Level Architecture**

- **Frontend (Storefront & Admin):**
    - **Framework:** **ReactJS** (dùng **Vite** để build).
    - **UI Library:** Tailwind.
- **Server Side:**
    - **API Gateway/Reverse Proxy:** Nginx (xử lý SSL, load balancing cơ bản).
    - **Core Backend:** Node.js (NestJS).
    - **Worker:** Xử lý các tác vụ nền như gửi email, đồng bộ webhook thanh toán.
- **Database & Storage:**
    - **RDBMS:** PostgreSQL (Lưu trữ dữ liệu quan hệ chặt chẽ như Đơn hàng, Sản phẩm).
    - **In-Memory/Cache:** Redis (Lưu Session giỏ hàng cho Guest, cache API).
    - **Object Storage:** MinIO hoặc AWS S3 (Lưu hình ảnh, file nhạc preview).>)

---

## 3. Data Design

### ERD

![[Melodies - Ecommerce Artists Merch Platform.png]]
Trang chi tiết: [Link](https://dbdocs.io/marcomoi395/Melodies-Ecommerce-Artists-Merch-Platform)

### Module Identity & Access (Quản lý User & Staff)

**Table: `users` (Khách hàng)**
Lưu trữ thông tin người mua hàng.

| **Column Name** | **Data Type** | **Constraints**                 | **Description**                        |
| --------------- | ------------- | ------------------------------- | -------------------------------------- |
| `id`            | UUID          | PK, Default `gen_random_uuid()` | ID duy nhất của user.                  |
| `email`         | VARCHAR(255)  | UNIQUE, NOT NULL                | Email đăng nhập/liên lạc.              |
| `password_hash` | VARCHAR       | NULL                            | Mật khẩu (Null nếu login bằng Google). |
| `full_name`     | VARCHAR(100)  |                                 | Tên hiển thị.                          |
| `phone`         | VARCHAR(20)   |                                 | Số điện thoại.                         |
| `provider`      | VARCHAR(20)   | Default 'local'                 | 'local', 'google'.                     |
| `created_at`    | TIMESTAMP     | Default `now()`                 |                                        |
| `updated_at`    | TIMESTAMP     |                                 |                                        |
| `is_verified`   | BOOLEAN       | Default `false`                 | Xác thực email chưa?                   |

**Table: `staff` (Nhân viên)**

| **Column Name** | **Data Type** | **Constraints**  | **Description**                                 |
| --------------- | ------------- | ---------------- | ----------------------------------------------- |
| `id`            | UUID          | PK               | ID nhân viên.                                   |
| `email`         | VARCHAR(255)  | UNIQUE, NOT NULL | Email công việc.                                |
| `password_hash` | VARCHAR       | NOT NULL         |                                                 |
| `name`          | VARCHAR(100)  | NOT NULL         | Tên nhân viên.                                  |
| `status`        | VARCHAR(20)   | Default 'active' | 'active', 'inactive' (vô hiệu hóa thay vì xóa). |
| `created_at`    | TIMESTAMP     |                  |                                                 |
|                 |               |                  |                                                 |

**Table: `roles` (Vai trò)**

| **Column Name** | **Data Type** | **Constraints**  | **Description**                                 |
| --------------- | ------------- | ---------------- | ----------------------------------------------- |
| `id`            | SERIAL        | PK               |                                                 |
| `name`          | VARCHAR(50)   | UNIQUE, NOT NULL | VD: 'Super Admin', 'Merchandiser', 'Warehouse'. |
| `description`   | TEXT          |                  | Mô tả vai trò.                                  |

**Table: `permissions` (Quyền hạn)**

| **Column Name** | **Data Type** | **Constraints**  | **Description**                               |
| --------------- | ------------- | ---------------- | --------------------------------------------- |
| `id`            | SERIAL        | PK               |                                               |
| `slug`          | VARCHAR(100)  | UNIQUE, NOT NULL | VD: `product.create`, `order.view_sensitive`. |
| `resource`      | VARCHAR(50)   |                  | VD: 'product', 'order'.                       |
| `action`        | VARCHAR(50)   |                  | VD: 'create', 'read', 'update', 'delete'.     |

**Table: `staff_roles` & `role_permissions`**

_Bảng trung gian để thực hiện quan hệ Many-to-Many._

| **Column Name** | **Data Type** | **Constraints** |
| --------------- | ------------- | --------------- |
| `staff_id`      | UUID          | FK -> `staff`   |
| `role_id`       | SERIAL        | FK -> `roles`   |

| **Column Name** | **Data Type** | **Constraints**     |
| --------------- | ------------- | ------------------- |
| `role_id`       | SERIAL        | FK -> `roles`       |
| `permission_id` | SERIAL        | FK -> `permissions` |

### Module Catalog (Sản phẩm & Nghệ sĩ)

**Table: `artists` (Nghệ sĩ)**

| **Column Name** | **Data Type** | **Constraints**  | **Description**                                     |
| --------------- | ------------- | ---------------- | --------------------------------------------------- |
| `id`            | UUID          | PK               |                                                     |
| `stage_name`    | VARCHAR(255)  | NOT NULL         | Nghệ danh (hiển thị).                               |
| `real_name`     | VARCHAR(255)  |                  | Tên thật (quản lý nội bộ).                          |
| `slug`          | VARCHAR(255)  | UNIQUE, NOT NULL | URL thân thiện (VD: /artists/son-tung-mtp).         |
| `bio`           | TEXT          |                  | Tiểu sử.                                            |
| `avatar_url`    | VARCHAR       |                  | Link ảnh đại diện.                                  |
| `metadata`      | JSONB         |                  | Lưu link MXH: `{spotify: "...", instagram: "..."}`. |
| `status`        | VARCHAR(20)   | Default 'active' | 'active', 'inactive'.                               |
| `deleted_at`    | TIMESTAMP     | NULL             | Hỗ trợ Soft Delete.                                 |

**Table: `categories` (Danh mục)**

| **Column Name** | **Data Type** | **Constraints**       | **Description**                |
| --------------- | ------------- | --------------------- | ------------------------------ |
| `id`            | SERIAL        | PK                    |                                |
| `name`          | VARCHAR(100)  | NOT NULL              | VD: V-Pop, Vinyl, Accessories. |
| `slug`          | VARCHAR(100)  | UNIQUE                |                                |
| `parent_id`     | INT           | FK -> `categories.id` | Hỗ trợ danh mục cha-con.       |

**Table: `products` (Sản phẩm gốc)**

| **Column Name** | **Data Type** | **Constraints**    | **Description**                                  |
| --------------- | ------------- | ------------------ | ------------------------------------------------ |
| `id`            | UUID          | PK                 |                                                  |
| `name`          | VARCHAR(255)  | NOT NULL           | Tên Album/Sản phẩm.                              |
| `slug`          | VARCHAR(255)  | UNIQUE             |                                                  |
| `description`   | TEXT          |                    | Mô tả chi tiết, câu chuyện sản phẩm.             |
| `category_id`   | INT           | FK -> `categories` |                                                  |
| `product_type`  | VARCHAR(20)   | NOT NULL           | 'music' (Album/Single), 'merch' (Áo/Lightstick). |
| `status`        | VARCHAR(20)   | Default 'draft'    | 'draft', 'published', 'archived'.                |
| `tracklist`     | JSONB         |                    | Danh sách bài hát (nếu là album).                |
| `media_gallery` | JSONB         |                    | Mảng chứa URL ảnh/video preview.                 |
| `deleted_at`    | TIMESTAMP     | NULL               | Soft Delete.                                     |

**Table: `product_artists` (Liên kết Sản phẩm - Nghệ sĩ)**

| **Column Name** | **Data Type** | **Constraints**         | **Description**                  |
| --------------- | ------------- | ----------------------- | -------------------------------- |
| `product_id`    | UUID          | FK -> `products`        |                                  |
| `artist_id`     | UUID          | FK -> `artists`         |                                  |
| `role`          | VARCHAR(50)   | Default 'Main'          | 'Main', 'Featuring', 'Producer'. |
| **PK**          |               | (product_id, artist_id) | Composite Key.                   |

**Table: `product_variants` (Biến thể SKU)**

| **Column Name**    | **Data Type** | **Constraints**  | **Description**                                                   |
| ------------------ | ------------- | ---------------- | ----------------------------------------------------------------- |
| `id`               | UUID          | PK               |                                                                   |
| `product_id`       | UUID          | FK -> `products` |                                                                   |
| `sku`              | VARCHAR(50)   | UNIQUE, NOT NULL | Mã quản lý kho (VD: ALB-VIN-RED).                                 |
| `name`             | VARCHAR(100)  | NOT NULL         | Tên biến thể (VD: "Red Vinyl 180g").                              |
| `original_price`   | DECIMAL(15,2) | NOT NULL         | Giá bán (VND).                                                    |
| `discount_percent` | DECIMAL(15,2) | Default 0        | Phần trăm giảm giá                                                |
| `stock_quantity`   | INT           | Default 0        | Số lượng tồn kho.                                                 |
| `attributes`       | JSONB         |                  | Thuộc tính riêng: `{color: "red", weight: "180g", format: "LP"}`. |
| `is_preorder`      | BOOLEAN       | Default false    |                                                                   |
| `eta_date`         | TIMESTAMP     |                  | Ngày dự kiến hàng về (nếu pre-order).                             |

### Module Sales & Fulfillment (Đơn hàng & Thanh toán)

**Table: `carts` (Giỏ hàng)**

| **Column Name** | **Data Type** | **Constraints**     | **Description**                            |
| --------------- | ------------- | ------------------- | ------------------------------------------ |
| `id`            | UUID          | PK                  |                                            |
| `user_id`       | UUID          | NULL, FK -> `users` | Null nếu là Guest.                         |
| `session_id`    | VARCHAR       | INDEX               | ID từ cookie browser (dùng cho Guest).     |
| `created_at`    | TIMESTAMP     |                     | Có thể set TTL (Time to live) để xóa auto. |

**Table: `cart_items`**

| **Column Name** | **Data Type** | **Constraints**          | **Description** |
| --------------- | ------------- | ------------------------ | --------------- |
| `cart_id`       | UUID          | FK -> `carts`            |                 |
| `variant_id`    | UUID          | FK -> `product_variants` |                 |
| `quantity`      | INT           | Check > 0                | Số lượng mua.   |

**Table: `orders` (Đơn hàng)**

| **Column Name**    | **Data Type** | **Constraints**     | **Description**                                                        |
| ------------------ | ------------- | ------------------- | ---------------------------------------------------------------------- |
| `id`               | VARCHAR(20)   | PK                  | Mã đơn hàng readable (VD: ORD-2025-XXXX).                              |
| `user_id`          | UUID          | NULL, FK -> `users` | Null nếu Guest.                                                        |
| `guest_email`      | VARCHAR       | NOT NULL            | Email nhận tin (bắt buộc cho cả Guest/User).                           |
| `status`           | VARCHAR(20)   | Default 'pending'   | 'pending', 'paid', 'processing', 'shipping', 'completed', 'cancelled'. |
| `subtotal_amount`  | DECIMAL       | NOT NULL            | Tổng tiền hàng.                                                        |
| `shipping_fee`     | DECIMAL       | NOT NULL            | Phí ship.                                                              |
| `tax_fee`          | DECIMAL       | Default 0           | Thuế/Phí xử lý.                                                        |
| `discount_amount`  | DECIMAL       | Default 0           | Giảm giá                                                               |
| `coupon_code`      | VARCHAR       |                     | Mã code đã dùng                                                        |
| `total_amount`     | DECIMAL       | NOT NULL            | Tổng thanh toán (Landed Cost).                                         |
| `shipping_address` | JSONB         | NOT NULL            | Snapshot địa chỉ `{street, city, district, phone...}`.                 |
| `shipping_carrier` | VARCHAR(50)   |                     |                                                                        |
| `tracking_code`    | VARCHAR(50)   |                     |                                                                        |
| `note`             | TEXT          |                     |                                                                        |
| `payment_method`   | VARCHAR(20)   |                     | 'stripe', 'momo', 'vietqr'.                                            |
| `created_at`       | TIMESTAMP     |                     |                                                                        |

**Table: `order_items` (Chi tiết đơn)**

**Quan trọng:** Phải lưu giá tại thời điểm mua (price_at_purchase) để tránh sai lệch doanh thu khi giá sản phẩm thay đổi sau này.

| **Column Name**     | **Data Type** | **Constraints**          | **Description**                 |
| ------------------- | ------------- | ------------------------ | ------------------------------- |
| `id`                | UUID          | PK                       |                                 |
| `order_id`          | VARCHAR       | FK -> `orders`           |                                 |
| `variant_id`        | UUID          | FK -> `product_variants` |                                 |
| `product_name`      | VARCHAR       | NOT NULL                 | Snapshot tên sản phẩm lúc mua.  |
| `variant_name`      | VARCHAR       | NOT NULL                 | Snapshot tên biến thể.          |
| `quantity`          | INT           | NOT NULL                 |                                 |
| `price_at_purchase` | DECIMAL       | NOT NULL                 | Giá bán tại thời điểm chốt đơn. |

**Table: `discounts` (Mã giảm giá)**

| **Column Name**       | **Data Type** | **Constraints**   | **Description**                                                       |
| --------------------- | ------------- | ----------------- | --------------------------------------------------------------------- |
| `id`                  | SERIAL        | PK                |                                                                       |
| `code`                | VARCHAR(50)   | UNIQUE, UPPERCASE | Mã nhập vào (VD: SALE50).                                             |
| `type`                | VARCHAR(20)   |                   | 'percentage' (%) hoặc 'fixed_amount' (VND).                           |
| `value`               | DECIMAL       | NOT NULL          | Giá trị giảm.                                                         |
| `start_date`          | TIMESTAMP     |                   |                                                                       |
| `end_date`            | TIMESTAMP     |                   |                                                                       |
| `usage_limit`         | INT           |                   | Giới hạn số lần dùng.                                                 |
| `used_count`          | INT           | Default 0         | Số lần đã dùng.                                                       |
| `is_active`           | BOOLEAN       | Default `true`    | Dùng để admin tắt nóng mã này (inactive).                             |
| `applies_to`          | VARCHAR(20)   | Default `all`     | Các giá trị: `'all'` (toàn sàn), `'specific'` (tùy chọn SP/Danh mục). |
| `min_order_value`     | DECIMAL       |                   | Đơn tối thiểu bao nhiêu mới được dùng.                                |
| `max_usage_per_user`  | INT           | Default 1         | Giới hạn mỗi người được dùng mấy lần.                                 |
| `max_discount_amount` | DECIMAL(15,2) | NOT NULL          | Số tiền giảm tối đa                                                   |

**Table `discount_usages` (Lịch sử sử dụng - Giải quyết vấn đề User)**

| **Column Name** | **Data Type** | **Constraints**   | **Description**                                                   |
| --------------- | ------------- | ----------------- | ----------------------------------------------------------------- |
| `id`            | UUID          | PK                |                                                                   |
| `discount_id`   | SERIAL        | FK -> `discounts` | Mã nào?                                                           |
| `user_id`       | UUID          | FK -> `users`     | Ai dùng?                                                          |
| `order_id`      | VARCHAR       | FK -> `orders`    | Dùng cho đơn nào? (Để trace khi hoàn tiền thì trả lại lượt dùng). |
| `used_at`       | TIMESTAMP     | Default `now()`   | Thời điểm dùng.                                                   |

**Table `discount_scopes` (Phạm vi áp dụng - Giải quyết vấn đề Sản phẩm)**

| **Column Name** | **Data Type** | **Constraints**   | **Description**                |
| --------------- | ------------- | ----------------- | ------------------------------ |
| `id`            | SERIAL        | PK                |                                |
| `discount_id`   | SERIAL        | FK -> `discounts` |                                |
| `type`          | VARCHAR(20)   | NOT NULL          | `'product'` hoặc `'category'`. |
| `target_id`     | UUID          | NOT NULL          | ID của `products`.             |

**Table: `transactions` (Giao dịch thanh toán)**
Lưu log từ Payment Gateway để đối soát (Webhook).

| **Column Name**          | **Data Type** | **Constraints** | **Description**                                           |
| ------------------------ | ------------- | --------------- | --------------------------------------------------------- |
| `id`                     | UUID          | PK              |                                                           |
| `order_id`               | VARCHAR       | FK -> `orders`  |                                                           |
| `type`                   | VARCHAR       |                 | 'payment', 'refund'                                       |
| `provider`               | VARCHAR       |                 | 'stripe', 'momo' (để dễ lọc nếu sau này dùng nhiều cổng). |
| `gateway_transaction_id` | VARCHAR       |                 | Mã giao dịch từ Stripe/Momo.                              |
| `amount`                 | DECIMAL       |                 | Số tiền thực trừ.                                         |
| `status`                 | VARCHAR       |                 | 'success', 'failed'.                                      |
| `raw_response`           | JSONB         |                 | Full log trả về từ Gateway (để debug).                    |

### Module Content (Nội dung & Blog)

**Table: `posts` (Tin tức)**

| **Column Name** | **Data Type** | **Constraints** | **Description**     |
| --------------- | ------------- | --------------- | ------------------- |
| `id`            | SERIAL        | PK              |                     |
| `title`         | VARCHAR(255)  | NOT NULL        |                     |
| `slug`          | VARCHAR(255)  | UNIQUE          |                     |
| `content`       | TEXT          |                 | Markdown hoặc HTML. |
| `author_id`     | UUID          | FK -> `staff`   | Người viết.         |
| `published_at`  | TIMESTAMP     |                 |                     |

### Module System & Security (Nhật ký hệ thống)

Table: audit_logs
Lưu vết mọi tác động thay đổi dữ liệu quan trọng từ Admin Portal (Create/Update/Delete).

| **Column Name** | **Data Type** | **Constraints**                 | **Description**                                                          |
| --------------- | ------------- | ------------------------------- | ------------------------------------------------------------------------ |
| `id`            | UUID          | PK, Default `gen_random_uuid()` |                                                                          |
| `actor_id`      | UUID          | FK -> `staff`                   | ID nhân viên thực hiện (NULL nếu là System Auto).                        |
| `action`        | VARCHAR(50)   | NOT NULL                        | Loại hành động: `'create'`, `'update'`, `'delete'`, `'login'`.           |
| `resource`      | VARCHAR(50)   | NOT NULL                        | Tên bảng bị tác động: `'products'`, `'orders'`, `'staff'`.               |
| `resource_id`   | VARCHAR       | INDEX                           | ID của dòng dữ liệu bị tác động (Lưu String để support cả UUID lẫn INT). |
| `old_data`      | JSONB         | NULL                            | Snapshot dữ liệu **trước** khi sửa (Dùng để revert).                     |
| `new_data`      | JSONB         | NULL                            | Snapshot dữ liệu **sau** khi sửa.                                        |
| `ip_address`    | VARCHAR(45)   |                                 | IP người thực hiện (IPv4/IPv6).                                          |
| `user_agent`    | TEXT          |                                 | Thông tin trình duyệt/thiết bị (Trace dấu vết).                          |
| `created_at`    | TIMESTAMP     | Default `now()`                 |                                                                          |

### Module In-Memory Data (Redis - Session & Concurrency)

Thiết kế Key-Value cho Redis để xử lý Session người dùng và Cơ chế khóa tồn kho (Distributed Locking) khi thanh toán.

**Table: `redis_keys` (Cấu trúc lưu trữ)**

| **Key Pattern**            | **Data Type** | **TTL (Time To Live)**     | **Description**                                                                                                                                              |
| -------------------------- | ------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `session:{session_id}`     | Hash / JSON   | 7 days (Refresh on active) | Lưu context người dùng: `{ user_id, email, ip, role }`. Dùng để verify login nhanh mà không cần query DB `users`.                                            |
| `cart:{session_id}`        | Hash          | 30 days                    | Lưu giỏ hàng tạm cho Guest (`variant_id` -> `quantity`). Khi Guest login, merge dữ liệu này vào bảng `cart_items` trong DB.                                  |
| `lock:stock:{variant_id}`  | String        | 10 - 30 seconds            | **Distributed Lock:** Dùng khi bấm nút "Thanh toán". Khóa cứng SKU này lại để trừ tồn kho trong DB. Ngăn chặn Race Condition (2 người mua cùng lúc).         |
| `reserve:order:{order_id}` | String        | 15 minutes                 | **Inventory Reservation:** "Giữ hàng" trong lúc chờ Payment Gateway phản hồi. Nếu sau 15p không có webhook `success`, hệ thống sẽ release (trả) lại tồn kho. |
| `cache:product:{slug}`     | String (JSON) | 1 hour                     | Cache full thông tin trang chi tiết sản phẩm (Product Detail) để giảm tải cho DB khi có traffic cao.                                                         |
| `limiter:api:{ip}`         | Counter       | 1 minute                   | Rate Limiting: Chống spam request/DDoS cơ bản.                                                                                                               |

**Logic "Giữ sản phẩm" (Reservation Flow)**
Để đảm bảo không bán lố (Overselling), quy trình sử dụng Redis như sau:

1. **Checkout Start:** Khi user xác nhận đơn, tạo key `reserve:order:{order_id}` chứa danh sách items.
2. **Stock Deduct:** Trừ tồn kho tạm thời (hoặc đánh dấu là "đang giữ") trong DB/Redis.
3. **Payment:** User chuyển qua cổng thanh toán (Stripe/Momo).
4. **Completion:**

    - _Nếu thành công:_ Xóa key `reserve`, chính thức trừ tồn kho trong DB (nếu chưa trừ) hoặc update status đơn hàng thành `paid`.
    - _Nếu thất bại/Timeout (TTL expired):_ Redis key tự hết hạn -> Worker quét và hoàn lại số lượng tồn kho cho sản phẩm.

### Module Media & Assets (Cloudinary)

Sử dụng Cloudinary để lưu trữ và tự động tối ưu hóa hình ảnh (Auto-format WebP/AVIF, Auto-quality). Không lưu file trực tiếp lên Server.

**Chiến lược Upload:** **Signed Uploads**.

- Frontend gọi API xin `signature` từ Backend (để bảo mật, tránh ai cũng upload được).
- Frontend upload trực tiếp lên Cloudinary (giảm tải cho Server).
- Cloudinary trả về URL -> Frontend gửi URL đó về Backend để lưu vào DB.

Table: cloudinary_folders (Cấu trúc lưu trữ)

Quy hoạch thư mục để dễ quản lý file (Digital Asset Management).

| **Folder Path**        | **Resource Type** | **Access Control** | **Description**                                                           |
| ---------------------- | ----------------- | ------------------ | ------------------------------------------------------------------------- |
| `music-store/artists`  | Image             | Public             | Lưu Avatar, Cover của nghệ sĩ.                                            |
| `music-store/products` | Image             | Public             | Lưu ảnh bìa Album, ảnh Merch, ảnh đĩa than.                               |
| `music-store/users`    | Image             | Authenticated      | Avatar người dùng.                                                        |
| `music-store/banners`  | Image             | Public             | Banner quảng cáo, Slider trang chủ.                                       |
| `music-store/raw`      | Raw (File)        | Private            | (Optional) Lưu file nhạc preview ngắn (.mp3) nếu không dùng link Spotify. |

Table: transformation_presets (Quy định kích thước ảnh)

Thay vì hardcode size ở Frontend, ta cấu hình "Named Transformation" trên Cloudinary. Khi cần đổi size toàn bộ web thì chỉ cần sửa trên Dashboard Cloudinary.

| **Preset Name**    | **Resolution (px)** | **Mode**           | **Use Case**                                |
| ------------------ | ------------------- | ------------------ | ------------------------------------------- |
| `t_thumb`          | 150x150             | `c_fill, g_face`   | Avatar user, Thumbnail nhỏ trong giỏ hàng.  |
| `t_product_card`   | 400x400             | `c_pad, b_auto`    | Hiển thị ở trang danh sách sản phẩm (Grid). |
| `t_product_detail` | 1000x1000           | `c_limit`          | Ảnh chi tiết khi zoom sản phẩm.             |
| `t_banner_desktop` | 1920x600            | `c_fill, g_center` | Banner lớn trang chủ.                       |

---

**Lưu ý cho Dev (Dev Note):**

- **Database:** Trong các bảng `products` (cột `media_gallery`) hay `artists` (cột `avatar_url`), chỉ cần lưu **Full Secure URL** (ví dụ: `https://res.cloudinary.com/.../image/upload/v1234/music-store/products/blackpink-lp.jpg`).
- **Optimization:** Luôn thêm tham số `f_auto,q_auto` vào URL khi render để Cloudinary tự chọn định dạng ảnh nhẹ nhất cho máy người dùng.

### Các ràng buộc & Lưu ý cho Dev (Dev Notes)

1. **Composite Indexing:**

    - Tạo Index cho `products(slug)`, `artists(slug)` để tối ưu tìm kiếm URL.
    - Tạo Index cho `orders(guest_email)` và `orders(user_id)` để tra cứu lịch sử đơn hàng nhanh.

2. **JSONB flexibility:**

    - Cột `attributes` trong `product_variants` cho phép ta bán các loại sản phẩm khác nhau (Áo có size S/M/L, Đĩa than có màu sắc/trọng lượng) mà không cần sửa cấu trúc bảng.
    - Cột `shipping_address` trong `orders` phải lưu full text địa chỉ. Không được chỉ lưu ID tham chiếu đến bảng Address của User, vì nếu User sửa địa chỉ trong profile, địa chỉ của đơn hàng cũ cũng bị đổi theo -> Sai dữ liệu lịch sử.

3. **Concurrency (Tồn kho):**

    - Khi trừ tồn kho (`stock_quantity`), cần sử dụng Database Transaction hoặc cơ chế Lock (Optimistic Locking) để tránh trường hợp 2 người cùng mua 1 sản phẩm cuối cùng.

4. **Soft Delete:**

    - Với `products`, `artists`, `staff`: Hệ thống không dùng lệnh `DELETE` SQL. Chỉ `UPDATE table SET deleted_at = NOW()`. Mọi câu query `SELECT` phải luôn kèm điều kiện `WHERE deleted_at IS NULL`.

## 4. Interface Design (API)

Sử dụng RESTful API chuẩn. Mọi request từ Admin Portal phải đi qua Middleware kiểm tra quyền.

### Storefront API (Dành cho Guest & User)

Prefix chung: /api
Cơ chế Session: Redis Key user:session:...

**Authentication (User)**

| **Route**                   | **Method** | **Description**                | **Payload / Note**                     |
| --------------------------- | ---------- | ------------------------------ | -------------------------------------- |
| `/api/auth/register`        | POST       | Đăng ký tài khoản              | `{ email, password, fullName, phone }` |
| `/api/auth/login`           | POST       | Đăng nhập                      | `{ email, password }`                  |
| `/api/auth/logout`          | POST       | Đăng xuất (Xóa session Redis)  | -                                      |
| `/api/auth/refresh`         | POST       | Cấp lại Access Token           | `{ refreshToken }`                     |
| `/api/auth/me`              | GET        | Lấy info bản thân              | _(Header: Bearer Token)_               |
| `/api/auth/forgot-password` | POST       | Yêu cầu reset pass             | `{ email }`                            |
| `/api/auth/reset-password`  | POST       | Đặt lại pass mới               | `{ token, newPassword }`               |
| `/api/auth/profile`         | PUT        | Cập nhật thông tin cá nhân     | `{ fullName, ... }`                    |
| `/api/auth/change-password` | PUT        | Đổi mật khẩu (User đang login) | `{ oldPassword, newPassword }`         |

**Catalog (Public View)**

| **Route**             | **Method** | **Description**        | **Note**                                      |
| --------------------- | ---------- | ---------------------- | --------------------------------------------- |
| `/api/products`       | GET        | Tìm kiếm, lọc sản phẩm | Query: `keyword`, `artistId`, `type`, `price` |
| `/api/products/:slug` | GET        | Chi tiết sản phẩm      | Kèm variants, related artists                 |
| `/api/artists`        | GET        | Danh sách nghệ sĩ      | Query: `search`, `country`                    |
| `/api/artists/:slug`  | GET        | Chi tiết nghệ sĩ       | Kèm discography                               |
| `/api/categories`     | GET        | Lấy menu danh mục      |                                               |

**Cart & Checkout**

| **Route**                          | **Method** | **Description**                | **Payload**                                 |
| ---------------------------------- | ---------- | ------------------------------ | ------------------------------------------- |
| `/api/cart`                        | GET        | Xem giỏ hàng hiện tại          | Dựa theo Token hoặc Session ID              |
| `/api/cart/items`                  | POST       | Thêm vào giỏ                   | `{ productVariantId, quantity }`            |
| `/api/cart/items/:id`              | PATCH      | Sửa số lượng                   | `{ quantity }`                              |
| `/api/cart/items/:id`              | DELETE     | Xóa 1 món                      |                                             |
| `/api/cart`                        | DELETE     | Xóa sạch giỏ                   |                                             |
| `/api/cart/coupon`                 | POST       | Áp dụng mã giảm giá            | `{ code }`                                  |
| `/api/cart/coupon`                 | DELETE     | Gỡ mã giảm giá                 |                                             |
| `/api/checkout/guest`              | POST       | Tạo session cho Guest          | `{ email }`                                 |
| `/api/checkout/preview`            | POST       | Tính phí ship & Tổng tiền      | `{ address, shippingMethodId }`             |
| `/api/checkout/submit`             | POST       | Tạo đơn & Lấy link thanh toán  | `{ shippingAddress, paymentMethod, items }` |
| `/api/checkout/shipping-methods`   | GET        | Lấy các phương thức vận chuyển | Trả về ID, tên, phí ship dự kiến            |
| `/api/checkout/payment-methods`    | GET        | Lấy các phương thức thanh toán | Momo, COD, Credit Card...                   |
| `/api/checkout/verify-transaction` | GET        | Xác minh trạng thái thanh toán | `{ orderId }`                               |
**User Orders (My Orders)**

| **Route**                | **Method** | **Description**   | **Note**                             |
| ------------------------ | ---------- | ----------------- | ------------------------------------ |
| `/api/orders`            | GET        | Lịch sử mua hàng  | Query: `page`, `limit`               |
| `/api/orders/:id`        | GET        | Chi tiết đơn hàng | Check đúng `user_id` mới trả về      |
| `/api/orders/:id/cancel` | PATCH      | User tự hủy đơn   | Chỉ cho hủy khi đơn mới là `Pending` |

---
### Admin Portal API (Dành cho Staff)

Prefix chung: /api/admin

Middleware bắt buộc: CheckStaffToken + CheckPermission

Cơ chế Session: Redis Key staff:session:...

**Authentication (Staff)**

| **Route**                 | **Method** | **Description**             | **Payload**                  |
| ------------------------- | ---------- | --------------------------- | ---------------------------- |
| `/api/admin/auth/login`   | POST       | Đăng nhập nội bộ            | `{ email, password }`        |
| `/api/admin/auth/logout`  | POST       | Đăng xuất (Xóa session)     |                              |
| `/api/admin/auth/refresh` | POST       | Cấp lại token làm việc      | `{ refreshToken }`           |
| `/api/admin/auth/me`      | GET        | Lấy info & quyền hạn        |                              |
| `/api/admin/upload/image` | POST       | Upload ảnh (Product/Artist) | `multipart/form-data` (file) |
**Staff Management (Super Admin)**

| **Route**               | **Method** | **Description**         | **Payload**                 |
| ----------------------- | ---------- | ----------------------- | --------------------------- |
| `/api/admin/staffs`     | GET        | Danh sách nhân viên     |                             |
| `/api/admin/staffs`     | POST       | Tạo nhân viên mới       | `{ email, name, roleIds }`  |
| `/api/admin/staffs/:id` | PATCH      | Khóa/Mở khóa, đổi quyền | `{ status, roleIds }`       |
| `/api/admin/roles`      | GET        | Xem danh sách Roles     |                             |
| `/api/admin/roles`      | POST       | Định nghĩa Role mới     | `{ name, permissions: [] }` |

**Product & Inventory Management**

| **Route**                   | **Method** | **Description**    | **Payload**                     |
| --------------------------- | ---------- | ------------------ | ------------------------------- |
| `/api/admin/products`       | POST       | Tạo sản phẩm mới   | `{ name, type, variants, ... }` |
| `/api/admin/products/:id`   | PUT        | Cập nhật sản phẩm  |                                 |
| `/api/admin/products/:id`   | DELETE     | Xóa mềm (Archived) |                                 |
| `/api/admin/categories`     | POST       | Tạo danh mục       | `{ name, parentId }`            |
| `/api/admin/categories/:id` | PUT        | Sửa danh mục       |                                 |
| `/api/admin/categories/:id` | DELETE     | Xóa danh mục       |                                 |

**Artist Management**

| **Route**                | **Method** | **Description** | **Payload**               |
| ------------------------ | ---------- | --------------- | ------------------------- |
| `/api/admin/artists`     | POST       | Tạo nghệ sĩ mới | `{ stageName, bio, ... }` |
| `/api/admin/artists/:id` | PUT        | Sửa thông tin   |                           |
| `/api/admin/artists/:id` | DELETE     | Xóa mềm         |                           |

**Order Management**

| **Route**                      | **Method** | **Description**     | **Payload**                  |
| ------------------------------ | ---------- | ------------------- | ---------------------------- |
| `/api/admin/orders`            | GET        | Quản lý toàn bộ đơn | Query: `status`, `dateRange` |
| `/api/admin/orders/:id`        | GET        | Xem chi tiết xử lý  |                              |
| `/api/admin/orders/:id/status` | PATCH      | Cập nhật trạng thái | `{ status, trackingCode }`   |

**Marketing (Discount)**

| **Route**                  | **Method** | **Description**   | **Payload**                 |
| -------------------------- | ---------- | ----------------- | --------------------------- |
| `/api/admin/discounts`     | GET        | List mã giảm giá  |                             |
| `/api/admin/discounts`     | POST       | Tạo mã campaign   | `{ code, value, limit... }` |
| `/api/admin/discounts/:id` | PUT        | Sửa/Dừng campaign |                             |

---

### Webhook (System)

_Không thuộc User hay Admin, dành cho 3rd Party._

| **Route**               | **Method** | **Description**             | **Note**                |
| ----------------------- | ---------- | --------------------------- | ----------------------- |
| `/api/webhooks/payment` | POST       | Nhận IPN từ Payment Gateway | Stripe/Momo gọi vào đây |

---

## 5. Assumptions and Dependencies

**Assumptions**

- Hệ thống triển khai trên VPS Linux (Ubuntu), sử dụng Docker Compose.
- Số lượng sản phẩm ban đầu dưới 10,000 SKU.
- Không xử lý tồn kho đa kho (Multi-warehouse) trong giai đoạn MVP.

**Dependencies**

- **Payment Gateways:** Stripe (Visa/Master), VietQR/MoMo (Local).
- **Email Service:** SendGrid hoặc AWS SES (Gửi mail xác nhận đơn, reset password).
- **Shipping Provider:** API Giao Hàng Tiết Kiệm hoặc GHN (để tính phí ship dynamic).
- **Music Data:** Spotify API (để lấy metadata bổ sung hoặc link preview nhạc).

---

## 6. Glossary of Terms

- **Landed Cost:** Tổng chi phí người mua phải trả để nhận hàng (Giá SP + Phí ship + Thuế + Phí xử lý).
- **Guest Checkout:** Quy trình thanh toán không yêu cầu đăng nhập hoặc tạo tài khoản trước.
- **Soft Delete:** Xóa mềm - chỉ đánh dấu trạng thái là `Inactive` trong database chứ không xóa record vật lý, để giữ lịch sử giao dịch.
- **RBAC (Role-Based Access Control):** Kiểm soát truy cập dựa trên vai trò.
- **SKU (Stock Keeping Unit):** Mã định danh duy nhất cho từng biến thể sản phẩm (ví dụ: Áo-Đen-L, Áo-Đen-M).
- **Webhook:** Cơ chế "gọi lại" từ server bên thứ 3 (thanh toán) về server mình để thông báo trạng thái.
