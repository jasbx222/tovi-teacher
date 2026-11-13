import { createTheme } from "@mui/material"

// Mirrors the Tovi Planet tokens in tokens.css and the student app's lib/tokens.dart.
export function themeFor(dir: "rtl" | "ltr") {
  return createTheme({
    direction: dir,
    palette: {
      primary: { main: "#6A4CFF", dark: "#4B32D9", light: "#EEEAFF", contrastText: "#FFFFFF" },
      secondary: { main: "#FF6B57" },
      error: { main: "#D9434F" },
      warning: { main: "#9A6A00" },
      success: { main: "#14A37F" },
      info: { main: "#3D8BFF" },
      background: { default: "#F6F5FB", paper: "#FFFFFF" },
      text: { primary: "#17142B", secondary: "#6E6A85" },
      divider: "#EBE8F4",
    },
    typography: {
      fontFamily: '"IBM Plex Sans Arabic", "Segoe UI", sans-serif',
      button: { textTransform: "none", fontWeight: 650 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiButton: { styleOverrides: { root: { borderRadius: 12, minHeight: 42, boxShadow: "none" }, contained: { boxShadow: "none" } } },
      MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 12, background: "#F0EEF7" }, notchedOutline: { border: 0 } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 14 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 24 } } },
      MuiCssBaseline: { styleOverrides: { body: { backgroundColor: "#F6F5FB" } } },
    },
  })
}
