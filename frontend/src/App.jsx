// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import AuthPage from './pages/AuthPage'
import Reproductor from './pages/Reproductor'
import ForumList from './pages/ForumList'
import ForumPostDetail from './pages/ForumPostDetail'
import ForumPostForm from './pages/ForumPostForm'
import authService from './services/authService'

function ProtectedRoute({ children }) {
  const isAuthenticated = authService.isAuthenticated();
  return isAuthenticated ? children : <Navigate to="/auth" replace />;
}

function PublicRoute({ children }) {
  const isAuthenticated = authService.isAuthenticated();
  return !isAuthenticated ? children : <Navigate to="/reproductor" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        
        <Route path="/auth" element={
          <PublicRoute><AuthPage /></PublicRoute>
        } />
        
        <Route path="/reproductor" element={
          <ProtectedRoute><Reproductor /></ProtectedRoute>
        } />

        <Route path="/foro" element={
          <ProtectedRoute><ForumList /></ProtectedRoute>
        } />
        <Route path="/foro/nuevo" element={
          <ProtectedRoute><ForumPostForm /></ProtectedRoute>
        } />
        <Route path="/foro/editar/:postId" element={
          <ProtectedRoute><ForumPostForm /></ProtectedRoute>
        } />
        <Route path="/foro/post/:postId" element={
          <ProtectedRoute><ForumPostDetail /></ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;