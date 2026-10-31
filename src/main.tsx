import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/main.css'

const container = document.getElementById('app')
if (!container) throw new Error('Root element #app is missing')

createRoot(container).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
