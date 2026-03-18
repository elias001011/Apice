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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<LoginPage />} />

      <Route element={<AppShell />}>
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

      <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
