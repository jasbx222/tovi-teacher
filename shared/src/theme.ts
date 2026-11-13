import { createTheme } from "@mui/material"

export function themeFor(dir: "rtl" | "ltr") {
  return createTheme({
    direction: dir,
    palette: {
      primary: { main: "#3D45C6", contrastText: "#F7F9FF" },
      secondary: { main: "#0E8F6B" },
      error: { main: "#C2413B" },
      warning: { main: "#9A6708" },
      success: { main: "#0E8F6B" },
      background: { default: "#F3F5FB", paper: "#FFFFFF" },
      text: { primary: "#171A2B", secondary: "#5E6578" },
      divider: "#E4E7F2",
    },
    typography: {
      fontFamily: '"IBM Plex Sans Arabic", "Segoe UI", sans-serif',
      button: { textTransform: "none", fontWeight: 650 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiButton: { styleOverrides: { root: { borderRadius: 12, minHeight: 42, boxShadow: "none" }, contained: { boxShadow: "none" } } },
      MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 12, background: "#fff" } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 14 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 20 } } },
      MuiCssBaseline: { styleOverrides: { body: { backgroundColor: "#F3F5FB" } } },
    },
  })
}
