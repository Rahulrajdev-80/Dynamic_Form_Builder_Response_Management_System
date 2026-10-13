import { useMemo, useState } from 'react'
import {
  Alert, Box, Button, Chip, Dialog, DialogContent, DialogTitle, MenuItem, Pagination, Paper, Snackbar, Stack, Switch, Table,
  TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import { api, errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { ActivityLog, Form, FormResponse, Page, User } from '../api/types'
import FormRenderer from '../components/FormRenderer'
import { useLoad } from '../components/useLoad'
import { show } from './Responses'

const fmt = (s: string) => new Date(s + 'Z').toLocaleString()

export function MySubmissions() {
  const [page, setPage] = useState(1)
  const { data, loading, error, reload } = useLoad<Page<FormResponse>>('/responses/mine', { page, size: 10 })
  const [editing, setEditing] = useState<{ resp: FormResponse; form: Form } | null>(null)
  const [msg, setMsg] = useState('')
  const defaults = useMemo(() => Object.fromEntries((editing?.resp.answers ?? []).map((a) => [a.field_id, a.value])), [editing])

  const edit = async (resp: FormResponse) => {
    try {
      const form = (await api.get<Form>(`/forms/${resp.form_id}`)).data
      if (!form.allow_response_editing) return setMsg('The form owner does not allow editing submitted responses.')
      setEditing({ resp, form })
    } catch (e) { setMsg(errorMessage(e)) }
  }
  return (
    <>
      <Typography variant="h5" fontWeight={700} mb={2}>My submissions</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Paper sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>Form</TableCell><TableCell>Submitted</TableCell><TableCell>Answers</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead>
          <TableBody>
            {data?.items.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>{r.form_title}</TableCell><TableCell>{fmt(r.created_at)}</TableCell>
                <TableCell>{r.answers.map((a) => <div key={a.field_id}><b>{a.label}:</b> {a.field_type === 'file' ? String(a.value).split('__')[1] : show(a.value)}</div>)}</TableCell>
                <TableCell align="right"><Button size="small" onClick={() => edit(r)}>Edit</Button></TableCell>
              </TableRow>
            ))}
            {!loading && data?.items.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 5 }}>You have not submitted any forms yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
      {data && data.pages > 1 && <Box display="flex" justifyContent="center" mt={2}><Pagination count={data.pages} page={page} onChange={(_, p) => setPage(p)} /></Box>}
      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit: {editing?.form.title}</DialogTitle>
        <DialogContent>{editing && <Box pt={1}><FormRenderer fields={editing.form.fields} defaults={defaults} submitLabel="Save changes"
          onSubmit={async (answers) => { await api.put(`/responses/${editing.resp.id}`, { answers }); setEditing(null); setMsg('Response updated'); reload() }} /></Box>}</DialogContent>
      </Dialog>
      <Snackbar open={!!msg} autoHideDuration={3000} onClose={() => setMsg('')} message={msg} />
    </>
  )
}

export function ActivityLogs() {
  const { user } = useAuth()
  const [f, setF] = useState({ action: '', entity_type: '', date_from: '', date_to: '' })
  const [page, setPage] = useState(1)
  const { data, error } = useLoad<Page<ActivityLog>>('/activity-logs', { ...f, page, size: 20 })
  const set = (k: keyof typeof f, v: string) => { setF({ ...f, [k]: v }); setPage(1) }
  return (
    <>
      <Typography variant="h5" fontWeight={700} mb={2}>Activity logs {user?.role_name !== 'admin' && <Chip size="small" label="your actions" sx={{ ml: 1 }} />}</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
        <TextField size="small" label="Action starts with" placeholder="form." value={f.action} onChange={(e) => set('action', e.target.value)} />
        <TextField size="small" select label="Entity" value={f.entity_type} onChange={(e) => set('entity_type', e.target.value)} sx={{ minWidth: 130 }}>
          <MenuItem value="">All</MenuItem>{['form', 'field', 'response', 'user'].map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
        </TextField>
        <TextField size="small" type="date" label="From" value={f.date_from} onChange={(e) => set('date_from', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" type="date" label="To" value={f.date_to} onChange={(e) => set('date_to', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      </Stack>
      <Paper sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>When</TableCell><TableCell>User</TableCell><TableCell>Action</TableCell><TableCell>Entity</TableCell><TableCell>Details</TableCell><TableCell>IP</TableCell></TableRow></TableHead>
          <TableBody>
            {data?.items.map((l) => (
              <TableRow key={l.id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(l.created_at)}</TableCell><TableCell>{l.user_name ?? 'Anonymous'}</TableCell>
                <TableCell><Chip size="small" label={l.action} /></TableCell><TableCell>{l.entity_type} #{l.entity_id}</TableCell>
                <TableCell sx={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.details ? JSON.stringify(l.details) : ''}</TableCell><TableCell>{l.ip_address}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      {data && data.pages > 1 && <Box display="flex" justifyContent="center" mt={2}><Pagination count={data.pages} page={page} onChange={(_, p) => setPage(p)} /></Box>}
    </>
  )
}

export function Users() {
  const { user: me } = useAuth()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [err, setErr] = useState('')
  const { data, error, reload } = useLoad<Page<User>>('/users', { search, page, size: 15 })
  const act = async (fn: () => Promise<unknown>) => { try { await fn(); reload() } catch (e) { setErr(errorMessage(e)) } }
  return (
    <>
      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>Users</Typography>
        <TextField size="small" label="Search name / email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </Stack>
      {(error || err) && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{error || err}</Alert>}
      <Paper sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead><TableRow><TableCell>Name</TableCell><TableCell>Email</TableCell><TableCell>Role</TableCell><TableCell>Active</TableCell><TableCell>Joined</TableCell></TableRow></TableHead>
          <TableBody>
            {data?.items.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell>{u.full_name}</TableCell><TableCell>{u.email}</TableCell>
                <TableCell>
                  <TextField select size="small" value={u.role_name} disabled={u.id === me?.id} onChange={(e) => act(() => api.patch(`/users/${u.id}/role`, { role: e.target.value }))}>
                    <MenuItem value="user">user</MenuItem><MenuItem value="admin">admin</MenuItem>
                  </TextField>
                </TableCell>
                <TableCell><Switch checked={u.is_active} disabled={u.id === me?.id} onChange={(e) => act(() => api.patch(`/users/${u.id}`, { is_active: e.target.checked }))} /></TableCell>
                <TableCell>{fmt(u.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      {data && data.pages > 1 && <Box display="flex" justifyContent="center" mt={2}><Pagination count={data.pages} page={page} onChange={(_, p) => setPage(p)} /></Box>}
    </>
  )
}
