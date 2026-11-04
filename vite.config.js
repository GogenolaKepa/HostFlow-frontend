import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import {validarBuildPublico} from './src/services/configuracionApiPublica.js'

// https://vite.dev/config/
export default defineConfig(({command,mode})=>{
  if(command==='build')validarBuildPublico(loadEnv(mode,process.cwd(),'VITE_'),mode)
  return {plugins:[react()]}
})
