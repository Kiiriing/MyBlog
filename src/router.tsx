import { lazy, Suspense } from 'react'
import type { Location } from 'react-router-dom'
import { Route, Routes } from 'react-router-dom'
import HomeView from './views/HomeView'

/* 首页保持同步加载；其余视图按路由懒加载，避免首屏下载整站代码 */
const JournalView = lazy(() => import('./views/JournalView'))
const JournalTagView = lazy(() => import('./views/JournalTagView'))
const PostView = lazy(() => import('./views/PostView'))
const WorkIndexView = lazy(() => import('./views/WorkIndexView'))
const WorkView = lazy(() => import('./views/WorkView'))
const LoginView = lazy(() => import('./views/LoginView'))
const NotFoundView = lazy(() => import('./views/NotFoundView'))
const UpdatesView = lazy(() => import('./views/UpdatesView'))

export function AppRoutes({ location }: { location: Location }) {
  return (
    <Suspense fallback={null}>
      <Routes location={location}>
        <Route path="/" element={<HomeView />} />
        <Route path="/journal" element={<JournalView />} />
        <Route path="/journal/tag/:tag" element={<JournalTagView />} />
        <Route path="/journal/:slug" element={<PostView />} />
        <Route path="/updates" element={<UpdatesView />} />
        <Route path="/work" element={<WorkIndexView />} />
        <Route path="/work/:slug" element={<WorkView />} />
        <Route path="/login" element={<LoginView />} />
        <Route path="*" element={<NotFoundView />} />
      </Routes>
    </Suspense>
  )
}

export function routeNameFor(pathname: string) {
  if (pathname === '/') return 'home'
  if (pathname === '/journal') return 'journal'
  if (pathname.startsWith('/journal/tag/')) return 'journal-tag'
  if (pathname.startsWith('/journal/')) return 'post'
  if (pathname === '/updates') return 'updates'
  if (pathname === '/work') return 'work-index'
  if (pathname.startsWith('/work/')) return 'work'
  if (pathname === '/login') return 'login'
  return 'not-found'
}
