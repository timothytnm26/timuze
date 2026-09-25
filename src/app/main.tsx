import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/shared/lib/gsap'
import '@/shared/i18n' // initialises i18next before the first render
import '@/shared/theme' // applies the saved skin + loads its fonts
import './styles/index.css'
import { AppProviders } from './providers/AppProviders'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
)
