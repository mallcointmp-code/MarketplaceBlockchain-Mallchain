# Seller Dashboard API

This document describes the recommended API contract for seller dashboards used by the frontend dashboards (product and service).

## Summary
- GET `/api/seller/dashboard` (legacy) — existing route that returns `shops`, `products`, `orders`, `totalSales`.
- GET `/api/seller/dashboard/v2` — new richer endpoint returning `stats` plus `shops`, `products`, and `recentOrders`.

All endpoints require authentication (JWT) and seller role. Provide `Authorization: Bearer <token>` header.

---

## GET /api/seller/dashboard/v2

Response JSON shape:

{
  "stats": {
    "totalSales": number,                // revenue in last 30 days (number, currency in backend units)
    "totalSalesChange": number,          // percent change vs previous 30 days (float)
    "totalOrders": number,               // count in last 30 days
    "totalOrdersChange": number,         // percent change vs previous 30 days
    "visitors": number,                  // unique buyers proxy (last 30 days)
    "visitorsChange": number,
    "totalSoldProducts": number,         // total items sold (last 30 days)
    "totalSoldProductsChange": number,

    "productSalesToday": number,
    "productSalesTodayChange": number,

    "categoryStats": [                    // ordered by revenue desc
      { "category": string | null, "revenue": number, "qty": number }
    ],

    "customerHabitsSummary": { "periodDays": number, "totalOrders": number },
    "customerHabitsSeries": [              // time series for N days (date ISO, orders)
      { "date": "YYYY-MM-DD", "orders": number }
    ],

    "customerGrowthByRegion": [
      { "region": string | null, "count": number }
    ]
  },
  "shops": [ /* shop objects same as legacy */ ],
  "products": [ /* product objects same as legacy */ ],
  "recentOrders": [ /* recent orders same shape as legacy */ ]
}

Notes:
- Numeric fields are raw numbers (backend may format currency strings if desired). Frontend expects numbers for charts and percent calculations.
- If a field cannot be produced (missing data), return reasonable default values (0, empty arrays).

---

## Backwards compatibility
- The existing `GET /api/seller/dashboard` route remains and still returns `shops`, `products`, `orders`, `totalSales`. Frontend containers can adopt `/v2` to benefit from the new `stats` object while older clients remain compatible.

---

## Example curl

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/seller/dashboard/v2"
```

---

If you want, I can also output a small OpenAPI 3.0 YAML snippet for automation or swagger UI integration.
