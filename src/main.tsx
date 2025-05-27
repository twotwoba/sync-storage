import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuroraBackground } from './components/ui/aurora-background'

createRoot(document.getElementById('sync-storage-chrome-plugin-0228')!).render(
    <StrictMode>
        <AuroraBackground>
            <App />
        </AuroraBackground>
    </StrictMode>
)
