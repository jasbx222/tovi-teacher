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
    create: "إضافة",
    cancel: "إلغاء",
    empty: "لا توجد سجلات بعد",
    loading: "جار التحميل",
    error: "تعذر إكمال الطلب",
    remaining: "الرصيد المتبقي",
    search: "بحث في هذه الصفحة",
    menu: "القائمة",
    close: "إغلاق",
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
    create: "Add",
    cancel: "Cancel",
    empty: "Nothing here yet",
    loading: "Loading",
    error: "The request could not be completed",
    remaining: "Remaining balance",
    search: "Search this page",
    menu: "Menu",
    close: "Close",
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
  }, [lang, dir])
  const value = useMemo<I18n>(() => ({ lang, dir, t: copy[lang], toggle: () => setLang((v) => (v === "ar" ? "en" : "ar")) }), [lang, dir])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n() {
  const value = useContext(Ctx)
  if (!value) throw new Error("i18n")
  return value
}
