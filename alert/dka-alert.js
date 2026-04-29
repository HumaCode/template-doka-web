/* ================================================================
   DKA — DokaKegiatan Alert Library  v1.0.0
   Tema    : DokaKegiatan (#4f46e5 Indigo / #06b6d4 Cyan)

   API:
     DKA.toast({ type, title, message, duration, position })
     DKA.alert({ type, title, message, closable }, target)
     DKA.dialog({ type, title, message, confirm, cancel })
       .then(result => { if(result) { ... } })
     DKA.loading({ title, message, style })        → 'ring'|'dots'|'wave'
       → { close(), update(msg) }
     DKA.notify({ type, title, message, duration })
     DKA.password({ title, confirm, cancel })
       .then(result => { if(result.confirmed) use result.password })
     DKA.approveUser({ user: {name,role,email,instansi,avatarGrad}, confirm, cancel })
       .then(result => { if(result) ... })
     DKA.deleteConfirm({ title, message, itemName, confirm, cancel })
       .then(result => { if(result) ... })
     DKA.close()  /  DKA.closeAll()
================================================================ */

(function (global) {
  'use strict';

  /* ── Icons Bootstrap Icons ── */
  const ICONS = {
    success : '<i class="bi bi-check-circle-fill"></i>',
    danger  : '<i class="bi bi-x-circle-fill"></i>',
    warning : '<i class="bi bi-exclamation-triangle-fill"></i>',
    info    : '<i class="bi bi-info-circle-fill"></i>',
    question: '<i class="bi bi-question-circle-fill"></i>',
    password: '<i class="bi bi-key-fill"></i>',
    approve : '<i class="bi bi-person-check-fill"></i>',
    delete  : '<i class="bi bi-trash3-fill"></i>',
  };

  /* ── Confirm button defaults per type ── */
  const CONFIRM_DEFAULTS = {
    success : { text: 'Ya, Lanjutkan',  cls: 'dka-btn-success'  },
    danger  : { text: 'Ya, Hapus',      cls: 'dka-btn-danger'   },
    warning : { text: 'Saya Mengerti', cls: 'dka-btn-warning'  },
    info    : { text: 'OK',            cls: 'dka-btn-info'     },
    question: { text: 'Ya',            cls: 'dka-btn-question' },
  };

  /* ── State ── */
  const _tw       = {};    // toast containers per position
  let   _backdrop = null;  // active backdrop (dialog/loading)
  let   _notify   = null;  // active notify panel

  /* ══════════════════════════════════════
     HELPERS
  ══════════════════════════════════════ */
  function h(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls)  e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function nowTime() {
    const d = new Date();
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
           ' · ' + d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function mkBackdrop(typeClass) {
    const bd = h('div', `dka-backdrop dka-t-${typeClass}`);
    document.body.appendChild(bd);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => bd.classList.add('dka-show'));
    _backdrop = bd;
    return bd;
  }

  function rmBackdrop(bd) {
    if (!bd) return;
    bd.classList.remove('dka-show');
    document.body.style.overflow = '';
    setTimeout(() => bd.parentNode && bd.parentNode.removeChild(bd), 350);
    if (_backdrop === bd) _backdrop = null;
  }

  function trapFocus(el) {
    const sel = 'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
    const all = [...el.querySelectorAll(sel)];
    if (!all.length) return;
    all[0].focus();
    el.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      const first = all[0], last = all[all.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ══════════════════════════════════════
     1. DKA.dialog()
     Returns: Promise<boolean>
  ══════════════════════════════════════ */
  function dialog(opts) {
    opts = Object.assign({
      type   : 'info',
      title  : 'Konfirmasi',
      message: 'Apakah Anda yakin ingin melanjutkan?',
      confirm: null,
      cancel : 'Batal',
    }, opts);

    const type  = opts.type;
    const def   = CONFIRM_DEFAULTS[type] || CONFIRM_DEFAULTS.info;
    const cfTxt = opts.confirm || def.text;
    const cfCls = def.cls;

    return new Promise(resolve => {
      const bd  = mkBackdrop(type);
      const box = h('div', 'dka-dialog');
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-labelledby', 'dka-dlg-title');

      box.innerHTML = `
        <div class="dka-dialog-bar"></div>
        <div class="dka-dialog-body">
          <div class="dka-icon-ring">${ICONS[type] || ICONS.info}</div>
          <div class="dka-dialog-title" id="dka-dlg-title">${esc(opts.title)}</div>
          <div class="dka-dialog-msg">${opts.message}</div>
        </div>
        <div class="dka-dialog-footer">
          ${opts.cancel !== false
            ? `<button class="dka-btn dka-btn-cancel dka-dlg-cancel">${esc(opts.cancel)}</button>`
            : ''}
          <button class="dka-btn ${cfCls} dka-dlg-ok">${esc(cfTxt)}</button>
        </div>`;

      bd.appendChild(box);
      trapFocus(box);

      function done(result) {
        rmBackdrop(bd);
        document.removeEventListener('keydown', onKey);
        resolve(result);
      }

      box.querySelector('.dka-dlg-ok').addEventListener('click', () => done(true));
      const cancelBtn = box.querySelector('.dka-dlg-cancel');
      if (cancelBtn) cancelBtn.addEventListener('click', () => done(false));
      bd.addEventListener('click', e => { if (e.target === bd) done(false); });

      function onKey(e) { if (e.key === 'Escape') done(false); }
      document.addEventListener('keydown', onKey);
    });
  }

  /* ══════════════════════════════════════
     2. DKA.deleteConfirm()
     Dialog hapus khusus — dengan chip nama item
     Returns: Promise<boolean>
  ══════════════════════════════════════ */
  function deleteConfirm(opts) {
    opts = Object.assign({
      title   : 'Hapus Data?',
      message : 'Tindakan ini tidak dapat dibatalkan. Data yang dihapus tidak bisa dipulihkan.',
      itemName: '',
      confirm : 'Ya, Hapus Sekarang',
      cancel  : 'Batal',
    }, opts);

    return new Promise(resolve => {
      const bd  = mkBackdrop('delete');
      const box = h('div', 'dka-dialog');
      box.setAttribute('role', 'alertdialog');
      box.setAttribute('aria-modal', 'true');

      box.innerHTML = `
        <div class="dka-dialog-bar"></div>
        <div class="dka-dialog-body">
          <div class="dka-icon-ring">${ICONS.delete}</div>
          <div class="dka-dialog-title">${esc(opts.title)}</div>
          <div class="dka-dialog-msg">${esc(opts.message)}</div>
          ${opts.itemName
            ? `<div style="margin-top:.75rem;">
                <span class="dka-delete-chip">
                  <i class="bi bi-trash3-fill"></i> ${esc(opts.itemName)}
                </span>
               </div>`
            : ''}
        </div>
        <div class="dka-dialog-footer">
          <button class="dka-btn dka-btn-cancel dka-dlg-cancel">${esc(opts.cancel)}</button>
          <button class="dka-btn dka-btn-danger dka-dlg-ok">
            <i class="bi bi-trash3-fill"></i> ${esc(opts.confirm)}
          </button>
        </div>`;

      bd.appendChild(box);
      trapFocus(box);

      function done(result) {
        rmBackdrop(bd);
        document.removeEventListener('keydown', onKey);
        resolve(result);
      }

      box.querySelector('.dka-dlg-ok').addEventListener('click', () => done(true));
      box.querySelector('.dka-dlg-cancel').addEventListener('click', () => done(false));
      bd.addEventListener('click', e => { if (e.target === bd) done(false); });
      function onKey(e) { if (e.key === 'Escape') done(false); }
      document.addEventListener('keydown', onKey);
    });
  }

  /* ══════════════════════════════════════
     3. DKA.approveUser()
     Dialog approve pengguna — dengan user card
     Returns: Promise<boolean>
  ══════════════════════════════════════ */
  function approveUser(opts) {
    opts = Object.assign({
      title  : 'Setujui Pengguna?',
      message: 'Pengguna berikut akan mendapatkan akses ke sistem DokaKegiatan.',
      user   : { name: 'Pengguna', role: 'User', email: '-', instansi: '-', avatarGrad: 'linear-gradient(135deg,#4f46e5,#7c3aed)' },
      confirm: 'Ya, Setujui Akun',
      cancel : 'Batal',
    }, opts);

    const u = opts.user;
    const initials = u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return new Promise(resolve => {
      const bd  = mkBackdrop('approve');
      const box = h('div', 'dka-dialog');
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');

      box.innerHTML = `
        <div class="dka-dialog-bar"></div>
        <div class="dka-dialog-body">
          <div class="dka-icon-ring">${ICONS.approve}</div>
          <div class="dka-dialog-title">${esc(opts.title)}</div>
          <div class="dka-dialog-msg">${esc(opts.message)}</div>

          <div class="dka-user-card">
            <div class="dka-user-avatar" style="background:${u.avatarGrad};">${initials}</div>
            <div style="flex:1;min-width:0;">
              <div class="dka-user-name">${esc(u.name)}</div>
              <div class="dka-user-meta">${esc(u.email)}</div>
              <div class="dka-user-meta">${esc(u.instansi)}</div>
              <div>
                <span class="dka-user-badge">
                  <i class="bi bi-clock-fill"></i> Menunggu Persetujuan
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="dka-dialog-footer">
          <button class="dka-btn dka-btn-cancel dka-dlg-cancel">${esc(opts.cancel)}</button>
          <button class="dka-btn dka-btn-success dka-dlg-ok">
            <i class="bi bi-person-check-fill"></i> ${esc(opts.confirm)}
          </button>
        </div>`;

      bd.appendChild(box);
      trapFocus(box);

      function done(result) {
        rmBackdrop(bd);
        document.removeEventListener('keydown', onKey);
        resolve(result);
      }

      box.querySelector('.dka-dlg-ok').addEventListener('click', () => done(true));
      box.querySelector('.dka-dlg-cancel').addEventListener('click', () => done(false));
      bd.addEventListener('click', e => { if (e.target === bd) done(false); });
      function onKey(e) { if (e.key === 'Escape') done(false); }
      document.addEventListener('keydown', onKey);
    });
  }

  /* ══════════════════════════════════════
     4. DKA.password()
     Popup ubah password dengan validasi
     Returns: Promise<{ confirmed: boolean, password: string }>
  ══════════════════════════════════════ */
  function password(opts) {
    opts = Object.assign({
      title  : 'Ubah Password',
      confirm: 'Simpan Password Baru',
      cancel : 'Batal',
      requireCurrent: true,
    }, opts);

    const PW_LEVELS = [
      { min: 0,  color: '#e2e8f0', label: 'Belum diisi',     pct: '0%'   },
      { min: 1,  color: '#f87171', label: 'Sangat lemah',    pct: '20%'  },
      { min: 4,  color: '#fb923c', label: 'Lemah',           pct: '40%'  },
      { min: 6,  color: '#facc15', label: 'Sedang',          pct: '60%'  },
      { min: 8,  color: '#4ade80', label: 'Kuat',            pct: '80%'  },
      { min: 10, color: '#10b981', label: 'Sangat kuat 💪',  pct: '100%' },
    ];

    return new Promise(resolve => {
      const bd  = mkBackdrop('password');
      const box = h('div', 'dka-pw-dialog');
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');

      box.innerHTML = `
        <div class="dka-dialog-bar"></div>
        <div class="dka-pw-body">
          <div class="dka-icon-ring" style="margin-bottom:.9rem;">${ICONS.password}</div>
          <div class="dka-dialog-title" style="text-align:center;margin-bottom:1.4rem;">${esc(opts.title)}</div>

          ${opts.requireCurrent ? `
          <div class="dka-field-wrap" id="dka-wrap-current">
            <div class="dka-field-label">
              <i class="bi bi-lock-fill" style="color:#94a3b8;font-size:.85rem;"></i>
              Password Saat Ini <span class="req">*</span>
            </div>
            <div class="dka-field-input-wrap">
              <i class="bi bi-lock-fill dka-field-icon"></i>
              <input type="password" class="dka-field-input" id="dka-pw-current"
                placeholder="Masukkan password saat ini"
                style="padding-right:2.4rem;" />
              <button type="button" class="dka-pw-toggle" data-target="dka-pw-current" data-icon="dka-eye0">
                <i class="bi bi-eye-fill" id="dka-eye0"></i>
              </button>
            </div>
            <div class="dka-field-err-msg" id="dka-err-current">Password saat ini wajib diisi.</div>
          </div>` : ''}

          <div class="dka-field-wrap" id="dka-wrap-new">
            <div class="dka-field-label">
              <i class="bi bi-key-fill" style="color:#94a3b8;font-size:.85rem;"></i>
              Password Baru <span class="req">*</span>
            </div>
            <div class="dka-field-input-wrap">
              <i class="bi bi-key-fill dka-field-icon"></i>
              <input type="password" class="dka-field-input" id="dka-pw-new"
                placeholder="Min. 8 karakter"
                style="padding-right:2.4rem;" />
              <button type="button" class="dka-pw-toggle" data-target="dka-pw-new" data-icon="dka-eye1">
                <i class="bi bi-eye-fill" id="dka-eye1"></i>
              </button>
            </div>
            <div class="dka-pw-strength-wrap">
              <div class="dka-pw-strength-bar">
                <div class="dka-pw-strength-fill" id="dka-pw-str-fill"></div>
              </div>
              <span class="dka-pw-strength-lbl" id="dka-pw-str-lbl">Belum diisi</span>
            </div>
            <div class="dka-field-err-msg" id="dka-err-new">Password baru minimal 8 karakter.</div>
          </div>

          <div class="dka-pw-rules" style="margin-bottom:1rem;">
            <div class="dka-pw-rule" id="dka-rule-len">
              <i class="bi bi-check-circle-fill"></i> Minimal 8 karakter
            </div>
            <div class="dka-pw-rule" id="dka-rule-upper">
              <i class="bi bi-check-circle-fill"></i> Huruf kapital (A–Z)
            </div>
            <div class="dka-pw-rule" id="dka-rule-num">
              <i class="bi bi-check-circle-fill"></i> Angka (0–9)
            </div>
            <div class="dka-pw-rule" id="dka-rule-sym">
              <i class="bi bi-check-circle-fill"></i> Simbol (!@#$...)
            </div>
          </div>

          <div class="dka-field-wrap" id="dka-wrap-confirm">
            <div class="dka-field-label">
              <i class="bi bi-lock-fill" style="color:#94a3b8;font-size:.85rem;"></i>
              Konfirmasi Password <span class="req">*</span>
            </div>
            <div class="dka-field-input-wrap">
              <i class="bi bi-lock-fill dka-field-icon"></i>
              <input type="password" class="dka-field-input" id="dka-pw-confirm"
                placeholder="Ulangi password baru"
                style="padding-right:2.4rem;" />
              <button type="button" class="dka-pw-toggle" data-target="dka-pw-confirm" data-icon="dka-eye2">
                <i class="bi bi-eye-fill" id="dka-eye2"></i>
              </button>
            </div>
            <div class="dka-field-err-msg" id="dka-err-confirm">Password tidak cocok.</div>
          </div>
        </div>

        <div class="dka-dialog-footer">
          <button class="dka-btn dka-btn-cancel dka-pw-cancel">${esc(opts.cancel)}</button>
          <button class="dka-btn dka-btn-primary dka-pw-ok" id="dka-pw-save-btn">
            <i class="bi bi-check2-circle"></i> ${esc(opts.confirm)}
          </button>
        </div>`;

      bd.appendChild(box);

      /* ── Toggle password show/hide ── */
      box.querySelectorAll('.dka-pw-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
          const inp  = box.querySelector('#' + btn.dataset.target);
          const icon = box.querySelector('#' + btn.dataset.icon);
          const show = inp.type === 'password';
          inp.type   = show ? 'text' : 'password';
          icon.className = show ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill';
        });
      });

      /* ── Strength meter ── */
      const pwNew = box.querySelector('#dka-pw-new');
      pwNew.addEventListener('input', () => {
        const v = pwNew.value;
        let s = v.length;
        if (/[A-Z]/.test(v)) s++;
        if (/[0-9]/.test(v)) s++;
        if (/[^A-Za-z0-9]/.test(v)) s += 2;
        let lv = PW_LEVELS[0];
        for (const l of PW_LEVELS) if (s >= l.min) lv = l;
        const fill = box.querySelector('#dka-pw-str-fill');
        const lbl  = box.querySelector('#dka-pw-str-lbl');
        fill.style.width      = lv.pct;
        fill.style.background = lv.color;
        lbl.textContent       = lv.label;
        lbl.style.color       = lv.color === '#e2e8f0' ? '#94a3b8' : lv.color;
        toggleRule('dka-rule-len',   v.length >= 8);
        toggleRule('dka-rule-upper', /[A-Z]/.test(v));
        toggleRule('dka-rule-num',   /[0-9]/.test(v));
        toggleRule('dka-rule-sym',   /[^A-Za-z0-9]/.test(v));
      });

      function toggleRule(id, ok) {
        const el = box.querySelector('#' + id);
        if (el) el.classList.toggle('ok', ok);
      }

      /* ── Validate & submit ── */
      function validate() {
        let ok = true;

        if (opts.requireCurrent) {
          const cur = box.querySelector('#dka-pw-current');
          const grp = box.querySelector('#dka-wrap-current');
          if (!cur.value.trim()) {
            grp.classList.add('dka-has-err');
            cur.classList.add('dka-err');
            ok = false;
          } else {
            grp.classList.remove('dka-has-err');
            cur.classList.remove('dka-err');
          }
        }

        const nw  = box.querySelector('#dka-pw-new');
        const grpN = box.querySelector('#dka-wrap-new');
        if (nw.value.length < 8) {
          grpN.classList.add('dka-has-err');
          nw.classList.add('dka-err');
          ok = false;
        } else {
          grpN.classList.remove('dka-has-err');
          nw.classList.remove('dka-err');
        }

        const cn  = box.querySelector('#dka-pw-confirm');
        const grpC = box.querySelector('#dka-wrap-confirm');
        if (cn.value !== nw.value || !cn.value) {
          grpC.classList.add('dka-has-err');
          cn.classList.add('dka-err');
          ok = false;
        } else {
          grpC.classList.remove('dka-has-err');
          cn.classList.remove('dka-err');
        }

        return ok;
      }

      const saveBtn = box.querySelector('#dka-pw-save-btn');
      saveBtn.addEventListener('click', () => {
        if (!validate()) return;
        const pw = box.querySelector('#dka-pw-new').value;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:dka-spin .8s linear infinite;"></span> Menyimpan...';
        setTimeout(() => {
          done({ confirmed: true, password: pw });
        }, 1000);
      });

      box.querySelector('.dka-pw-cancel').addEventListener('click', () => done({ confirmed: false, password: '' }));
      bd.addEventListener('click', e => { if (e.target === bd) done({ confirmed: false, password: '' }); });

      function done(result) {
        rmBackdrop(bd);
        document.removeEventListener('keydown', onKey);
        resolve(result);
      }

      function onKey(e) { if (e.key === 'Escape') done({ confirmed: false, password: '' }); }
      document.addEventListener('keydown', onKey);

      trapFocus(box);
      if (opts.requireCurrent) {
        box.querySelector('#dka-pw-current').focus();
      } else {
        box.querySelector('#dka-pw-new').focus();
      }
    });
  }

  /* ══════════════════════════════════════
     5. DKA.toast()
  ══════════════════════════════════════ */
  function toast(opts) {
    opts = Object.assign({
      type    : 'info',
      title   : '',
      message : '',
      duration: 4000,
      position: 'top-right',
    }, opts);

    const pos      = opts.position;
    const posClass = 'dka-tw-' + pos;

    if (!_tw[pos]) {
      const c = h('div', `dka-toast-wrap ${posClass}`);
      document.body.appendChild(c);
      _tw[pos] = c;
    }

    const t = h('div', `dka-toast dka-toast-${opts.type}`);
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    t.innerHTML = `
      <div class="dka-toast-ico">${ICONS[opts.type] || ICONS.info}</div>
      <div class="dka-toast-body">
        ${opts.title   ? `<div class="dka-toast-title">${esc(opts.title)}</div>`   : ''}
        ${opts.message ? `<div class="dka-toast-msg">${esc(opts.message)}</div>` : ''}
      </div>
      <button class="dka-toast-x" aria-label="Tutup">&#10005;</button>
      <div class="dka-toast-prog" style="animation-duration:${opts.duration}ms"></div>`;

    _tw[pos].appendChild(t);

    let timer;

    function dismiss() {
      clearTimeout(timer);
      t.classList.add('dka-toast-out');
      setTimeout(() => t.parentNode && t.parentNode.removeChild(t), 360);
    }

    timer = setTimeout(dismiss, opts.duration);
    t.querySelector('.dka-toast-x').addEventListener('click', dismiss);

    t.addEventListener('mouseenter', () => {
      clearTimeout(timer);
      const prog = t.querySelector('.dka-toast-prog');
      if (prog) prog.style.animationPlayState = 'paused';
    });
    t.addEventListener('mouseleave', () => {
      const prog = t.querySelector('.dka-toast-prog');
      if (prog) prog.style.animationPlayState = 'running';
      timer = setTimeout(dismiss, Math.max(opts.duration / 4, 1200));
    });

    return { dismiss };
  }

  /* ══════════════════════════════════════
     6. DKA.alert()  — inline
  ══════════════════════════════════════ */
  function alert(opts, targetEl) {
    opts = Object.assign({
      type    : 'info',
      title   : '',
      message : '',
      closable: true,
    }, opts);

    const target = typeof targetEl === 'string'
      ? document.querySelector(targetEl)
      : (targetEl || null);

    const a = h('div', `dka-alert dka-alert-${opts.type}`);
    a.setAttribute('role', 'alert');
    a.innerHTML = `
      <div class="dka-alert-ico">${ICONS[opts.type] || ICONS.info}</div>
      <div class="dka-alert-body">
        ${opts.title   ? `<div class="dka-alert-title">${esc(opts.title)}</div>`   : ''}
        ${opts.message ? `<div class="dka-alert-msg">${opts.message}</div>` : ''}
      </div>
      ${opts.closable ? `<button class="dka-alert-x" aria-label="Tutup">&#10005;</button>` : ''}`;

    if (opts.closable) {
      a.querySelector('.dka-alert-x').addEventListener('click', () => {
        a.classList.add('dka-alert-out');
        setTimeout(() => a.parentNode && a.parentNode.removeChild(a), 290);
      });
    }

    const container = target || document.querySelector('main, .content-area, .card-body, body');
    container.insertAdjacentElement('afterbegin', a);

    return {
      el: a,
      dismiss() {
        a.classList.add('dka-alert-out');
        setTimeout(() => a.parentNode && a.parentNode.removeChild(a), 290);
      },
    };
  }

  /* ══════════════════════════════════════
     7. DKA.loading()
     style: 'ring' | 'dots' | 'wave'
  ══════════════════════════════════════ */
  function loading(opts) {
    opts = Object.assign({
      title  : 'Memproses...',
      message: 'Mohon tunggu sebentar.',
      style  : 'ring',   // 'ring' | 'dots' | 'wave'
    }, opts);

    const bd  = mkBackdrop('info');
    const box = h('div', 'dka-loading-box');

    let spinnerHTML = '';
    if (opts.style === 'dots') {
      spinnerHTML = `<div class="dka-dots">
        <div class="dka-dot"></div>
        <div class="dka-dot"></div>
        <div class="dka-dot"></div>
      </div>`;
    } else if (opts.style === 'wave') {
      spinnerHTML = `<div class="dka-wave">
        <div class="dka-wave-bar"></div>
        <div class="dka-wave-bar"></div>
        <div class="dka-wave-bar"></div>
        <div class="dka-wave-bar"></div>
        <div class="dka-wave-bar"></div>
      </div>`;
    } else {
      spinnerHTML = `<div class="dka-spinner"></div>`;
    }

    box.innerHTML = `
      <div class="dka-loading-bar"></div>
      ${spinnerHTML}
      <div class="dka-loading-title">${esc(opts.title)}</div>
      <div class="dka-loading-msg" id="dka-load-msg">${esc(opts.message)}</div>
      <div class="dka-loading-brand">
        <div class="dka-loading-brand-icon"><i class="bi bi-camera-reels-fill"></i></div>
        <div class="dka-loading-brand-text">DokaKegiatan</div>
      </div>`;

    bd.appendChild(box);

    return {
      close()        { rmBackdrop(bd); },
      update(newMsg) {
        const el = box.querySelector('#dka-load-msg');
        if (el) el.textContent = newMsg;
      },
    };
  }

  /* ══════════════════════════════════════
     8. DKA.notify()
  ══════════════════════════════════════ */
  function notify(opts) {
    opts = Object.assign({
      type    : 'info',
      title   : 'Notifikasi',
      message : '',
      duration: 6000,
    }, opts);

    if (_notify) {
      _notify.classList.add('dka-notify-out');
      const old = _notify;
      setTimeout(() => old.parentNode && old.parentNode.removeChild(old), 480);
      _notify = null;
    }

    const n = h('div', `dka-notify dka-notify-${opts.type}`);
    n.setAttribute('role', 'status');
    n.setAttribute('aria-live', 'polite');
    n.innerHTML = `
      <div class="dka-notify-head">
        <div class="dka-notify-badge">${ICONS[opts.type] || ICONS.info}</div>
        <div class="dka-notify-meta">
          <div class="dka-notify-title">${esc(opts.title)}</div>
          <div class="dka-notify-time">${nowTime()}</div>
        </div>
        <button class="dka-notify-x" aria-label="Tutup">&#10005;</button>
      </div>
      <div class="dka-notify-body">
        <div class="dka-notify-msg">${opts.message}</div>
      </div>
      <div class="dka-notify-prog" style="animation-duration:${opts.duration}ms"></div>`;

    document.body.appendChild(n);
    _notify = n;
    requestAnimationFrame(() => n.classList.add('dka-notify-show'));

    let timer;

    function dismiss() {
      clearTimeout(timer);
      n.classList.remove('dka-notify-show');
      n.classList.add('dka-notify-out');
      setTimeout(() => n.parentNode && n.parentNode.removeChild(n), 480);
      if (_notify === n) _notify = null;
    }

    timer = setTimeout(dismiss, opts.duration);
    n.querySelector('.dka-notify-x').addEventListener('click', dismiss);

    n.addEventListener('mouseenter', () => {
      clearTimeout(timer);
      const prog = n.querySelector('.dka-notify-prog');
      if (prog) prog.style.animationPlayState = 'paused';
    });
    n.addEventListener('mouseleave', () => {
      const prog = n.querySelector('.dka-notify-prog');
      if (prog) prog.style.animationPlayState = 'running';
      timer = setTimeout(dismiss, Math.max(opts.duration / 3, 2000));
    });

    return { dismiss };
  }

  /* ══════════════════════════════════════
     9. DKA.close() — tutup backdrop aktif
  ══════════════════════════════════════ */
  function close() {
    if (_backdrop) rmBackdrop(_backdrop);
  }

  /* ══════════════════════════════════════
     10. DKA.closeAll()
  ══════════════════════════════════════ */
  function closeAll() {
    if (_backdrop) rmBackdrop(_backdrop);

    if (_notify) {
      _notify.classList.add('dka-notify-out');
      const old = _notify;
      setTimeout(() => old.parentNode && old.parentNode.removeChild(old), 480);
      _notify = null;
    }

    Object.values(_tw).forEach(container => {
      container.querySelectorAll('.dka-toast').forEach(t => {
        t.classList.add('dka-toast-out');
        setTimeout(() => t.parentNode && t.parentNode.removeChild(t), 360);
      });
    });
  }

  /* ── Export Global ── */
  global.DKA = {
    dialog,
    deleteConfirm,
    approveUser,
    password,
    toast,
    alert,
    loading,
    notify,
    close,
    closeAll,
  };

})(window);
