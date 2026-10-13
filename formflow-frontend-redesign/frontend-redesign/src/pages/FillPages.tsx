import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, Typography } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { api } from '../api/client'
import type { Form } from '../api/types'
import FormRenderer from '../components/FormRenderer'
import { useLoad } from '../components/useLoad'

function Shell({ form, children }: { form: Form; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h4" fontWeight={700}>{form.title}</Typography>
        {form.description && <Typography color="text.secondary" mb={3}>{form.description}</Typography>}
        {children}
      </CardContent>
    </Card>
  )
}

function Done({ onAgain }: { onAgain: () => void }) {
  return (
    <Box textAlign="center" py={6}>
      <CheckCircleIcon color="success" sx={{ fontSize: 72 }} />
      <Typography variant="h5" mt={1}>Thank you!</Typography>
      <Typography color="text.secondary" mb={3}>Your response has been recorded.</Typography>
      <Button variant="outlined" onClick={onAgain}>Submit another response</Button>
    </Box>
  )
}

/** Logged-in users fill a form: /forms/:id/fill  (rendered inside the app layout) */
export function FillForm() {
  const { id } = useParams()
  const { data, loading, error } = useLoad<Form>(`/forms/${id}`)
  const [done, setDone] = useState(0)
  const nav = useNavigate()
  if (loading) return <CircularProgress />
  if (error || !data) return <Alert severity="error">{error}</Alert>
  return (
    <Container maxWidth="md">
      <Button onClick={() => nav('/forms')} sx={{ mb: 1 }}>&larr; Back to forms</Button>
      <Shell form={data}>
        {!data.is_active ? <Alert severity="warning">This form is currently disabled.</Alert> :
          done ? <Done onAgain={() => setDone(0)} /> :
            <FormRenderer key={done} fields={data.fields} onSubmit={async (answers) => { await api.post(`/forms/${id}/responses`, { answers }); setDone(1) }} />}
      </Shell>
    </Container>
  )
}

/** Anonymous visitors: /f/:slug  (no login required) */
export function PublicForm() {
  const { slug } = useParams()
  const { data, loading, error } = useLoad<Form>(`/public/forms/${slug}`)
  const [done, setDone] = useState(0)
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100', py: 4 }}>
      <Container maxWidth="md">
        {loading ? <Box textAlign="center"><CircularProgress /></Box> :
          error || !data ? <Alert severity="error">{error || 'Form not found'}</Alert> : (
            <Shell form={data}>
              {done ? <Done onAgain={() => setDone(0)} /> :
                <FormRenderer key={done} fields={data.fields} uploadPath={`/public/forms/${slug}/uploads`}
                  onSubmit={async (answers) => { await api.post(`/public/forms/${slug}/responses`, { answers }); setDone(1) }} />}
            </Shell>
          )}
      </Container>
    </Box>
  )
}
