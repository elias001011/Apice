import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './ui/AppShell.jsx'
import { LoginPage } from './views/LoginPage.jsx'
import { HomePage } from './views/HomePage.jsx'
import { PerfilPage } from './views/PerfilPage.jsx'
import { SimplePage } from './views/SimplePage.jsx'
import { CorretorPage } from './views/CorretorPage.jsx'
import { RadarPage } from './views/RadarPage.jsx'
import { ConquistasPage } from './views/ConquistasPage.jsx'
import { CadastroPage } from './views/CadastroPage.jsx'
import { EsqueciSenhaPage } from './views/EsqueciSenhaPage.jsx'
import { HistoricoRedacoesPage } from './views/HistoricoRedacoesPage.jsx'
import { ResultadoRedacaoPage } from './views/ResultadoRedacaoPage.jsx'
import { NotificacoesPage } from './views/NotificacoesPage.jsx'
import { AparenciaPage } from './views/AparenciaPage.jsx'
import { PlanosPage } from './views/PlanosPage.jsx'
import { SimuladoPage } from './views/SimuladoPage.jsx'
import { ProfessorPage } from './views/ProfessorPage.jsx'
import { EditarPerfilPage } from './views/EditarPerfilPage.jsx'
import { SobrePage } from './views/SobrePage.jsx'
import { TemaDetalhePage } from './views/TemaDetalhePage.jsx'
import { RedefinirSenhaPage } from './views/RedefinirSenhaPage.jsx'
import { ConfirmarEmailPage } from './views/ConfirmarEmailPage.jsx'
import { VerificarEmailPage } from './views/VerificarEmailPage.jsx'
import LandingPage from './views/LandingPage/LandingPage.jsx'
import { useAuth } from './auth/useAuth.js'

/**
 * Component to protect routes
 */
function AuthWrapper({ children }) {
  const { user } = useAuth()
  
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default function App() {
  const { user } = useAuth()
  const hash = window.location.hash
  const isRecovery = hash && hash.includes('recovery_token=')
  const isConfirm = hash && hash.includes('confirmation_token=')

  return (
    <Routes>
      <Route path="/" element={
        isRecovery 
          ? <Navigate to={`/redefinir-senha${hash}`} replace /> 
          : isConfirm 
          ? <Navigate to={`/confirmar-email${hash}`} replace />
          : <Navigate to={user ? "/home" : "/login"} replace />
      } />

      <Route path="/login" element={user && !isRecovery && !isConfirm ? <Navigate to="/home" replace /> : <LoginPage />} />
      <Route path="/cadastro" element={user ? <Navigate to="/home" replace /> : <CadastroPage />} />
      <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
      <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
      <Route path="/confirmar-email" element={<ConfirmarEmailPage />} />
      <Route path="/verificar-email" element={<VerificarEmailPage />} />
      
      <Route path="/landing" element={<LandingPage />} />

      <Route element={
        <AuthWrapper>
          <AppShell />
        </AuthWrapper>
      }>
        <Route path="/home" element={<HomePage />} />
        <Route path="/corretor" element={<CorretorPage />} />
        <Route path="/professor" element={<ProfessorPage />} />
        <Route path="/radar" element={<RadarPage />} />
        <Route path="/simulado" element={<SimuladoPage />} />
        <Route path="/conquistas" element={<ConquistasPage />} />
        <Route path="/perfil" element={<PerfilPage />} />
        <Route path="/editar-perfil" element={<EditarPerfilPage />} />
        <Route path="/notificacoes" element={<NotificacoesPage />} />
        <Route path="/sobre" element={<SobrePage />} />
        <Route path="/historico-redacoes" element={<HistoricoRedacoesPage />} />
        <Route path="/resultado-redacao" element={<ResultadoRedacaoPage />} />
        <Route path="/tema-detalhe" element={<TemaDetalhePage />} />
        <Route path="/aparencia" element={<AparenciaPage />} />
        <Route path="/planos" element={<PlanosPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
