# Quick cURL Test (after server starts)

# 1) Health
curl http://localhost:3000/health

# 2) Get menu (replace signature)
curl "http://localhost:3000/api/public/menu?tableCode=T01&signature=REPLACE_SIGNATURE"

# 3) Create order
curl -X POST "http://localhost:3000/api/public/orders" ^
  -H "Content-Type: application/json" ^
  -d "{\"tableCode\":\"T01\",\"signature\":\"REPLACE_SIGNATURE\",\"items\":[{\"menuItemId\":1,\"quantity\":2}],\"customerNote\":\"Less spicy\"}"

# 4) Staff list orders (replace JWT)
curl "http://localhost:3000/api/staff/orders" -H "Authorization: Bearer REPLACE_STAFF_TOKEN"

# 5) Update order status
curl -X PATCH "http://localhost:3000/api/staff/orders/1/status" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer REPLACE_STAFF_TOKEN" ^
  -d "{\"status\":\"preparing\",\"reason\":\"Kitchen accepted\"}"

# 6) Create payment
curl -X POST "http://localhost:3000/api/staff/payments" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer REPLACE_STAFF_TOKEN" ^
  -d "{\"orderId\":1,\"amount\":165000,\"method\":\"cash\",\"note\":\"Paid\"}"
