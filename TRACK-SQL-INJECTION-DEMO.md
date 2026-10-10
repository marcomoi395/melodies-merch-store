# Demo SQL injection tại `/track`

Chỉ chạy với database thử nghiệm local. Backend bật bằng:

```sh
NODE_ENV=development TRACK_SQL_INJECTION_DEMO=true npm run start:dev
```

Mở frontend `/track`, để trống email, nhập vào ô số điện thoại:

```text
')>0 OR TRUE --
```

Backend cố ý nối số điện thoại vào điều kiện `length('${payload.phone}') > 0`.
Payload đóng chuỗi, thêm `OR TRUE`, comment phần còn lại của điều kiện; truy vấn
trả về tối đa 20 đơn gần nhất dù không biết số điện thoại, kể cả đơn của tài khoản.
Điều kiện tra cứu băm vẫn giữ nguyên vì thông tin khách hàng đang được mã hóa.
Đây là SQL injection thực trong điều kiện phụ dùng riêng cho demo.

Thử đối chứng bằng số `0900000000` chưa từng đặt hàng: không có kết quả.
Chờ 10 giây giữa các lần thử cùng input vì endpoint có giới hạn tần suất.
Tắt bằng `TRACK_SQL_INJECTION_DEMO=false`, khởi động lại backend.
Demo mặc định tắt, không bật khi `NODE_ENV=production`.

Kiểm tra:

```sh
npm test -- --runInBand src/order/order.service.spec.ts
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/mydb_test npm run test:database -- --runInBand test/database/customer-encryption.e2e-spec.ts
```
