// UTM-метки и трекинг источника трафика.
// При первом визите сохраняем UTM из URL в sessionStorage —
// чтобы при заполнении формы (даже на другой странице) метки уже были.

export type UtmData = {
  utm_source?:   string;
  utm_medium?:   string;
  utm_campaign?: string;
  utm_content?:  string;
  utm_term?:     string;
  referrer?:     string;
  landing_page?: string;
};

const STORAGE_KEY = "azimer_utm";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

/**
 * Захватить UTM из текущего URL и сохранить в sessionStorage.
 * Вызывается один раз при загрузке любой страницы (через RootLayout).
 */
export function captureUtm(): void {
  if (typeof window === "undefined") return;

  try {
    const params = new URLSearchParams(window.location.search);
    const existing = readUtm();
    const captured: UtmData = { ...existing };

    let hasNew = false;
    for (const key of UTM_KEYS) {
      const v = params.get(key);
      if (v) {
        captured[key] = v;
        hasNew = true;
      }
    }

    // Запоминаем referrer и landing page только при ПЕРВОМ визите
    if (!existing.landing_page) {
      captured.landing_page = window.location.pathname;
      hasNew = true;
    }
    if (!existing.referrer && document.referrer && !document.referrer.includes(window.location.host)) {
      captured.referrer = document.referrer;
      hasNew = true;
    }

    if (hasNew) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(captured));
    }
  } catch {
    // sessionStorage может быть недоступен (приватный режим) — молча игнорируем
  }
}

/**
 * Прочитать сохранённые UTM-метки (для отправки в Supabase).
 */
export function readUtm(): UtmData {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as UtmData : {};
  } catch {
    return {};
  }
}
