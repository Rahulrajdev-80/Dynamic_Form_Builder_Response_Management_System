import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, IconButton, MenuItem, Paper, Snackbar, Stack, Switch, TextField, Typography,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import EditIcon from '@mui/icons-material/Edit'
import AltRouteIcon from '@mui/icons-material/AltRoute'
import { api, errorMessage } from '../api/client'
import type { Field, FieldType, Form, Operator } from '../api/types'

const PALETTE: { type: FieldType; label: string }[] = [
  { type: 'text', label: 'Text' }, { type: 'number', label: 'Number' }, { type: 'email', label: 'Email' },
  { type: 'date', label: 'Date' }, { type: 'dropdown', label: 'Dropdown' }, { type: 'checkbox', label: 'Checkbox' },
  { type: 'radio', label: 'Radio button' }, { type: 'file', label: 'File upload' }, { type: 'rating', label: 'Rating' },
]
const OPERATORS: { value: Operator; label: string }[] = [
  { value: 'equals', label: 'equals' }, { value: 'not_equals', label: 'does not equal' }, { value: 'contains', label: 'contains' },
  { value: 'gt', label: 'is greater than' }, { value: 'lt', label: 'is less than' }, { value: 'not_empty', label: 'is answered' },
]
const isChoice = (t: string) => ['dropdown', 'radio', 'checkbox'].includes(t)

interface Draft {
  label: string; placeholder: string; help_text: string; is_required: boolean
  min_value: string; max_value: string; options: string[]
  cond_field_id: number | ''; cond_operator: Operator; cond_value: string
}

const toDraft = (f: Field): Draft => ({
  label: f.label, placeholder: f.placeholder ?? '', help_text: f.help_text ?? '', is_required: f.is_required,
  min_value: f.min_value?.toString() ?? '', max_value: f.max_value?.toString() ?? '', options: f.options.map((o) => o.label),
  cond_field_id: f.cond_field_id ?? '', cond_operator: f.cond_operator ?? 'equals', cond_value: f.cond_value ?? '',
})

