import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { Login, Register } from './pages/AuthPages'
import Dashboard from './pages/Dashboard'
import { FillForm, PublicForm } from './pages/FillPages'
import FormAnalytics from './pages/FormAnalytics'
import FormBuilder from './pages/FormBuilder'
import FormsList from './pages/FormsList'
import { ActivityLogs, MySubmissions, Users } from './pages/Misc'
import Responses from './pages/Responses'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/f/:slug" element={<PublicForm />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/forms" element={<ProtectedRoute><FormsList /></ProtectedRoute>} />
      <Route path="/forms/:id/builder" element={<ProtectedRoute><FormBuilder /></ProtectedRoute>} />
      <Route path="/forms/:id/fill" element={<ProtectedRoute><FillForm /></ProtectedRoute>} />
      <Route path="/forms/:id/responses" element={<ProtectedRoute><Responses /></ProtectedRoute>} />
      <Route path="/forms/:id/analytics" element={<ProtectedRoute><FormAnalytics /></ProtectedRoute>} />
      <Route path="/submissions" element={<ProtectedRoute><MySubmissions /></ProtectedRoute>} />
      <Route path="/activity" element={<ProtectedRoute><ActivityLogs /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute admin><Users /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
