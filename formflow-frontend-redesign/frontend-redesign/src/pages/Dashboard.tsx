import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, LinearProgress, Stack, Typography } from '@mui/material'
import Grid from '@mui/material/Grid2'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import DynamicFormRoundedIcon from '@mui/icons-material/DynamicFormRounded'
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded'
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip, Filler } from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import type { Dashboard as DashboardData, FormListItem, Page } from '../api/types'
import { useLoad } from '../components/useLoad'
import { useAuth } from '../auth/AuthContext'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler)

const Stat = ({ icon, label, value, hint }: { icon: ReactNode; label: string; value: number | string; hint: string }) => (
  <Card sx={{ height: '100%' }}><CardContent sx={{ p: 2.5 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start"><Avatar sx={{ width: 42, height: 42, bgcolor: '#F0F0FF', color: '#5B5FEF' }}>{icon}</Avatar><TrendingUpRoundedIcon sx={{ color: '#10B981', fontSize: 19 }} /></Stack>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>{label}</Typography>
    <Typography variant="h4" sx={{ mt: .4 }}>{value}</Typography>
    <Typography variant="caption" color="text.secondary">{hint}</Typography>
  </CardContent></Card>
)

export default function Dashboard() {
  const nav = useNavigate(); const { user } = useAuth()
  const { data, loading, error } = useLoad<DashboardData>('/analytics/dashboard')
  const forms = useLoad<Page<FormListItem>>('/forms', { page: 1, size: 5 })
  const chart = useMemo(() => ({ labels: data?.responses_per_day.map((d) => d.date.slice(5)) ?? [], datasets: [{ label: 'Responses', data: data?.responses_per_day.map((d) => d.count) ?? [], borderColor: '#5B5FEF', backgroundColor: 'rgba(91,95,239,.12)', fill: true, tension: .4, pointRadius: 2 }] }), [data])
  if (loading) return <Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>
  if (error || !data) return <Alert severity="error">{error}</Alert>
  const activeRate = data.total_forms ? Math.round((data.active_forms / data.total_forms) * 100) : 0
  return <Stack spacing={3}>
    <Box sx={{ borderRadius: 4, p: { xs: 2.5, md: 4 }, color: 'white', overflow: 'hidden', position: 'relative', background: 'linear-gradient(120deg,#171A2B 0%,#2D3157 52%,#5B5FEF 100%)' }}>
      <Box sx={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', bgcolor: 'rgba(255,255,255,.07)', right: -80, top: -100 }} />
      <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 720 }}>
        <Chip label="WORKSPACE OVERVIEW" size="small" sx={{ mb: 1.5, bgcolor: 'rgba(255,255,255,.12)', color: 'white', border: '1px solid rgba(255,255,255,.15)' }} />
        <Typography variant="h4" sx={{ color: 'white', fontSize: { xs: 28, md: 38 } }}>Welcome back, {user?.full_name?.split(' ')[0] || 'there'}.</Typography>
        <Typography sx={{ color: '#D8DAE8', mt: 1, maxWidth: 620 }}>Build smarter forms, collect better responses, and see what your data is telling you — all from one workspace.</Typography>
        <Stack direction="row" spacing={1.5} mt={3} flexWrap="wrap" useFlexGap><Button variant="contained" onClick={() => nav('/forms')} startIcon={<AddRoundedIcon />} sx={{ bgcolor: 'white', color: '#171A2B', '&:hover': { bgcolor: '#F1F2F8' } }}>Create a form</Button><Button variant="outlined" onClick={() => nav('/forms')} endIcon={<ArrowForwardRoundedIcon />} sx={{ color: 'white', borderColor: 'rgba(255,255,255,.3)' }}>Explore forms</Button></Stack>
      </Box>
    </Box>
    <Grid container spacing={2}>
      <Grid size={{ xs: 6, md: 3 }}><Stat icon={<DynamicFormRoundedIcon />} label="Total forms" value={data.total_forms} hint={`${data.active_forms} currently active`} /></Grid>
      <Grid size={{ xs: 6, md: 3 }}><Stat icon={<CheckCircleRoundedIcon />} label="Active forms" value={data.active_forms} hint={`${activeRate}% of your forms`} /></Grid>
      <Grid size={{ xs: 6, md: 3 }}><Stat icon={<BarChartRoundedIcon />} label="Total responses" value={data.total_responses} hint={`${data.responses_today} received today`} /></Grid>
      <Grid size={{ xs: 6, md: 3 }}><Stat icon={<PeopleAltRoundedIcon />} label="Users" value={data.total_users ?? '—'} hint="Workspace members" /></Grid>
    </Grid>
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, lg: 8 }}><Card><CardContent sx={{ p: 2.5 }}><Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}><Box><Typography variant="h6">Response activity</Typography><Typography variant="body2" color="text.secondary">Submission trend over the recent period</Typography></Box><Chip label={`${data.total_responses} total`} size="small" /></Stack><Box sx={{ height: 290 }}><Line data={chart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#EEF0F5' } } } }} /></Box></CardContent></Card></Grid>
      <Grid size={{ xs: 12, lg: 4 }}><Card sx={{ height: '100%' }}><CardContent sx={{ p: 2.5 }}><Typography variant="h6">Form health</Typography><Typography variant="body2" color="text.secondary" mb={3}>How your workspace is distributed</Typography><Stack spacing={2.5}><Box><Stack direction="row" justifyContent="space-between"><Typography variant="body2">Active</Typography><Typography fontWeight={700}>{data.active_forms}</Typography></Stack><LinearProgress variant="determinate" value={activeRate} sx={{ mt: 1, height: 8, borderRadius: 4 }} /></Box><Box><Stack direction="row" justifyContent="space-between"><Typography variant="body2">Disabled</Typography><Typography fontWeight={700}>{data.disabled_forms}</Typography></Stack><LinearProgress color="warning" variant="determinate" value={data.total_forms ? (data.disabled_forms / data.total_forms) * 100 : 0} sx={{ mt: 1, height: 8, borderRadius: 4 }} /></Box><Divider /><Typography variant="caption" color="text.secondary">Tip: keep important forms active and review response trends regularly.</Typography></Stack></CardContent></Card></Grid>
    </Grid>
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, lg: 7 }}><Card><CardContent sx={{ p: 2.5 }}><Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}><Box><Typography variant="h6">Top forms</Typography><Typography variant="body2" color="text.secondary">Forms generating the most responses</Typography></Box><Button size="small" onClick={() => nav('/forms')} endIcon={<ArrowForwardRoundedIcon />}>View all</Button></Stack>{data.top_forms.length ? <Box sx={{ height: 250 }}><Bar data={{ labels: data.top_forms.map((f) => f.title.slice(0, 22)), datasets: [{ label: 'Responses', data: data.top_forms.map((f) => f.responses), backgroundColor: '#7C80FF', borderRadius: 7, barThickness: 20 }] }} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#EEF0F5' } }, y: { grid: { display: false } } } }} /></Box> : <Typography color="text.secondary">No response data yet.</Typography>}</CardContent></Card></Grid>
      <Grid size={{ xs: 12, lg: 5 }}><Card><CardContent sx={{ p: 2.5 }}><Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}><Box><Typography variant="h6">Recent forms</Typography><Typography variant="body2" color="text.secondary">Your latest form designs</Typography></Box></Stack>{forms.data?.items.map((f) => <Stack key={f.id} direction="row" alignItems="center" spacing={1.5} sx={{ py: 1.4, borderBottom: '1px solid #F0F1F5', cursor: 'pointer' }} onClick={() => nav(`/forms/${f.id}/builder`)}><Avatar sx={{ bgcolor: '#EEF0FF', color: '#5B5FEF', borderRadius: 2 }}><DynamicFormRoundedIcon fontSize="small" /></Avatar><Box sx={{ minWidth: 0, flex: 1 }}><Typography fontWeight={700} noWrap>{f.title}</Typography><Typography variant="caption" color="text.secondary">{f.field_count} fields · {f.response_count} responses</Typography></Box><Chip size="small" label={f.is_active ? 'Active' : 'Off'} color={f.is_active ? 'success' : 'default'} /></Stack>)}{!forms.loading && !forms.data?.items.length && <Typography color="text.secondary" py={3}>No forms yet.</Typography>}</CardContent></Card></Grid>
    </Grid>
  </Stack>
}
