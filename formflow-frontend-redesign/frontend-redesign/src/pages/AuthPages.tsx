import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Card, CardContent, Divider, Link, Stack, TextField, Typography } from '@mui/material'
import DynamicFormRoundedIcon from '@mui/icons-material/DynamicFormRounded'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import { errorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <Box sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.05fr 1fr' }, bgcolor: '#F6F7FB' }}>
    <Box sx={{ display: { xs: 'none', md: 'flex' }, p: 6, color: 'white', background: 'radial-gradient(circle at 15% 20%, rgba(124,128,255,.5), transparent 35%), linear-gradient(145deg,#171A2B,#363A70 60%,#5B5FEF)', flexDirection: 'column', justifyContent: 'space-between' }}>
      <Stack direction="row" spacing={1.2} alignItems="center"><Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: 'rgba(255,255,255,.13)', display: 'grid', placeItems: 'center' }}><DynamicFormRoundedIcon /></Box><Typography fontWeight={800} fontSize={20}>FormFlow</Typography></Stack>
      <Box><Typography variant="h3" sx={{ color: 'white', fontWeight: 850, maxWidth: 620, lineHeight: 1.05 }}>Turn ideas into forms that people actually want to complete.</Typography><Typography sx={{ mt: 2, color: '#DADCEF', maxWidth: 520, fontSize: 16 }}>A polished workspace for building dynamic forms, collecting responses and understanding your data.</Typography><Stack direction="row" spacing={1} mt={3}><Box sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,.1)' }}>Dynamic builder</Box><Box sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: 'rgba(255,255,255,.1)' }}>Live analytics</Box></Stack></Box>
      <Typography variant="caption" sx={{ color: '#9EA4BD' }}>Dynamic Form Builder & Response Management</Typography>
    </Box>
    <Box sx={{ display: 'grid', placeItems: 'center', p: { xs: 2, md: 5 } }}><Card sx={{ width: '100%', maxWidth: 480, borderRadius: 4 }}><CardContent sx={{ p: { xs: 3, md: 4 } }}><Stack alignItems="center" spacing={1} mb={3}><AvatarIcon /><Typography variant="h5">{title}</Typography><Typography color="text.secondary" textAlign="center">{subtitle}</Typography></Stack>{children}</CardContent></Card></Box>
  </Box>
}
function AvatarIcon() { return <Box sx={{ width: 52, height: 52, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: '#EEF0FF', color: '#5B5FEF' }}><AutoAwesomeRoundedIcon /></Box> }

export function Login() {
  const { user, login } = useAuth(); const nav = useNavigate(); const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string; password: string }>()
  if (user) return <Navigate to="/" replace />
  return <Shell title="Welcome back" subtitle="Sign in to your workspace and continue building."><Stack component="form" spacing={2} onSubmit={handleSubmit(async (d) => { try { await login(d.email, d.password); nav('/') } catch (e) { setError(errorMessage(e)) } })}>{error && <Alert severity="error">{error}</Alert>}<TextField label="Email address" type="email" {...register('email', { required: 'Email is required' })} error={!!errors.email} helperText={errors.email?.message} /><TextField label="Password" type="password" {...register('password', { required: 'Password is required' })} error={!!errors.password} helperText={errors.password?.message} /><Button type="submit" variant="contained" size="large" disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : 'Sign in'}</Button><Divider /><Typography variant="body2" textAlign="center">New to FormFlow? <Link component={RouterLink} to="/register" fontWeight={700}>Create an account</Link></Typography></Stack></Shell>
}

export function Register() {
  const { user, register: signUp } = useAuth(); const nav = useNavigate(); const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ full_name: string; email: string; password: string }>()
  if (user) return <Navigate to="/" replace />
  return <Shell title="Create your workspace" subtitle="Set up your account in less than a minute."><Stack component="form" spacing={2} onSubmit={handleSubmit(async (d) => { try { await signUp(d.full_name, d.email, d.password); nav('/') } catch (e) { setError(errorMessage(e)) } })}>{error && <Alert severity="error">{error}</Alert>}<TextField label="Full name" {...register('full_name', { required: 'Name is required', minLength: { value: 2, message: 'Too short' } })} error={!!errors.full_name} helperText={errors.full_name?.message} /><TextField label="Email address" type="email" {...register('email', { required: 'Email is required', pattern: { value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, message: 'Invalid email' } })} error={!!errors.email} helperText={errors.email?.message} /><TextField label="Password" type="password" {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })} error={!!errors.password} helperText={errors.password?.message} /><Button type="submit" variant="contained" size="large" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create account'}</Button><Typography variant="body2" textAlign="center">Already have an account? <Link component={RouterLink} to="/login" fontWeight={700}>Sign in</Link></Typography></Stack></Shell>
}
