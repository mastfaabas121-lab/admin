# نظام دَين

واجهة عربية متجاوبة لإدارة المخزون والزبائن والديون والمبيعات المباشرة والإحصائيات.

## التشغيل المحلي

```bash
npm install
npm run dev
```

يحتاج التطبيق إلى `VITE_CONVEX_URL` داخل `.env.local`. ملف البيئة المحلي مستبعد من Git.

## قاعدة البيانات

المشروع مربوط ببيئة Convex Development الخاصة بفريق `mstf-bs` ومشروع `admin`.

الجداول الحالية:

- `products`
- `customers`
- `debts`
- `payments`
- `sales`
- `saleItems`
