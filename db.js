/* ==========================================================
   GameX - طبقة الاتصال بقاعدة البيانات (Supabase)
   ----------------------------------------------------------
   غيّر القيمتين دول بالبيانات بتاعة مشروعك من:
   Supabase ← Project Settings ← API
   ========================================================== */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
  const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';

  const TABLE = 'games';
  const TOKEN_KEY = 'gamex_token';
  const base = SUPABASE_URL.replace(/\/$/, '');

  function configured() {
    return base.startsWith('https://') && !base.includes('YOUR-PROJECT') && !SUPABASE_ANON_KEY.startsWith('YOUR-');
  }

  function needConfig() {
    if (!configured()) throw new Error('لازم تحط بيانات Supabase في أول ملف db.js');
  }

  async function errorFrom(res) {
    let msg = 'خطأ ' + res.status;
    try {
      const j = await res.json();
      const detail = j.message || j.msg || j.error_description || j.error || '';
      if (detail) msg += ': ' + detail;
    } catch (_) { /* لا يوجد نص للخطأ */ }
    return new Error(msg);
  }

  function headers(extra) {
    const token = sessionStorage.getItem(TOKEN_KEY) || SUPABASE_ANON_KEY;
    return Object.assign({
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    }, extra || {});
  }

  // قراءة كل الألعاب (متاحة للزوار)
  async function getGames() {
    needConfig();
    const res = await fetch(`${base}/rest/v1/${TABLE}?select=id,data&order=created_at.desc`, { headers: headers() });
    if (!res.ok) throw await errorFrom(res);
    const rows = await res.json();
    return rows.map(r => ({ ...r.data, id: r.id }));
  }

  // حفظ مجموعة ألعاب (إضافة أو تعديل) - للأدمن فقط
  async function saveMany(list) {
    needConfig();
    const body = list.map(g => ({ id: g.id, data: g }));
    const res = await fetch(`${base}/rest/v1/${TABLE}?on_conflict=id`, {
      method: 'POST',
      headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(body)
    });
    if (!res.ok) throw await errorFrom(res);
  }

  // حذف لعبة - للأدمن فقط
  async function deleteGame(id) {
    needConfig();
    const res = await fetch(`${base}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: headers({ Prefer: 'return=minimal' })
    });
    if (!res.ok) throw await errorFrom(res);
  }

  // تسجيل دخول الأدمن
  async function login(email, password) {
    needConfig();
    const res = await fetch(`${base}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error('البريد أو كلمة السر غلط');
    const j = await res.json();
    sessionStorage.setItem(TOKEN_KEY, j.access_token);
  }

  function logout() { sessionStorage.removeItem(TOKEN_KEY); }
  function isLoggedIn() { return !!sessionStorage.getItem(TOKEN_KEY); }

  window.GameXDB = {
    getGames,
    saveMany,
    saveGame: g => saveMany([g]),
    deleteGame,
    login,
    logout,
    isLoggedIn
  };
})();
