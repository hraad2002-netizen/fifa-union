# اتحاد الفيفا — النسخة المستقلة

تطبيق ويب يتثبّت على شاشة الموبايل الرئيسية. البيانات على Firebase (مجاني)، والدخول بالاسم + رمز سري من 6 أرقام.

## 1) إنشاء مشروع Firebase (مرة وحدة، حوالي 10 دقايق)

1. افتح https://console.firebase.google.com وسجّل بحساب جوجل ← **Add project** ← اسمه مثلاً `fifa-union` (أوقف Google Analytics).
2. **Build ← Authentication ← Get started ← Sign-in method ← Email/Password ← Enable ← Save.**
3. **Build ← Firestore Database ← Create database** ← اختر **Production mode** وأقرب منطقة (مثلاً `eur3`).
4. من تبويب **Rules** بالـ Firestore: امسح كل شي والصق محتوى ملف `firestore.rules` كامل ← **Publish**.
5. **Project settings (أيقونة الترس) ← Your apps ← أيقونة الويب `</>`** ← سمّه ← Register app. راح يطلع لك `firebaseConfig`.
6. افتح `firebase-config.js` وانسخ القيم مكان `PASTE_...` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).

> مفتاح `apiKey` عندهم مو سري، الحماية الفعلية من قواعد Firestore (الخطوة 4).

## 2) رفع الموقع على GitHub Pages

1. أنشئ مستودع جديد على GitHub (مثلاً `fifa-union`) وارفع كل ملفات هذا المجلد بالجذر: `index.html`, `sw.js`, `manifest.webmanifest`, `firebase-config.js`, مجلد `icons`.
2. **Settings ← Pages ← Source: Deploy from a branch ← Branch: main / (root) ← Save.**
3. بعد دقيقة يطلع الرابط: `https://اسمك.github.io/fifa-union/`
4. بـ Firebase: **Authentication ← Settings ← Authorized domains ← Add domain** وضيف `اسمك.github.io`.

## 3) التثبيت على الموبايل (لكل صديق)

- **آيفون:** افتح الرابط بـ Safari ← زر المشاركة ← **Add to Home Screen**.
- **أندرويد:** افتح الرابط بـ Chrome ← القائمة ⋮ ← **Install app** / **Add to Home screen**.

## 4) أول استخدام

- **أول واحد يسجّل يصير القائد تلقائياً.** سجّل انت أول واحد قبل ما ترسل الرابط.
- كل صديق: "أول مرة؟ سجّل حساب جديد" ← اسم + صورة (اختياري) + رمز 6 أرقام.
- القائد يحدد المساعدين والصلاحيات من تبويب المزيد ← الإدارة.

## ملاحظات

- **نسيان الرمز:** حالياً ما اكو "نسيت الرمز". الحل: القائد يحذف حسابه من Firebase (Authentication ← Users ← Delete)، ويحذف لاعبه من الإدارة، ويسجّل الصديق من جديد.
- **تغيير الاسم:** الاسم الظاهر يتغير، بس الدخول يبقى بالاسم الأصلي (يظهر بصفحة ملفي).
- **الأمان:** القواعد بـ `firestore.rules` تفرض الأدوار والصلاحيات على السيرفر (القائد، المساعد، اللاعب) وتمنع أي واحد يصوّت أو يكتب باسم غيره. الرمز 6 أرقام بس، وFirebase يحدّ المحاولات المتكررة تلقائياً.
- **القيود:** المنشورات الرسمية (أخبار الاتحاد التلقائية) يكدر أي عضو مسجل ينشئها نظرياً من خارج التطبيق. الباقي محمي.
- **الحصة المجانية:** خطة Spark تكفي مجموعة أصدقاء بسهولة (50 ألف قراءة باليوم).
- **تحديث التطبيق:** عدّل الملفات على GitHub وتتحدث عند الجميع.
