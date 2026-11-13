import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import createCache from "@emotion/cache"
import { CacheProvider } from "@emotion/react"
import { CssBaseline, ThemeProvider } from "@mui/material"
import { prefixer } from "stylis"
import rtlPlugin from "stylis-plugin-rtl"
import { BrowserRouter } from "react-router"
import { I18nProvider, useI18n } from "../shared/src/i18n"
import { themeFor } from "../shared/src/theme"
import App from "./App"
import "./index.css"

function Root() {
  const { dir } = useI18n()
  const cache = createCache({ key: dir === "rtl" ? "muirtl" : "muiltr", stylisPlugins: dir === "rtl" ? [prefixer, rtlPlugin] : [prefixer] })
  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={themeFor(dir)}>
        <CssBaseline />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </CacheProvider>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <Root />
    </I18nProvider>
  </StrictMode>,
)