export default function FormBuilder() {
  const { id } = useParams()
  const nav = useNavigate()
  const [form, setForm] = useState<Form | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [editing, setEditing] = useState<Field | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [settings, setSettings] = useState({ title: '', description: '' })

  const load = async () => {
    try {
      const { data } = await api.get<Form>(`/forms/${id}`)
      setForm(data)
      setSettings({ title: data.title, description: data.description ?? '' })
    } catch (e) { setError(errorMessage(e)) }
  }
  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const guard = async (fn: () => Promise<unknown>, ok?: string) => {
    try { await fn(); if (ok) setToast(ok); setError('') } catch (e) { setError(errorMessage(e)) }
  }

  const saveSettings = (patch: Partial<Form>) => guard(async () => {
    const { data } = await api.put<Form>(`/forms/${id}`, patch)
    setForm(data)
  }, 'Saved')

  const reorder = (fields: Field[]) => guard(async () => {
    setForm((f) => (f ? { ...f, fields } : f))
    await api.put(`/forms/${id}/fields/reorder`, { field_ids: fields.map((x) => x.id) })
  })

  const addField = (type: FieldType, index: number) => guard(async () => {
    const label = PALETTE.find((p) => p.type === type)!.label
    const body: any = { label: `${label} field`, field_type: type }
    if (type === 'dropdown' || type === 'radio') body.options = [{ label: 'Option 1' }, { label: 'Option 2' }]
    if (type === 'checkbox') body.options = [{ label: 'Option 1' }, { label: 'Option 2' }]
    if (type === 'rating') body.max_value = 5
    const { data: created } = await api.post<Field>(`/forms/${id}/fields`, body)
    const fields = [...(form?.fields ?? [])]
    fields.splice(index, 0, created)
    await reorder(fields)
    setEditing(created); setDraft(toDraft(created))
  })

  const onDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault(); setDragOver(null)
    const payload = e.dataTransfer.getData('text/plain')
    if (payload.startsWith('new:')) addField(payload.slice(4) as FieldType, index)
    else if (payload.startsWith('move:') && form) {
      const fromId = Number(payload.slice(5))
      const from = form.fields.findIndex((f) => f.id === fromId)
      if (from < 0) return
      const fields = [...form.fields]
      const [moved] = fields.splice(from, 1)
      fields.splice(index > from ? index - 1 : index, 0, moved)
      reorder(fields)
    }
  }

  const removeField = (f: Field) => window.confirm(`Delete "${f.label}" and its collected answers?`) &&
    guard(async () => { await api.delete(`/forms/${id}/fields/${f.id}`); await load() }, 'Field deleted')

  const saveField = () => editing && draft && guard(async () => {
    const body: any = {
      label: draft.label, placeholder: draft.placeholder || null, help_text: draft.help_text || null, is_required: draft.is_required,
      min_value: draft.min_value === '' ? null : Number(draft.min_value), max_value: draft.max_value === '' ? null : Number(draft.max_value),
      cond_field_id: draft.cond_field_id === '' ? null : draft.cond_field_id,
    }
    if (draft.cond_field_id !== '') { body.cond_operator = draft.cond_operator; body.cond_value = draft.cond_value }
    if (isChoice(editing.field_type)) {
      body.options = draft.options.map((o) => o.trim()).filter(Boolean).map((label) => {
        const old = editing.options.find((o) => o.label === label)
        return { label, value: old?.value ?? label }
      })
    }
    await api.put(`/forms/${id}/fields/${editing.id}`, body)
    setEditing(null); await load()
  }, 'Field saved')

  if (!form) return error ? <Alert severity="error">{error}</Alert> : <CircularProgress />
  const publicUrl = `${window.location.origin}/f/${form.slug}`
  const parentName = (fid: number | null) => form.fields.find((f) => f.id === fid)?.label

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
        <Button onClick={() => nav('/forms')}>&larr; Forms</Button>
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>Form builder</Typography>
        <Button variant="outlined" onClick={() => nav(`/forms/${id}/responses`)}>Responses</Button>
        <Button variant="outlined" onClick={() => nav(`/forms/${id}/fill`)}>Preview / fill</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 2, position: { md: 'sticky' }, top: 80 }}>
            <Typography fontWeight={700} mb={1}>Field types</Typography>
            <Typography variant="caption" color="text.secondary">Drag onto the canvas</Typography>
            <Stack spacing={1} mt={1}>
              {PALETTE.map((p) => (
                <Chip key={p.type} label={p.label} draggable icon={<DragIndicatorIcon />} variant="outlined" sx={{ justifyContent: 'flex-start', cursor: 'grab' }}
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', `new:${p.type}`)}
                  onClick={() => addField(p.type, form.fields.length)} />
              ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ mb: 2 }}><CardContent>
            <Stack spacing={2}>
              <TextField label="Form title" value={settings.title} onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                onBlur={() => settings.title.trim().length >= 3 && settings.title !== form.title && saveSettings({ title: settings.title })} />
              <TextField label="Description" multiline minRows={2} value={settings.description} onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                onBlur={() => settings.description !== (form.description ?? '') && saveSettings({ description: settings.description })} />
            </Stack>
          </CardContent></Card>

          <Box onDragOver={(e) => { e.preventDefault(); setDragOver(form.fields.length) }} onDragLeave={() => setDragOver(null)} onDrop={(e) => onDrop(e, form.fields.length)}
            sx={{ minHeight: 160, p: 1, border: '2px dashed', borderColor: dragOver === form.fields.length ? 'primary.main' : 'divider', borderRadius: 2 }}>
            {form.fields.length === 0 && <Typography color="text.secondary" textAlign="center" py={5}>Drag a field type here to start building</Typography>}
            {form.fields.map((f, i) => (
              <Box key={f.id}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(i) }}
                onDrop={(e) => { e.stopPropagation(); onDrop(e, i) }}
                sx={{ borderTop: '3px solid', borderColor: dragOver === i ? 'primary.main' : 'transparent', pt: 0.5 }}>
                <Paper variant="outlined" draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', `move:${f.id}`)}
                  sx={{ p: 1.5, mb: 1, display: 'flex', alignItems: 'center', gap: 1, cursor: 'grab', '&:hover': { bgcolor: 'action.hover' } }}>
                  <DragIndicatorIcon color="disabled" />
                  <Box flexGrow={1}>
                    <Typography fontWeight={600}>{f.label}{f.is_required && <Typography component="span" color="error"> *</Typography>}</Typography>
                    <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={f.field_type} />
                      {f.options.length > 0 && <Chip size="small" variant="outlined" label={`${f.options.length} options`} />}
                      {f.cond_field_id && <Chip size="small" color="warning" icon={<AltRouteIcon />} label={`shown if "${parentName(f.cond_field_id)}" ${f.cond_operator?.replace('_', ' ')} ${f.cond_value ?? ''}`} />}
                    </Stack>
                  </Box>
                  <IconButton onClick={() => { setEditing(f); setDraft(toDraft(f)) }}><EditIcon /></IconButton>
                  <IconButton color="error" onClick={() => removeField(f)}><DeleteIcon /></IconButton>
                </Paper>
              </Box>
            ))}
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Paper sx={{ p: 2 }}>
            <Typography fontWeight={700} mb={1}>Settings</Typography>
            <FormControlLabel control={<Switch checked={form.is_active} onChange={(e) => guard(async () => setForm((await api.patch<Form>(`/forms/${id}/status`, { is_active: e.target.checked })).data), e.target.checked ? 'Form enabled' : 'Form disabled')} />} label="Form enabled" />
            <FormControlLabel control={<Switch checked={form.is_public} onChange={(e) => saveSettings({ is_public: e.target.checked })} />} label="Public link (anonymous)" />
            <FormControlLabel control={<Switch checked={form.allow_response_editing} onChange={(e) => saveSettings({ allow_response_editing: e.target.checked })} />} label="Submitters can edit responses" />
            {form.is_public && (<>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary">Public URL</Typography>
              <TextField size="small" fullWidth value={publicUrl} slotProps={{ input: { readOnly: true } }} onFocus={(e) => e.target.select()} />
              <Button size="small" sx={{ mt: 1 }} onClick={() => { navigator.clipboard.writeText(publicUrl); setToast('Link copied') }}>Copy link</Button>
            </>)}
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit field <Chip size="small" label={editing?.field_type} sx={{ ml: 1 }} /></DialogTitle>
        {editing && draft && (
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <TextField label="Label" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
              {!isChoice(editing.field_type) && !['file', 'rating', 'date'].includes(editing.field_type) &&
                <TextField label="Placeholder" value={draft.placeholder} onChange={(e) => setDraft({ ...draft, placeholder: e.target.value })} />}
              <TextField label="Help text" value={draft.help_text} onChange={(e) => setDraft({ ...draft, help_text: e.target.value })} />
              <FormControlLabel control={<Switch checked={draft.is_required} onChange={(e) => setDraft({ ...draft, is_required: e.target.checked })} />} label="Required" />

              {(editing.field_type === 'text' || editing.field_type === 'number') && (
                <Stack direction="row" spacing={2}>
                  <TextField type="number" label={editing.field_type === 'text' ? 'Min length' : 'Min value'} value={draft.min_value} onChange={(e) => setDraft({ ...draft, min_value: e.target.value })} />
                  <TextField type="number" label={editing.field_type === 'text' ? 'Max length' : 'Max value'} value={draft.max_value} onChange={(e) => setDraft({ ...draft, max_value: e.target.value })} />
                </Stack>
              )}
              {editing.field_type === 'rating' && <TextField type="number" label="Scale (stars)" value={draft.max_value} onChange={(e) => setDraft({ ...draft, max_value: e.target.value })} slotProps={{ htmlInput: { min: 2, max: 10 } }} />}

              {isChoice(editing.field_type) && (
                <Box>
                  <Typography fontWeight={600} mb={1}>Options</Typography>
                  <Stack spacing={1}>
                    {draft.options.map((o, i) => (
                      <Stack direction="row" key={i} spacing={1}>
                        <TextField size="small" fullWidth value={o} onChange={(e) => setDraft({ ...draft, options: draft.options.map((x, j) => (j === i ? e.target.value : x)) })} />
                        <IconButton onClick={() => setDraft({ ...draft, options: draft.options.filter((_, j) => j !== i) })}><DeleteIcon /></IconButton>
                      </Stack>
                    ))}
                    <Button onClick={() => setDraft({ ...draft, options: [...draft.options, `Option ${draft.options.length + 1}`] })}>Add option</Button>
                  </Stack>
                </Box>
              )}

              <Divider />
              <Typography fontWeight={600}>Conditional visibility</Typography>
              <TextField select label="Show this field only when..." value={draft.cond_field_id} onChange={(e) => setDraft({ ...draft, cond_field_id: e.target.value === '' ? '' : Number(e.target.value) })}>
                <MenuItem value="">Always show</MenuItem>
                {form.fields.filter((f) => f.id !== editing.id).map((f) => <MenuItem key={f.id} value={f.id}>{f.label}</MenuItem>)}
              </TextField>
              {draft.cond_field_id !== '' && (
                <Stack direction="row" spacing={2}>
                  <TextField select label="Condition" value={draft.cond_operator} onChange={(e) => setDraft({ ...draft, cond_operator: e.target.value as Operator })} sx={{ minWidth: 190 }}>
                    {OPERATORS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                  </TextField>
                  {draft.cond_operator !== 'not_empty' && <TextField fullWidth label="Value" value={draft.cond_value} onChange={(e) => setDraft({ ...draft, cond_value: e.target.value })} />}
                </Stack>
              )}
            </Stack>
          </DialogContent>
        )}
        <DialogActions><Button onClick={() => setEditing(null)}>Cancel</Button><Button variant="contained" onClick={saveField}>Save field</Button></DialogActions>
      </Dialog>
      <Snackbar open={!!toast} autoHideDuration={2000} onClose={() => setToast('')} message={toast} />
    </>
  )
}
