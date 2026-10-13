import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert, Box, Button, Chip, Dialog, DialogContent, DialogTitle, IconButton, InputAdornment, List, ListItem, ListItemText,
  MenuItem, Pagination, Paper, Snackbar, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import DownloadIcon from '@mui/icons-material/Download'
import EditIcon from '@mui/icons-material/Edit'
import HistoryIcon from '@mui/icons-material/History'
import SearchIcon from '@mui/icons-material/Search'
import { api, downloadFile, errorMessage } from '../api/client'
import type { Form, FormResponse, HistoryItem, Page } from '../api/types'
import FormRenderer from '../components/FormRenderer'
import { useLoad } from '../components/useLoad'

export const show = (v: any): string => (v === undefined || v === null ? '' : Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v))
const fmt = (s: string) => new Date(s + 'Z').toLocaleString()

export default function Responses() {
  const { id } = useParams()
  const nav = useNavigate()
  const [filters, setFilters] = useState({ search: '', anonymous: '', date_from: '', date_to: '', field_id: '', field_value: '' })
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState('')
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState<FormResponse | null>(null)
  const [history, setHistory] = useState<HistoryItem[] | null>(null)
  const form = useLoad<Form>(`/forms/${id}`)
  const list = useLoad<Page<FormResponse>>(`/forms/${id}/responses`, { ...filters, page, size: 15 })

  const set = (k: keyof typeof filters, v: string) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1) }
  const defaults = useMemo(() => Object.fromEntries((editing?.answers ?? []).map((a) => [a.field_id, a.value])), [editing])
  const fields = form.data?.fields ?? []

  const openHistory = async (r: FormResponse) => {
    try { setHistory((await api.get<HistoryItem[]>(`/responses/${r.id}/history`)).data) } catch (e) { setErr(errorMessage(e)) }
  }
  const remove = async (r: FormResponse) => {
    if (!window.confirm(`Delete response #${r.id}?`)) return
    try { await api.delete(`/responses/${r.id}`); setToast('Response deleted'); list.reload() } catch (e) { setErr(errorMessage(e)) }
  }
  const exportAs = (kind: 'excel' | 'pdf') => downloadFile(`/forms/${id}/export/${kind}`, `responses.${kind === 'excel' ? 'xlsx' : 'pdf'}`).catch((e) => setErr(errorMessage(e)))

  return (
    <>
      <Stack direction="row" spacing={1} mb={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <Button onClick={() => nav('/forms')}>&larr; Forms</Button>
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>Responses - {form.data?.title}</Typography>
        <Button variant="outlined" onClick={() => nav(`/forms/${id}/analytics`)}>Analytics</Button>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportAs('excel')}>Excel</Button>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => exportAs('pdf')}>PDF</Button>
      </Stack>
      {(err || list.error) && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err || list.error}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <TextField size="small" label="Search all answers" value={filters.search} onChange={(e) => set('search', e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
          <TextField size="small" select label="Submitter" value={filters.anonymous} onChange={(e) => set('anonymous', e.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="">Everyone</MenuItem><MenuItem value="false">Logged-in users</MenuItem><MenuItem value="true">Anonymous</MenuItem>
          </TextField>
          <TextField size="small" type="date" label="From" value={filters.date_from} onChange={(e) => set('date_from', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" type="date" label="To" value={filters.date_to} onChange={(e) => set('date_to', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" select label="Filter by field" value={filters.field_id} onChange={(e) => set('field_id', e.target.value)} sx={{ minWidth: 170 }}>
            <MenuItem value="">-</MenuItem>{fields.map((f) => <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Field contains" value={filters.field_value} disabled={!filters.field_id} onChange={(e) => set('field_value', e.target.value)} />
          <Button onClick={() => { setFilters({ search: '', anonymous: '', date_from: '', date_to: '', field_id: '', field_value: '' }); setPage(1) }}>Clear</Button>
        </Stack>
      </Paper>

      <Paper sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>#</TableCell><TableCell>Submitted by</TableCell><TableCell>Submitted at</TableCell>
            {fields.map((f) => <TableCell key={f.id}>{f.label}</TableCell>)}<TableCell align="right">Actions</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {list.data?.items.map((r) => {
              const byField = Object.fromEntries(r.answers.map((a) => [a.field_id, a]))
              return (
                <TableRow key={r.id} hover>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.submitted_by ?? <Chip size="small" label="Anonymous" />}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(r.created_at)}</TableCell>
                  {fields.map((f) => <TableCell key={f.id} sx={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {f.field_type === 'file' && byField[f.id] ? (
                      <Button size="small" onClick={() => downloadFile(`/uploads/${byField[f.id].value}`, 'file')}>{String(byField[f.id].value).split('__')[1] ?? 'download'}</Button>
                    ) : show(byField[f.id]?.value)}
                  </TableCell>)}
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Edit"><IconButton onClick={() => setEditing(r)}><EditIcon /></IconButton></Tooltip>
                    <Tooltip title="History"><IconButton onClick={() => openHistory(r)}><HistoryIcon /></IconButton></Tooltip>
                    <Tooltip title="Delete"><IconButton color="error" onClick={() => remove(r)}><DeleteIcon /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              )
            })}
            {!list.loading && list.data?.items.length === 0 && <TableRow><TableCell colSpan={fields.length + 4} align="center" sx={{ py: 5 }}>No responses match.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
      {list.data && <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
        <Typography variant="body2" color="text.secondary">{list.data.total} response(s)</Typography>
        <Pagination count={list.data.pages} page={page} onChange={(_, p) => setPage(p)} />
      </Box>}

      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit response #{editing?.id}</DialogTitle>
        <DialogContent>
          {editing && <Box pt={1}><FormRenderer fields={fields} defaults={defaults} submitLabel="Save changes"
            onSubmit={async (answers) => { await api.put(`/responses/${editing.id}`, { answers }); setEditing(null); setToast('Response updated'); list.reload() }} /></Box>}
        </DialogContent>
      </Dialog>

      <Dialog open={!!history} onClose={() => setHistory(null)} fullWidth maxWidth="sm">
        <DialogTitle>Response history</DialogTitle>
        <DialogContent>
          <List>
            {history?.map((h) => (
              <ListItem key={h.id} alignItems="flex-start" divider>
                <ListItemText
                  primary={<><Chip size="small" label={h.action} color={h.action === 'created' ? 'success' : 'info'} sx={{ mr: 1 }} />{h.changed_by_name ?? 'Anonymous'} - {fmt(h.created_at)}</>}
                  secondary={h.changes.length === 0 ? (h.action === 'created' ? 'Initial submission' : 'No field changes') :
                    h.changes.map((c) => <Typography key={c.field_id} variant="body2" component="div">{c.label}: <s>{show(c.old) || '(empty)'}</s> &rarr; <b>{show(c.new) || '(empty)'}</b></Typography>)} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
      <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast('')} message={toast} />
    </>
  )
}
