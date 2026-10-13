import React, { ReactNode, useMemo } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Avatar, Box, Button, Chip, Divider, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  Stack, Tooltip, Typography,
} from '@mui/material'
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import DynamicFormRoundedIcon from '@mui/icons-material/DynamicFormRounded'
import AssignmentTurnedInRoundedIcon from '@mui/icons-material/AssignmentTurnedInRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import { useAuth } from '../auth/AuthContext'

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const links = useMemo(() => [
    { to: '/', label: 'Overview', icon: <DashboardRoundedIcon /> },
    { to: '/forms', label: 'My Forms', icon: <DynamicFormRoundedIcon /> },
    { to: '/submissions', label: 'My Submissions', icon: <AssignmentTurnedInRoundedIcon /> },
    { to: '/activity', label: 'Activity', icon: <HistoryRoundedIcon /> },
    ...(user?.role_name === 'admin' ? [{ to: '/users', label: 'Users', icon: <PeopleAltRoundedIcon /> }] : []),
  ], [user?.role_name])

  const initials = (user?.full_name || 'U').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()
  const isActive = (to: string) => to === '/' ? pathname === '/' : pathname.startsWith(to)

  const Sidebar = () => (
    <Box sx={{ width: 260, flexShrink: 0, height: '100vh', position: 'fixed', left: 0, top: 0, zIndex: 1200,
      bgcolor: '#171A2B', color: 'white', display: 'flex', flexDirection: 'column', p: 2,
      transform: { xs: mobileOpen ? 'translateX(0)' : 'translateX(-100%)', md: 'translateX(0)' },
      transition: 'transform .25s ease' }}>
      <Stack direction="row" alignItems="center" spacing={1.2} px={1} py={1.5}>
        <Box sx={{ width: 38, height: 38, borderRadius: 1.5, display: 'grid', placeItems: 'center', bgcolor: '#5B5FEF', boxShadow: '0 10px 25px rgba(91,95,239,.4)' }}>
          <DynamicFormRoundedIcon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1 }}><Typography fontWeight={800} letterSpacing="-.02em">FormFlow</Typography><Typography variant="caption" sx={{ color: '#9EA4BD' }}>Dynamic workspace</Typography></Box>
        <IconButton onClick={() => setMobileOpen(false)} sx={{ color: '#AEB4CA', display: { md: 'none' } }}><CloseRoundedIcon /></IconButton>
      </Stack>
      <Button component={RouterLink} to="/forms" onClick={() => setMobileOpen(false)} startIcon={<AddRoundedIcon />} fullWidth variant="contained" sx={{ my: 2, bgcolor: '#5B5FEF', '&:hover': { bgcolor: '#4E52DB' } }}>Create new form</Button>
      <Typography variant="overline" sx={{ color: '#7F879F', px: 1.5, letterSpacing: '.12em' }}>Workspace</Typography>
      <List sx={{ mt: 1 }}>
        {links.map((l) => <ListItemButton key={l.to} component={RouterLink} to={l.to} onClick={() => setMobileOpen(false)} selected={isActive(l.to)} sx={{ mb: .5, borderRadius: 2, color: isActive(l.to) ? 'white' : '#AEB4CA', '& .MuiListItemIcon-root': { color: 'inherit', minWidth: 38 }, '&.Mui-selected': { bgcolor: 'rgba(91,95,239,.22)' }, '&.Mui-selected:hover': { bgcolor: 'rgba(91,95,239,.28)' }, '&:hover': { bgcolor: 'rgba(255,255,255,.05)' } }}><ListItemIcon>{l.icon}</ListItemIcon><ListItemText primary={l.label} primaryTypographyProps={{ fontSize: 14, fontWeight: isActive(l.to) ? 750 : 600 }} /></ListItemButton>)}
      </List>
      <Box sx={{ flex: 1 }} />
      <Divider sx={{ borderColor: 'rgba(255,255,255,.08)', mb: 1.5 }} />
      <Stack direction="row" spacing={1.2} alignItems="center" sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,.04)' }}>
        <Avatar sx={{ width: 34, height: 34, bgcolor: '#5B5FEF', fontSize: 13, fontWeight: 800 }}>{initials}</Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}><Typography noWrap fontSize={13} fontWeight={700}>{user?.full_name}</Typography><Typography noWrap variant="caption" sx={{ color: '#8D95AE' }}>{user?.email}</Typography></Box>
        <Tooltip title="Sign out"><IconButton size="small" onClick={() => { logout(); nav('/login') }} sx={{ color: '#AEB4CA' }}><LogoutRoundedIcon fontSize="small" /></IconButton></Tooltip>
      </Stack>
    </Box>
  )

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F6F7FB' }}>
      <Sidebar />
      <Box sx={{ ml: { xs: 0, md: '260px' }, minHeight: '100vh' }}>
        <Box component="header" sx={{ height: 72, px: { xs: 2, md: 4 }, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'rgba(246,247,251,.88)', backdropFilter: 'blur(14px)', position: 'sticky', top: 0, zIndex: 1000, borderBottom: '1px solid #ECEEF5' }}>
          <IconButton onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' } }}><MenuRoundedIcon /></IconButton>
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Chip size="small" label={user?.role_name === 'admin' ? 'Administrator' : 'Member'} sx={{ bgcolor: user?.role_name === 'admin' ? '#EDEBFF' : '#E8F7F0', color: user?.role_name === 'admin' ? '#5147C8' : '#087A52', border: 'none' }} />
            <Avatar sx={{ width: 34, height: 34, bgcolor: '#E6E8FF', color: '#4E52DB', fontWeight: 800 }}>{initials}</Avatar>
          </Stack>
        </Box>
        <Box component="main" sx={{ p: { xs: 2, md: 4 }, maxWidth: 1500, mx: 'auto' }}>{children}</Box>
      </Box>
      {mobileOpen && <Box onClick={() => setMobileOpen(false)} sx={{ position: 'fixed', inset: 0, zIndex: 1100, bgcolor: 'rgba(10,12,25,.45)', display: { md: 'none' } }} />}
    </Box>
  )
}
