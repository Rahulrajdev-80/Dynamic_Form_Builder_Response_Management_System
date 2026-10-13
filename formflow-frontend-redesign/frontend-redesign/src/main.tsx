import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import App from './App'
import { AuthProvider } from './auth/AuthContext'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#5B5FEF', light: '#7C80FF', dark: '#4447C7' },
    secondary: { main: '#10B981' },
    background: { default: '#F6F7FB', paper: '#FFFFFF' },
    text: { primary: '#171A2B', secondary: '#6B7280' },
    success: { main: '#10B981' },
    warning: { main: '#F59E0B' },
    error: { main: '#EF4444' },
    info: { main: '#3B82F6' },
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h4: { fontWeight: 800, letterSpacing: '-0.03em' },
    h5: { fontWeight: 800, letterSpacing: '-0.025em' },
    h6: { fontWeight: 750 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 12, boxShadow: 'none' }, contained: { boxShadow: '0 8px 18px rgba(91,95,239,.18)' } } },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiCard: { styleOverrides: { root: { border: '1px solid #ECEEF5', boxShadow: '0 8px 30px rgba(27,31,55,.05)' } } },
    MuiPaper: { styleOverrides: { root: { borderColor: '#ECEEF5' } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
)
