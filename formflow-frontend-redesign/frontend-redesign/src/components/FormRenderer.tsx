import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import {
  Alert, Box, Button, Checkbox, FormControl, FormControlLabel, FormGroup, FormHelperText, FormLabel,
  MenuItem, Radio, RadioGroup, Rating, Stack, TextField, Typography,
} from '@mui/material'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { api, errorMessage } from '../api/client'
import type { Field, Upload } from '../api/types'
import { computeVisibility, isEmpty } from './visibility'

interface Props {
  fields: Field[]
  defaults?: Record<number, any>
  submitLabel?: string
  /** public forms upload to a different endpoint */
  uploadPath?: string
  onSubmit: (answers: { field_id: number; value: any }[]) => Promise<void>
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const key = (id: number) => `f${id}`

function initialValue(f: Field, given: any) {
  if (given !== undefined) return given
  if (f.field_type === 'checkbox') return f.options.length ? [] : false
  if (f.field_type === 'rating') return 0
  return ''
}

export default function FormRenderer({ fields, defaults = {}, submitLabel = 'Submit', uploadPath = '/uploads', onSubmit }: Props) {
  const defaultValues = useMemo(
    () => Object.fromEntries(fields.map((f) => [key(f.id), initialValue(f, defaults[f.id])])),
    [fields, defaults],
  )
  const { control, handleSubmit, setError, setValue, formState: { isSubmitting } } = useForm<Record<string, any>>({
    defaultValues, shouldUnregister: true,
  })
  const [formError, setFormError] = useState('')
  const [uploading, setUploading] = useState<number | null>(null)
  const [fileNames, setFileNames] = useState<Record<number, string>>({})

  const watched = useWatch({ control })
  const values = useMemo(
    () => Object.fromEntries(fields.map((f) => [f.id, watched[key(f.id)] ?? defaultValues[key(f.id)]])),
    [watched, fields, defaultValues],
  )
  const visibility = computeVisibility(fields, values)

  const submit = handleSubmit(async (data) => {
    setFormError('')
    const answers = fields
      .filter((f) => visibility[f.id] && !isEmpty(data[key(f.id)]) && !(f.field_type === 'rating' && !data[key(f.id)]))
      .map((f) => ({ field_id: f.id, value: f.field_type === 'number' ? Number(data[key(f.id)]) : data[key(f.id)] }))
    try {
      await onSubmit(answers)
    } catch (err: any) {
      const fieldErrors = err.response?.data?.detail?.errors as Record<string, string> | undefined
      if (fieldErrors) Object.entries(fieldErrors).forEach(([id, message]) => setError(key(Number(id)), { message }))
      setFormError(fieldErrors ? 'Please fix the highlighted fields.' : errorMessage(err))
    }
  })

  const upload = async (f: Field, file: File) => {
    setUploading(f.id)
    try {
      const body = new FormData()
      body.append('file', file)
      const { data } = await api.post<Upload>(uploadPath, body)
      setValue(key(f.id), data.file_id, { shouldValidate: true })
      setFileNames((n) => ({ ...n, [f.id]: data.original_name }))
    } catch (err) {
      setError(key(f.id), { message: errorMessage(err) })
    } finally {
      setUploading(null)
    }
  }

  const rules = (f: Field) => ({
    validate: (v: any) => {
      if (f.field_type === 'checkbox' && !f.options.length && f.is_required) return v === true || `'${f.label}' is required`
      if (f.field_type === 'rating' && f.is_required) return v > 0 || `'${f.label}' is required`
      if (isEmpty(v)) return !f.is_required || `'${f.label}' is required`
      if (f.field_type === 'email' && !EMAIL.test(v)) return 'Enter a valid email address'
      if (f.field_type === 'number') {
        const n = Number(v)
        if (Number.isNaN(n)) return 'Enter a number'
        if (f.min_value !== null && n < f.min_value) return `Must be >= ${f.min_value}`
        if (f.max_value !== null && n > f.max_value) return `Must be <= ${f.max_value}`
      }
      if (f.field_type === 'text') {
        if (f.min_value !== null && String(v).length < f.min_value) return `At least ${f.min_value} characters`
        if (f.max_value !== null && String(v).length > f.max_value) return `At most ${f.max_value} characters`
      }
      return true
    },
  })

  return (
    <Box component="form" onSubmit={submit} noValidate>
      <Stack spacing={3}>
        {fields.filter((f) => visibility[f.id]).map((f) => (
          <Controller
            key={f.id} name={key(f.id)} control={control} rules={rules(f)}
            render={({ field, fieldState }) => {
              const error = fieldState.error?.message
              const label = f.label + (f.is_required ? ' *' : '')
              switch (f.field_type) {
                case 'dropdown':
                  return (
                    <TextField select label={label} {...field} error={!!error} helperText={error || f.help_text} fullWidth>
                      <MenuItem value=""><em>-- select --</em></MenuItem>
                      {f.options.map((o) => <MenuItem key={o.id} value={o.value}>{o.label}</MenuItem>)}
                    </TextField>
                  )
                case 'radio':
                  return (
                    <FormControl error={!!error}>
                      <FormLabel>{label}</FormLabel>
                      <RadioGroup {...field}>
                        {f.options.map((o) => <FormControlLabel key={o.id} value={o.value} control={<Radio />} label={o.label} />)}
                      </RadioGroup>
                      <FormHelperText>{error || f.help_text}</FormHelperText>
                    </FormControl>
                  )
                case 'checkbox':
                  if (!f.options.length)
                    return (
                      <FormControl error={!!error}>
                        <FormControlLabel control={<Checkbox checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />} label={label} />
                        <FormHelperText>{error || f.help_text}</FormHelperText>
                      </FormControl>
                    )
                  return (
                    <FormControl error={!!error}>
                      <FormLabel>{label}</FormLabel>
                      <FormGroup>
                        {f.options.map((o) => (
                          <FormControlLabel
                            key={o.id} label={o.label}
                            control={
                              <Checkbox
                                checked={(field.value as string[]).includes(o.value)}
                                onChange={(e) => field.onChange(e.target.checked ? [...field.value, o.value] : field.value.filter((v: string) => v !== o.value))}
                              />
                            }
                          />
                        ))}
                      </FormGroup>
                      <FormHelperText>{error || f.help_text}</FormHelperText>
                    </FormControl>
                  )
                case 'rating':
                  return (
                    <FormControl error={!!error}>
                      <FormLabel>{label}</FormLabel>
                      <Rating value={Number(field.value) || 0} max={f.max_value || 5} onChange={(_, v) => field.onChange(v ?? 0)} size="large" />
                      <FormHelperText>{error || f.help_text}</FormHelperText>
                    </FormControl>
                  )
                case 'file':
                  return (
                    <FormControl error={!!error}>
                      <FormLabel>{label}</FormLabel>
                      <Stack direction="row" spacing={2} alignItems="center" mt={1}>
                        <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} disabled={uploading === f.id}>
                          {uploading === f.id ? 'Uploading...' : field.value ? 'Replace file' : 'Choose file'}
                          <input hidden type="file" onChange={(e) => e.target.files?.[0] && upload(f, e.target.files[0])} />
                        </Button>
                        <Typography variant="body2">{field.value ? fileNames[f.id] || String(field.value).split('__')[1] || 'file attached' : 'No file chosen'}</Typography>
                      </Stack>
                      <FormHelperText>{error || f.help_text}</FormHelperText>
                    </FormControl>
                  )
                default:
                  return (
                    <TextField
                      label={label} {...field} fullWidth error={!!error} helperText={error || f.help_text}
                      placeholder={f.placeholder ?? undefined}
                      type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : f.field_type === 'email' ? 'email' : 'text'}
                      slotProps={f.field_type === 'date' ? { inputLabel: { shrink: true } } : undefined}
                    />
                  )
              }
            }}
          />
        ))}
        {formError && <Alert severity="error">{formError}</Alert>}
        <Box><Button type="submit" variant="contained" size="large" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : submitLabel}</Button></Box>
      </Stack>
    </Box>
  )
}
