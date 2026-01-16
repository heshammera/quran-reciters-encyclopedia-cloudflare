# دليل النشر على Cloudflare Pages
# Cloudflare Pages Deployment Guide

<div dir="rtl">

## 📋 المتطلبات الأساسية

- حساب على [Cloudflare](https://cloudflare.com)
- حساب على [GitHub](https://github.com)
- قاعدة البيانات على [Supabase](https://supabase.com) جاهزة ومفعلة

## 🚀 خطوات النشر

### 1️⃣ تحضير المشروع للنشر

#### رفع الكود على GitHub

```bash
# تأكد إن .env.local مش في Git
git status

# لو فيها حاجات جديدة، أضفها
git add .

# اعمل commit
git commit -m "تحضير المشروع للنشر على Cloudflare Pages"

# ارفع على GitHub
git push origin main
```

> **⚠️ تحذير**: تأكد تماماً إن ملف `.env.local` **مش** متضاف في Git. الملف ده فيه API keys حساسة.

---

### 2️⃣ إنشاء مشروع على Cloudflare Pages

1. **افتح** [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. **اختار** "Workers & Pages" من القائمة الجانبية
3. **اضغط** على "Create application"
4. **اختار** تبويب "Pages"
5. **اضغط** على "Connect to Git"

#### ربط GitHub Repository

1. **اختار** "GitHub" كمصدر
2. **وافق** على الصلاحيات المطلوبة
3. **اختار** الـ repository بتاع المشروع
4. **اضغط** على "Begin setup"

---

### 3️⃣ ضبط إعدادات البناء (Build Settings)

في صفحة إعدادات المشروع:

| الإعداد | القيمة |
|---------|--------|
| **Project name** | `quran-reciters-encyclopedia` (أو أي اسم تختاره) |
| **Production branch** | `main` |
| **Framework preset** | Next.js |
| **Build command** | `npm run pages:build` |
| **Build output directory** | `.vercel/output/static` |
| **Node version** | `20` أو أحدث |

> **💡 ملحوظة**: Cloudflare Pages هيتعرف تلقائياً على Next.js لكن تأكد من الإعدادات دي.

---

### 4️⃣ إضافة المتغيرات البيئية (Environment Variables)

هذه الخطوة **حرجة وضرورية** لعمل الموقع:

1. **اذهب** إلى Settings > Environment variables
2. **أضف** كل متغير من دول:

#### متغيرات Supabase

```
NEXT_PUBLIC_SUPABASE_URL = https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbG....
SUPABASE_SERVICE_KEY = eyJhbG....
```

#### متغيرات الذكاء الاصطناعي

```
GOOGLE_GENERATIVE_AI_API_KEY = AIzaSy....,AIzaSy....,AIzaSy....
GROQ_API_KEY = gsk_....
```

> **📝 ملاحظات:**
> - انسخ القيم من ملف `.env.local` الموجود عندك محلياً
> - متغير `GOOGLE_GENERATIVE_AI_API_KEY` ممكن يحتوي على عدة مفاتيح مفصولة بفاصلة
> - تأكد إن مفيش مسافات زيادة قبل أو بعد القيم

3. **اختار** "Production" كبيئة للمتغيرات
4. **احفظ** التغييرات

---

### 5️⃣ بدء النشر

1. **اضغط** على "Save and Deploy"
2. **انتظر** عملية البناء (عادة 3-5 دقائق)
3. **تابع** سجل البناء للتأكد من عدم وجود أخطاء

#### في حالة نجاح البناء

- هتلاقي رسالة `✓ Build completed successfully`
- هيظهر لك رابط الموقع المنشور (مثال: `https://quran-reciters-encyclopedia.pages.dev`)

---

### 6️⃣ الاختبار والتحقق

بعد النشر، تحقق من:

✅ **الاتصال بقاعدة البيانات**
- افتح الموقع
- جرب تصفح صفحة القراء
- تأكد من ظهور البيانات

✅ **لوحة التحكم (Admin Panel)**
- جرب تسجيل الدخول
- جرب إضافة/تعديل بيانات

✅ **المشغل الصوتي**
- جرب تشغيل تسجيل صوتي
- تأكد من عمل waveform visualization

✅ **المساعد الذكي**
- جرب خاصية Smart Assistant
- تأكد من استجابة AI

✅ **PWA والوضع غير المتصل**
- جرب تثبيت التطبيق كـ PWA
- اختبر الـ offline capabilities

---

## 🔄 التحديثات المستقبلية

### نشر تحديثات جديدة

عشان تنشر تحديث جديد، كل اللي عليك:

```bash
git add .
git commit -m "وصف التحديث"
git push origin main
```

**Cloudflare Pages هيعيد النشر تلقائياً** بمجرد push على GitHub! 🎉

---

## 🛠️ استكشاف الأخطاء

### مشكلة: "Build Failed"

**الحل:**
```bash
# جرب البناء محلياً الأول
npm install
npm run pages:build

# لو فيه أخطاء، صلحها وارفع التحديث
```

### مشكلة: "Cannot connect to database"

**الحل:**
1. تأكد من إضافة متغيرات Supabase صح في Cloudflare
2. راجع الـ Supabase Dashboard وتأكد إن API keys سليمة
3. تأكد إن RLS policies مضبوطة صح

### مشكلة: "AI Features not working"

**الحل:**
1. تأكد من إضافة `GOOGLE_GENERATIVE_AI_API_KEY` و `GROQ_API_KEY`
2. تأكد من صحة المفاتيح
3. تأكد من وجود quota كافي في حسابات API

### مشكلة: "Page not found (404)"

**الحل:**
- تأكد من build command والـ output directory صح
- جرب Redeploy من Cloudflare Dashboard

---

## 📊 الأداء والتحسين

### Cloudflare CDN

موقعك دلوقتي بيستخدم شبكة Cloudflare العالمية:
- ⚡ سرعة فائقة في كل أنحاء العالم
- 🌍 CDN بيوزع المحتوى من أقرب سيرفر
- 🔒 حماية DDoS تلقائية
- 📈 Analytics مجاني

### مراقبة الأداء

1. اذهب إلى **Analytics** في Cloudflare Dashboard
2. راقب:
   - عدد الزوار
   - الـ bandwidth المستخدم
   - أوقات التحميل
   - الأخطاء

---

## 🔗 روابط مفيدة

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Supabase Docs](https://supabase.com/docs)

---

## ✨ نصائح إضافية

1. **Custom Domain**: ممكن تربط domain خاص بيك من Cloudflare Dashboard
2. **Preview Deployments**: كل Pull Request هيتم نشره كـ preview تلقائياً
3. **Rollback**: ممكن ترجع لأي نشر سابق بضغطة واحدة
4. **Analytics**: فعّل Cloudflare Web Analytics لإحصائيات مفصلة

---

</div>

---

## English Version

## 📋 Prerequisites

- [Cloudflare](https://cloudflare.com) account
- [GitHub](https://github.com) account  
- [Supabase](https://supabase.com) database ready

## 🚀 Deployment Steps

### 1️⃣ Prepare Project

```bash
git add .
git commit -m "Prepare for Cloudflare Pages deployment"
git push origin main
```

⚠️ **Ensure `.env.local` is NOT in Git**

### 2️⃣ Create Cloudflare Pages Project

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select "Workers & Pages"
3. Click "Create application" > "Pages" > "Connect to Git"
4. Select your repository

### 3️⃣ Build Settings

| Setting | Value |
|---------|-------|
| Production branch | `main` |
| Framework | Next.js |
| Build command | `npm run pages:build` |
| Build output | `.vercel/output/static` |

### 4️⃣ Environment Variables

Add in Settings > Environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...
GROQ_API_KEY=...
```

### 5️⃣ Deploy

Click "Save and Deploy" and wait 3-5 minutes.

### 6️⃣ Verify

Test:
- ✅ Database connectivity
- ✅ Admin panel
- ✅ Audio player
- ✅ AI assistant
- ✅ PWA features

## 🔄 Future Updates

Just push to GitHub - auto-deploys! 🎉

```bash
git push origin main
```

## 🛠️ Troubleshooting

**Build fails?** Test locally first:
```bash
npm run pages:build
```

**Database issues?** Check environment variables in Cloudflare.

**404 errors?** Verify build command and output directory.

---

**🎉 مبروك! موقعك دلوقتي على Cloudflare Pages!**
