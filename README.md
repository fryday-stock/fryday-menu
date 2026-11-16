# منيو فرايدي — FRY DAY

منيو إلكتروني للطلب الخارجي (النجف). الطلب ينحفظ بالسيرفر ويوصل للمطعم على واتساب.

- المنيو: `/` · لوحة الإدارة: `/admin/`
- الاستضافة: Cloudflare Pages + Functions + D1 (+ R2 اختياري)
- التفاصيل والقرارات وهيكل المشروع: [`CLAUDE.md`](CLAUDE.md)

## إعداد Cloudflare Pages
- Build command: `npm run build` · Output: `dist` · Node 22 (`.node-version`)
- Bindings: D1 باسم `DB` (إجباري)، R2 باسم `MEDIA` (اختياري — بدونه الصور تنحفظ بـ D1)
- Secret: `ADMIN_PASSWORD_HASH` — يتولد من `/admin/#/password` (داخل المتصفح، ما ينرسل لأي مكان)

## تطوير محلي
```
npm install
npm run build
npx wrangler pages dev dist --d1 DB --port 8788
```
كلمة سر محلية للتجربة بملف `.dev.vars` (مستثنى من git): `ADMIN_PASSWORD=...`
