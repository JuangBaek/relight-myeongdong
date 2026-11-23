import { createRoot } from 'react-dom/client'
import './index.css'
import gsap from 'gsap'
import App from './App'

// keep tweens and the IMPROVE ALL sequence on wall-clock time even if a frame is slow
gsap.ticker.lagSmoothing(0)

createRoot(document.getElementById('root')!).render(<App />)
