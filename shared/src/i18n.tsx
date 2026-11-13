import { createContext, useContext, useEffect, useMemo, useState } from "react"

const copy = {
  ar: {
    brand: "توفي",
    tagline: "أكاديمية تدير المحتوى والأكواد والحصص المباشرة في مكان واحد.",
    login: "دخول",
    phone: "الهاتف",
    password: "كلمة المرور",
    logout: "خروج",
    language: "English",
    save: "حفظ",
    saving: "جار الحفظ…",
    create: "إضافة",
    edit: "تعديل",
    delete: "حذف",
    actions: "إجراءات",
    cancel: "إلغاء",
    confirmDelete: "متأكد تريد حذف هذا السجل؟ لا يمكن التراجع عن العملية.",
    empty: "لا توجد سجلات بعد",
    emptyHint: "ابدأ بإضافة أول سجل ليظهر في الجدول.",
    loading: "جار التحميل",
    error: "تعذر إكمال الطلب",
    remaining: "الرصيد المتبقي",
    search: "بحث في السجلات",
    searchPages: "انتقال سريع…",
    menu: "القائمة",
    close: "إغلاق",
    saved: "تم الحفظ بنجاح",
    deleted: "تم الحذف",
    previous: "السابق",
    next: "التالي",
    phoneHint: "مثال: 07xxxxxxxx",
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    theme: "المظهر",
    light: "فاتح",
    dark: "داكن",
    notifications: "الإشعارات",
    account: "الحساب",
    noResults: "لا توجد نتائج",
  },
  en: {
    brand: "TOVI",
    tagline: "One academy for content, codes, and live classes.",
    login: "Sign in",
    phone: "Phone",
    password: "Password",
    logout: "Sign out",
    language: "العربية",
    save: "Save",
    saving: "Saving…",
    create: "Add",
    edit: "Edit",
    delete: "Delete",
    actions: "Actions",
    cancel: "Cancel",
    confirmDelete: "Delete this record? This cannot be undone.",
    empty: "Nothing here yet",
    emptyHint: "Add the first record and it will appear in the table.",
    loading: "Loading",
    error: "The request could not be completed",
    remaining: "Remaining balance",
    search: "Search records",
    searchPages: "Jump to a page…",
    menu: "Menu",
    close: "Close",
    saved: "Saved successfully",
    deleted: "Deleted",
    previous: "Previous",
    next: "Next",
    phoneHint: "Example: 07xxxxxxxx",
    showPassword: "Show password",
    hidePassword: "Hide password",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    notifications: "Notifications",
    account: "Account",
    noResults: "No results",
  },
} as const

type Lang = keyof typeof copy
type Copy = { [K in keyof (typeof copy)["ar"]]: string }
type I18n = { lang: Lang; dir: "rtl" | "ltr"; t: Copy; toggle: () => void }

const Ctx = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>((localStorage.getItem("tovi-lang") as Lang) || "ar")
  const dir = lang === "ar" ? "rtl" : "ltr"
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
    localStorage.setItem("tovi-lang", lang)
    applyTheme(currentTheme())
  }, [lang, dir])
  const value = useMemo<I18n>(() => ({ lang, dir, t: copy[lang], toggle: () => setLang((v) => (v === "ar" ? "en" : "ar")) }), [lang, dir])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n() {
  const value = useContext(Ctx)
  if (!value) throw new Error("i18n")
  return value
}

export function applyTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme
  localStorage.setItem("tovi-theme", theme)
}

export function currentTheme(): "light" | "dark" {
  const saved = localStorage.getItem("tovi-theme")
  if (saved === "dark" || saved === "light") return saved
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}
