import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base ('./') sorgt dafür, dass der Build sowohl auf GitHub Pages
// (Projekt-Unterpfad, z. B. /verzahnungs-prototyp/) als auch lokal via preview läuft.
export default defineConfig({
  base: './',
  plugins: [react()],
})
