import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert, Button, Card, CardContent, Chip, CircularProgress, Stack, Typography,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, Tooltip, Filler } from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import type { FieldStat, FormAnalytics as Data } from '../api/types'
import { useLoad } from '../components/useLoad'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler)
const COLORS = ['#1976d2', '#9c27b0', '#2e7d32', '#ed6c02', '#d32f2f', '#0288d1', '#7b1fa2', '#558b2f']

function FieldCard({ s }: { s: FieldStat }) {
  const dist = s.distribution ? Object.entries(s.distribution) : null
  return (
    <Card sx={{ height: '100%' }}><CardContent>
      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
        <Typography fontWeight={700} sx={{ flexGrow: 1 }}>{s.label}</Typography><Chip size="small" label={s.field_type} />
      </Stack>
      <Typography variant="caption" color="text.secondary">{s.answered} answered - {s.skipped} skipped</Typography>
      {dist && s.field_type === 'rating' && <>
        <Typography variant="h5" my={1}>{s.average ?? '-'} <Typography component="span" variant="body2">avg rating</Typography></Typography>
        <Bar data={{ labels: dist.map(([k]) => `${k} star`), datasets: [{ data: dist.map(([, v]) => v), backgroundColor: '#ffb300' }] }}
          options={{ plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} />
      </>}
      {dist && s.field_type !== 'rating' && (s.answered > 0
        ? <Doughnut data={{ labels: dist.map(([k]) => k), datasets: [{ data: dist.map(([, v]) => v), backgroundColor: COLORS }] }} options={{ plugins: { legend: { position: 'bottom' } } }} />
        : <Typography color="text.secondary" mt={2}>No answers yet.</Typography>)}
      {s.field_type === 'number' && (s.average !== null
        ? <Stack direction="row" spacing={3} mt={2}><div><Typography variant="caption">Min</Typography><Typography variant="h6">{s.minimum}</Typography></div>
          <div><Typography variant="caption">Average</Typography><Typography variant="h6">{s.average}</Typography></div>
          <div><Typography variant="caption">Max</Typography><Typography variant="h6">{s.maximum}</Typography></div></Stack>
        : <Typography color="text.secondary" mt={2}>No answers yet.</Typography>)}
      {s.samples && <Stack mt={1} spacing={0.5}>{s.samples.length ? s.samples.map((v, i) => <Typography key={i} variant="body2" noWrap>&bull; {String(v)}</Typography>) : <Typography color="text.secondary">No answers yet.</Typography>}</Stack>}
    </CardContent></Card>
  )
}

export default function FormAnalytics() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, loading, error } = useLoad<Data>(`/analytics/forms/${id}`)
  if (loading) return <CircularProgress />
  if (error || !data) return <Alert severity="error">{error}</Alert>
  return (
    <>
      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <Button onClick={() => nav('/forms')}>&larr; Forms</Button>
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>Analytics - {data.title}</Typography>
        <Button variant="outlined" onClick={() => nav(`/forms/${id}/responses`)}>View responses</Button>
      </Stack>
      <Grid container spacing={2}>
        {[['Total responses', data.total_responses], ['Logged-in submitters', data.authenticated_responses], ['Anonymous', data.anonymous_responses],
          ['Last response', data.last_response_at ? new Date(data.last_response_at + 'Z').toLocaleDateString() : '-']].map(([l, v]) => (
          <Grid key={l as string} size={{ xs: 6, md: 3 }}><Card><CardContent><Typography variant="body2" color="text.secondary">{l}</Typography><Typography variant="h5" fontWeight={700}>{v}</Typography></CardContent></Card></Grid>
        ))}
        <Grid size={12}><Card><CardContent>
          <Typography fontWeight={700} mb={1}>Responses over time</Typography>
          <Line data={{ labels: data.responses_per_day.map((d) => d.date.slice(5)), datasets: [{ data: data.responses_per_day.map((d) => d.count), borderColor: '#1976d2', backgroundColor: 'rgba(25,118,210,.15)', fill: true, tension: 0.3 }] }}
            options={{ plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }} />
        </CardContent></Card></Grid>
        {data.fields.filter((f) => f.field_type !== 'file').map((s) => <Grid key={s.field_id} size={{ xs: 12, md: 6, lg: 4 }}><FieldCard s={s} /></Grid>)}
      </Grid>
    </>
  )
}
