import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, InputAdornment, MenuItem, Pagination, Snackbar, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import LinkRoundedIcon from '@mui/icons-material/LinkRounded'
import ListAltRoundedIcon from '@mui/icons-material/ListAltRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import DynamicFormRoundedIcon from '@mui/icons-material/DynamicFormRounded'
import { api, errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { Form, FormListItem, Page } from '../api/types'
import { useLoad } from '../components/useLoad'

export default function FormsList() {
  const nav = useNavigate(); const { user } = useAuth()
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false); const [draft, setDraft] = useState({ title: '', description: '', is_public: false }); const [toast, setToast] = useState(''); const [err, setErr] = useState('')
  const { data, loading, error, reload } = useLoad<Page<FormListItem>>('/forms', { search, is_active: status, page, size: 10 })
  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); setToast(ok); reload() } catch (e) { setErr(errorMessage(e)) } }
  const create = async () => { try { const { data: form } = await api.post<Form>('/forms', draft); nav(`/forms/${form.id}/builder`) } catch (e) { setErr(errorMessage(e)) } }
  return <Stack spacing={3}>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
      <Box sx={{ flex: 1 }}><Typography variant="h4">Your forms</Typography><Typography color="text.secondary" mt={.5}>Design, publish and monitor every form from one place.</Typography></Box>
      <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setOpen(true)}>New form</Button>
    </Stack>
    {(error || err) && <Alert severity="error" onClose={() => setErr('')}>{error || err}</Alert>}
    <Card><CardContent sx={{ p: 1.5 }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}><TextField fullWidth placeholder="Search forms..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }} /><TextField select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} sx={{ minWidth: 150 }}><MenuItem value="">All forms</MenuItem><MenuItem value="true">Enabled</MenuItem><MenuItem value="false">Disabled</MenuItem></TextField></Stack></CardContent></Card>
    <Stack spacing={1.5}>
      {data?.items.map((f) => {
        const mine = user?.role_name === 'admin' || f.owner_id === user?.id
        return <Card key={f.id} sx={{ transition: 'transform .18s, box-shadow .18s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 14px 35px rgba(27,31,55,.09)' } }}>
          <CardContent sx={{ p: 2.2 }}><Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <Avatar sx={{ width: 50, height: 50, bgcolor: '#EEF0FF', color: '#5B5FEF', borderRadius: 2 }}><DynamicFormRoundedIcon /></Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}><Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap><Typography variant="h6" noWrap>{f.title}</Typography><Chip size="small" label={f.is_active ? 'Active' : 'Disabled'} color={f.is_active ? 'success' : 'default'} /><Chip size="small" label={f.is_public ? 'Public' : 'Private'} variant="outlined" /></Stack><Typography variant="body2" color="text.secondary" noWrap>{f.description || 'No description added yet.'}</Typography><Stack direction="row" spacing={2} mt={1}><Typography variant="caption" color="text.secondary"><b>{f.field_count}</b> fields</Typography><Typography variant="caption" color="text.secondary"><b>{f.response_count}</b> responses</Typography>{user?.role_name === 'admin' && <Typography variant="caption" color="text.secondary">Owner: <b>{f.owner_name}</b></Typography>}</Stack></Box>
            <Stack direction="row" alignItems="center" spacing={.5}><Tooltip title="Open form"><span><IconButton disabled={!f.is_active} onClick={() => nav(`/forms/${f.id}/fill`)}><PlayArrowRoundedIcon /></IconButton></span></Tooltip>{f.is_public && <Tooltip title="Copy public link"><IconButton onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/f/${f.slug}`); setToast('Public link copied') }}><LinkRoundedIcon /></IconButton></Tooltip>}{mine && <><Tooltip title="Builder"><IconButton onClick={() => nav(`/forms/${f.id}/builder`)}><EditRoundedIcon /></IconButton></Tooltip><Tooltip title="Responses"><IconButton onClick={() => nav(`/forms/${f.id}/responses`)}><ListAltRoundedIcon /></IconButton></Tooltip><Tooltip title="Analytics"><IconButton onClick={() => nav(`/forms/${f.id}/analytics`)}><AnalyticsRoundedIcon /></IconButton></Tooltip><Tooltip title="Duplicate"><IconButton onClick={() => act(() => api.post(`/forms/${f.id}/duplicate`), 'Form duplicated')}><ContentCopyRoundedIcon /></IconButton></Tooltip><Tooltip title="Delete"><IconButton color="error" onClick={() => window.confirm(`Delete "${f.title}" and all its responses?`) && act(() => api.delete(`/forms/${f.id}`), 'Form deleted')}><DeleteOutlineRoundedIcon /></IconButton></Tooltip></>}</Stack>
            {mine && <FormControlLabel sx={{ ml: { md: 1 } }} control={<Switch checked={f.is_active} onChange={(e) => act(() => api.patch(`/forms/${f.id}/status`, { is_active: e.target.checked }), e.target.checked ? 'Form enabled' : 'Form disabled')} />} label={f.is_active ? 'Live' : 'Off'} />}
          </Stack></CardContent>
        </Card>
      })}
      {!loading && data?.items.length === 0 && <Card><CardContent sx={{ py: 8, textAlign: 'center' }}><DynamicFormRoundedIcon sx={{ fontSize: 52, color: '#C9CCE0' }} /><Typography variant="h6" mt={1}>No forms yet</Typography><Typography color="text.secondary" mb={2}>Create your first dynamic form and start collecting responses.</Typography><Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setOpen(true)}>Create your first form</Button></CardContent></Card>}
    </Stack>
    {data && data.pages > 1 && <Box display="flex" justifyContent="center"><Pagination count={data.pages} page={page} onChange={(_, p) => setPage(p)} /></Box>}
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm"><DialogTitle sx={{ fontWeight: 800 }}>Create a new form</DialogTitle><DialogContent><Stack spacing={2} mt={1}><TextField label="Form title" autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} helperText="Give your form a clear, memorable name." /><TextField label="Description" multiline minRows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /><FormControlLabel control={<Switch checked={draft.is_public} onChange={(e) => setDraft({ ...draft, is_public: e.target.checked })} />} label="Allow anonymous submissions through a public link" /></Stack></DialogContent><DialogActions sx={{ p: 2.5 }}><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="contained" disabled={draft.title.trim().length < 3} onClick={create}>Create & open builder</Button></DialogActions></Dialog>
    <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast('')} message={toast} />
  </Stack>
}
