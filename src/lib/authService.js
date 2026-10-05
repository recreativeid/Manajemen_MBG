// Service Autentikasi Admin MBG Magelang
// Sandi bawaan: admin123 (tersimpan di LocalStorage dan dapat diganti oleh admin)

const AUTH_KEYS = {
  SESSION: 'mbg_admin_session',
  PASSWORD: 'mbg_admin_password',
  USERNAME: 'mbg_admin_username',
  EXPIRED_NOTICE: 'mbg_session_expired_notice'
};

const DEFAULT_PASSWORD = 'admin123';
const DEFAULT_USERNAME = 'admin';

// Batas durasi maksimal login: Tepat 1 Jam (60 menit = 3.600.000 ms)
export const MAX_SESSION_DURATION_MS = 60 * 60 * 1000;

// Inisialisasi awal password jika belum ada
export function initAuth() {
  if (!localStorage.getItem(AUTH_KEYS.PASSWORD)) {
    localStorage.setItem(AUTH_KEYS.PASSWORD, DEFAULT_PASSWORD);
  }
  if (!localStorage.getItem(AUTH_KEYS.USERNAME)) {
    localStorage.setItem(AUTH_KEYS.USERNAME, DEFAULT_USERNAME);
  }
}

// Cek apakah admin sedang login dan belum melewati batas maksimal 1 jam
export function checkIsLoggedIn() {
  try {
    const session = localStorage.getItem(AUTH_KEYS.SESSION);
    if (!session) return false;
    const parsed = JSON.parse(session);
    if (!parsed || !parsed.isLoggedIn) return false;

    const now = Date.now();
    const loginTimeMs = parsed.loginTime ? new Date(parsed.loginTime).getTime() : 0;
    const expiresAt = parsed.expiresAt || (loginTimeMs + MAX_SESSION_DURATION_MS);

    // Jika telah lewat dari 1 jam sejak login, otomatis logout
    if (now >= expiresAt || (loginTimeMs > 0 && (now - loginTimeMs) >= MAX_SESSION_DURATION_MS)) {
      logoutAdmin(true);
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

// Ambil sisa waktu sesi aktif dalam detik
export function getSessionRemainingSeconds() {
  try {
    const session = localStorage.getItem(AUTH_KEYS.SESSION);
    if (!session) return 0;
    const parsed = JSON.parse(session);
    if (!parsed || !parsed.isLoggedIn) return 0;

    const now = Date.now();
    const loginTimeMs = parsed.loginTime ? new Date(parsed.loginTime).getTime() : 0;
    const expiresAt = parsed.expiresAt || (loginTimeMs + MAX_SESSION_DURATION_MS);

    return Math.max(0, Math.floor((expiresAt - now) / 1000));
  } catch (e) {
    return 0;
  }
}

// Ambil info session admin (null jika sudah expired)
export function getAdminSession() {
  if (!checkIsLoggedIn()) return null;
  try {
    const session = localStorage.getItem(AUTH_KEYS.SESSION);
    if (!session) return null;
    return JSON.parse(session);
  } catch (e) {
    return null;
  }
}

// Cek dan ambil pesan notifikasi sesi expired (jika ada) lalu bersihkan
export function getAndClearSessionExpiredNotice() {
  try {
    const notice = localStorage.getItem(AUTH_KEYS.EXPIRED_NOTICE);
    if (notice) {
      localStorage.removeItem(AUTH_KEYS.EXPIRED_NOTICE);
    }
    return notice;
  } catch (e) {
    return null;
  }
}

// Login Admin
export function loginAdmin(username, password) {
  initAuth();
  const currentPass = localStorage.getItem(AUTH_KEYS.PASSWORD) || DEFAULT_PASSWORD;
  const currentUsername = localStorage.getItem(AUTH_KEYS.USERNAME) || DEFAULT_USERNAME;

  const trimmedUser = (username || '').trim();
  const trimmedPass = (password || '').trim();

  if (!trimmedUser) {
    return { success: false, error: 'Silakan masukkan username terlebih dahulu.' };
  }

  if (trimmedPass !== currentPass) {
    return { success: false, error: 'Kata sandi yang Anda masukkan salah.' };
  }

  const now = Date.now();
  const expiresAt = now + MAX_SESSION_DURATION_MS;

  const sessionData = {
    isLoggedIn: true,
    username: trimmedUser || currentUsername,
    name: trimmedUser ? (trimmedUser.charAt(0).toUpperCase() + trimmedUser.slice(1)) : 'Pengguna MBG',
    loginTime: new Date(now).toISOString(),
    expiresAt: expiresAt
  };

  localStorage.setItem(AUTH_KEYS.SESSION, JSON.stringify(sessionData));
  // Bersihkan notifikasi expired sebelumnya saat berhasil login baru
  localStorage.removeItem(AUTH_KEYS.EXPIRED_NOTICE);

  return { success: true, session: sessionData };
}

// Logout admin (opsional flag isExpired untuk menampilkan notifikasi di layar login)
export function logoutAdmin(isExpired = false) {
  localStorage.removeItem(AUTH_KEYS.SESSION);
  if (isExpired) {
    localStorage.setItem(
      AUTH_KEYS.EXPIRED_NOTICE,
      'Sesi login Anda telah mencapai batas maksimal 1 jam dan otomatis keluar demi keamanan. Seluruh rekapan data telah otomatis tersimpan aman (auto-update). Silakan login kembali.'
    );
  }
}

// Ganti kata sandi admin
export function changeAdminPassword(currentPasswordInput, newPasswordInput, confirmPasswordInput) {
  initAuth();
  const currentPass = localStorage.getItem(AUTH_KEYS.PASSWORD) || DEFAULT_PASSWORD;

  const trimmedOld = (currentPasswordInput || '').trim();
  const trimmedNew = (newPasswordInput || '').trim();
  const trimmedConfirm = (confirmPasswordInput || '').trim();

  if (!trimmedOld) {
    return { success: false, error: 'Mohon masukkan kata sandi lama Anda.' };
  }

  if (trimmedOld !== currentPass) {
    return { success: false, error: 'Kata sandi lama salah.' };
  }

  if (!trimmedNew || trimmedNew.length < 4) {
    return { success: false, error: 'Kata sandi baru minimal harus 4 karakter.' };
  }

  if (trimmedNew !== trimmedConfirm) {
    return { success: false, error: 'Konfirmasi kata sandi baru tidak cocok.' };
  }

  localStorage.setItem(AUTH_KEYS.PASSWORD, trimmedNew);
  return { success: true, message: 'Kata sandi berhasil diperbarui!' };
}
