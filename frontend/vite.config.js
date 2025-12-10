import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'   //  "react-swc" cd frontend

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',   // pour Electron (chemins relatifs)
})
