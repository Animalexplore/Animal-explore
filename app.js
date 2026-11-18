
(() => {
  const $ = s => document.querySelector(s);
  const view = $('#view');
  const panel = $('#authPanel');

  const toast = message => {
    const t = $('#toast');
    if (t) {
      t.textContent = message;
      t.style.display = 'block';
    } else {
      alert(message);
    }
  };

  const ready = window.supabase &&
    window.SUPABASE_URL &&
    window.SUPABASE_ANON_KEY;

  if (!ready) {
    toast('اتصال دیتابیس برقرار نیست. config.js را بررسی کن.');
    return;
  }

  const db = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );

  $('#authBtn')?.addEventListener('click', async () => {
    const { data } = await db.auth.getSession();

    if (data.session) {
      await db.auth.signOut();
      location.reload();
    } else {
      panel?.classList.toggle('hidden');
    }
  });

  $('#signup')?.addEventListener('click', async () => {
    try {
      const email = $('#email').value.trim();
      const password = $('#password').value;
      const displayName = $('#displayName').value.trim();

      if (!email || !password)
        throw new Error('ایمیل و رمز عبور را وارد کن.');

      if (password.length < 6)
        throw new Error('رمز باید حداقل ۶ کاراکتر باشد.');

      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName }
        }
      });

      if (error) throw error;

      if (data.session) {
        toast('ثبت‌نام موفق بود!');
        location.reload();
      } else {
        toast('ثبت‌نام انجام شد؛ ایمیلت را برای تأیید بررسی کن.');
      }
    } catch (e) {
      toast(e.message);
    }
  });

  $('#login')?.addEventListener('click', async () => {
    try {
      const email = $('#email').value.trim();
      const password = $('#password').value;

      if (!email || !password)
        throw new Error('ایمیل و رمز عبور را وارد کن.');

      const { error } = await db.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      toast('ورود موفق بود!');
      location.reload();
    } catch (e) {
      toast(e.message);
    }
  });

  db.auth.getSession().then(({ data }) => {
    if (data.session) {
      $('#authBtn').textContent = 'خروج';
      view.innerHTML =
        '<div class="welcome"><h1>خوش آمدی 🐾</h1><p>وارد حساب شدی.</p></div>';
    } else {
      view.innerHTML =
        '<div class="welcome"><h1>به Animal Explore خوش آمدی 🐾</h1><p>دنیای مجازی انیمال راش</p><button class="primary" id="openAuth">ورود و شروع</button></div>';

      $('#openAuth')?.addEventListener('click', () => {
        panel?.classList.remove('hidden');
      });
    }
  });
})();
