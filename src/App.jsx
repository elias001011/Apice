import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './ui/AppShell.jsx'
import { LoginPage } from './views/LoginPage.jsx'
import { HomePage } from './views/HomePage.jsx'
import { PerfilPage } from './views/PerfilPage.jsx'
import { SimplePage } from './views/SimplePage.jsx'
import { CorretorPage } from './views/CorretorPage.jsx'
import { RadarPage } from './views/RadarPage.jsx'
import { CadastroPage } from './views/CadastroPage.jsx'
import { EsqueciSenhaPage } from './views/EsqueciSenhaPage.jsx'
import { HistoricoRedacoesPage } from './views/HistoricoRedacoesPage.jsx'
import { ResultadoRedacaoPage } from './views/ResultadoRedacaoPage.jsx'
import { NotificacoesPage } from './views/NotificacoesPage.jsx'
import { AparenciaPage } from './views/AparenciaPage.jsx'
import { EditarPerfilPage } from './views/EditarPerfilPage.jsx'
import { SobrePage } from './views/SobrePage.jsx'
import { TemaDetalhePage } from './views/TemaDetalhePage.jsx'
import { WelcomePage } from './views/WelcomePage.jsx'
import { useAuth } from './auth/AuthProvider.jsx'

/**
 * Component to protect routes and handle newcomers
 */
function AuthWrapper({ children }) {
  const { user } = useAuth()
  
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If user has no name yet, force them to the welcome screen
  if (!user.user_metadata?.full_name && window.location.pathname !== '/welcome') {
    return <Navigate to="/welcome" replace />
  }

  return children
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? "/home" : "/login"} replace />} />

      <Route path="/login" element={user ? <Navigate to="/home" replace /> : <LoginPage />} />
      <Route path="/cadastro" element={user ? <Navigate to="/home" replace /> : <CadastroPage />} />
      <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
      
      <Route path="/welcome" element={
        <AuthWrapper>
          <WelcomePage />
        </AuthWrapper>
      } />

      <Route element={
        <AuthWrapper>
          <AppShell />
        </AuthWrapper>
      }>
        <Route path="/home" element={<HomePage />} />
        <Route path="/corretor" element={<CorretorPage />} />
        <Route path="/radar" element={<RadarPage />} />
        <Route path="/perfil" element={<PerfilPage />} />
        <Route path="/editar-perfil" element={<EditarPerfilPage />} />
        <Route path="/notificacoes" element={<NotificacoesPage />} />
        <Route path="/sobre" element={<SobrePage />} />
        <Route path="/historico-redacoes" element={<HistoricoRedacoesPage />} />
        <Route path="/resultado-redacao" element={<ResultadoRedacaoPage />} />
        <Route path="/tema-detalhe" element={<TemaDetalhePage />} />
        <Route path="/aparencia" element={<AparenciaPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
