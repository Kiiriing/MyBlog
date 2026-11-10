import type { Location } from 'react-router-dom'
import { Route, Routes } from 'react-router-dom'
import HomeView from './views/HomeView'
import JournalView from './views/JournalView'
import PostView from './views/PostView'
import WorkIndexView from './views/WorkIndexView'
import WorkView from './views/WorkView'
import LoginView from './views/LoginView'
import NotFoundView from './views/NotFoundView'

export function AppRoutes({ location }: { location: Location }) {
  return (
    <Routes location={location}>
      <Route path="/" element={<HomeView />} />
      <Route path="/journal" element={<JournalView />} />
      <Route path="/journal/:slug" element={<PostView />} />
      <Route path="/work" element={<WorkIndexView />} />
      <Route path="/work/:slug" element={<WorkView />} />
      <Route path="/login" element={<LoginView />} />
      <Route path="*" element={<NotFoundView />} />
    </Routes>
  )
}

export function routeNameFor(pathname: string) {
  if (pathname === '/') return 'home'
  if (pathname === '/journal') return 'journal'
  if (pathname.startsWith('/journal/')) return 'post'
  if (pathname === '/work') return 'work-index'
  if (pathname.startsWith('/work/')) return 'work'
  if (pathname === '/login') return 'login'
  return 'not-found'
}
