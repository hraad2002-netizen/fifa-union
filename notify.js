// يشتغل كل بضع دقائق على GitHub Actions: يفحص الأحداث الجديدة ويرسل إشعارات FCM.
const admin = require('firebase-admin');

const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
admin.initializeApp({ credential: admin.credential.cert(svc) });
const db = admin.firestore();

const NOTIFY_POSTS = process.env.NOTIFY_POSTS === '1'; // منشورات اللاعبين العادية (افتراضياً مطفية)
const LOOKBACK = 3 * 60 * 1000; // نرجع 3 دقايق احتياط لفرق الساعات
const FIRST_RUN_WINDOW = 15 * 60 * 1000;

async function main() {
  const now = Date.now();
  const stRef = db.doc('server/state');
  const st = (await stRef.get()).data() || {};
  const since = (st.last || now - FIRST_RUN_WINDOW) - LOOKBACK;
  const sent = new Set(st.sent || []);

  const players = {};
  (await db.collection('players').get()).forEach(d => { players[d.id] = d.data().name || 'لاعب'; });

  const events = []; // {key, title, body, url, actor}
  const q = async (col) => (await db.collection(col).where('at', '>', since).get()).docs;

  for (const d of await q('posts')) {
    const p = d.data();
    if (p.sys) events.push({ key: 'post:' + d.id, title: 'أخبار الاتحاد', body: p.text, url: './#news' });
    else if (NOTIFY_POSTS) events.push({ key: 'post:' + d.id, title: players[p.uid] || 'منشور جديد', body: p.text, url: './#news', actor: p.uid });
  }
  for (const d of await q('cupRes')) {
    const r = d.data();
    events.push({ key: 'cup:' + d.id, title: 'نتيجة كأس الخميس', body: `${r.a} ${r.sa} - ${r.sb} ${r.b}`, url: './#cup', actor: r.by });
  }
  for (const d of await q('dayRes')) {
    const r = d.data();
    events.push({ key: 'day:' + d.id, title: 'نتيجة مباراة', body: `${r.a} ${r.sa} - ${r.sb} ${r.b}`, url: './#league', actor: r.by });
  }
  for (const d of await q('cases')) {
    const c = d.data();
    events.push({ key: 'case:' + d.id, title: 'قاضي الاتحاد', body: `شكوى جديدة: ${players[c.by] || 'لاعب'} ضد ${c.against}. ${c.title}`, url: './#court', actor: c.by });
  }

  // تذكير الخميس (بتوقيت بغداد): مرة وحدة كل خميس بعد الساعة 5 العصر
  const fakeNow = process.env.FAKE_NOW ? +process.env.FAKE_NOW : now;
  const bag = new Date(fakeNow + 3 * 3600 * 1000); // UTC+3
  if (bag.getUTCDay() === 4 && bag.getUTCHours() >= 17) {
    const today = bag.toISOString().slice(0, 10);
    const cfg = (await db.doc('election/config').get()).data();
    const elToday = cfg && (cfg.round === today || cfg.forceOpen);
    events.push({
      key: 'thu:' + today,
      title: 'اليوم الخميس',
      body: elToday ? `تصويت انتخابات الرئيس مفتوح: ${cfg.c1} ضد ${cfg.c2}. لا تنسى كأس الخميس.` : 'كأس الخميس اليوم. جهّز نفسك!',
      url: elToday ? './#election' : './#cup',
    });
  }

  // ملخص الأسبوع: كل جمعة بعد الساعة 10 صباحاً (بغداد) ينزل منشور رسمي مرة وحدة
  if (bag.getUTCDay() === 5 && bag.getUTCHours() >= 10) {
    const day = bag.toISOString().slice(0, 10), wkKey = 'wk:' + day;
    if (!sent.has(wkKey)) {
      const weekAgo = fakeNow - 7 * 86400000, ms = [];
      for (const col of ['dayRes', 'cupRes']) {
        (await db.collection(col).where('at', '>', weekAgo).get()).docs.forEach(d => { const r = d.data(); if (r.a && r.b) ms.push(r); });
      }
      if (ms.length) {
        const goals = {};
        let big = null;
        ms.forEach(m => {
          goals[m.a] = (goals[m.a] || 0) + m.sa; goals[m.b] = (goals[m.b] || 0) + m.sb;
          const mg = Math.abs(m.sa - m.sb);
          if (mg > 0 && (!big || mg > big.mg)) big = { m, mg };
        });
        const top = Object.entries(goals).sort((a, b) => b[1] - a[1])[0];
        const champs = (await db.collection('champions').where('at', '>', weekAgo).get()).docs.map(d => d.data().name).filter(Boolean);
        const parts = [`ملخص الأسبوع: ${ms.length} مباراة.`];
        if (top && top[1] > 0) parts.push(`الهداف: ${top[0]} (${top[1]} هدف).`);
        if (big) {
          const w = big.m.sa > big.m.sb ? [big.m.a, big.m.sa, big.m.b, big.m.sb] : [big.m.b, big.m.sb, big.m.a, big.m.sa];
          parts.push(`أكبر فوز: ${w[0]} ${w[1]} - ${w[3]} ${w[2]}.`);
        }
        if (champs.length) parts.push(`بطل الكأس: ${champs.join('، ')}.`);
        await db.doc('posts/wk_' + day).set({ sys: true, text: parts.join(' '), at: Date.now() });
        console.log('weekly summary posted');
      }
      sent.add(wkKey);
    }
  }

  const fresh = events.filter(e => !sent.has(e.key));
  console.log(`events: ${events.length}, new: ${fresh.length}`);

  if (fresh.length) {
    const tokDocs = (await db.collection('tokens').get()).docs.map(d => ({ uid: d.id, token: d.data().token })).filter(t => t.token);
    for (const ev of fresh) {
      const targets = tokDocs.filter(t => t.uid !== ev.actor);
      for (let i = 0; i < targets.length; i += 500) {
        const chunk = targets.slice(i, i + 500);
        const res = await admin.messaging().sendEachForMulticast({
          tokens: chunk.map(t => t.token),
          data: { title: String(ev.title).slice(0, 80), body: String(ev.body).slice(0, 200), url: ev.url, tag: ev.key },
          webpush: { headers: { Urgency: 'high', TTL: '86400' } },
        });
        // نحذف الرموز الميتة
        await Promise.all(res.responses.map((r, k) => {
          const code = r.error && r.error.code;
          if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') {
            return db.doc('tokens/' + chunk[k].uid).delete().catch(() => {});
          }
        }));
        console.log(`sent "${ev.key}" -> ${res.successCount}/${chunk.length}`);
      }
      sent.add(ev.key);
    }
  }
  await stRef.set({ last: now, sent: Array.from(sent).slice(-300) });
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
