import { createTheme } from "@mui/material"

export function themeFor(dir: "rtl" | "ltr") {
  return createTheme({
    direction: dir,
    palette: {
      primary: { main: "#1B1916", contrastText: "#F7F3EC" },
      secondary: { main: "#1F6B4A" },
      error: { main: "#A33B32" },
      warning: { main: "#C8882A" },
      success: { main: "#1F6B4A" },
      background: { default: "#F3EFE7", paper: "#FFFDF9" },
      text: { primary: "#1B1916", secondary: "#6E675E" },
      divider: "#E4DDD2",
    },
    typography: { fontFamily: '"IBM Plex Sans Arabic", "Segoe UI", sans-serif', button: { textTransform: "none", fontWeight: 650 } },
    shape: { borderRadius: 14 },
    components: {
      MuiButton: { styleOverrides: { root: { borderRadius: 12, minHeight: 40, boxShadow: "none" }, contained: { boxShadow: "none" } } },
      MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 14, background: "#fff" } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 14 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 22 } } },
    },
  })
}
