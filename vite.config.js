import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import {validarBuildPublico} from './src/services/configuracionApiPublica.js'

// https://vite.dev/config/
export default defineConfig(({command,mode})=>{
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    validarBuildPublico(env, mode)
    if (mode === 'cloudflare') {
      return {
        plugins: [react()],
        define: {
          'import.meta.env.VITE_CONSULTA_SUSCRIPCION': JSON.stringify(env.VITE_CONSULTA_SUSCRIPCION ?? '1'),
        },
      }
    }
  }
  return {plugins:[react()]}
})
