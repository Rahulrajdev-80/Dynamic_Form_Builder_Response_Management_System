import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { CircularProgress, Box } from '@mui/material'
import { useAuth } from '../auth/AuthContext'
import Layout from './Layout'

export default function ProtectedRoute({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth()
  if (loading) return <Box display="grid" height="100vh" sx={{ placeItems: 'center' }}><CircularProgress /></Box>
  if (!user) return <Navigate to="/login" replace />
  if (admin && user.role_name !== 'admin') return <Navigate to="/" replace />
  return <Layout>{children}</Layout>
}
