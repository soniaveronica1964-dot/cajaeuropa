import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

if (process.env.VERCEL && !process.env.VITE_API_URL) {
	throw new Error('Falta VITE_API_URL en las variables de entorno de Vercel. Configurá la URL pública del backend antes de desplegar.');
}

export default defineConfig({ plugins: [react()], server: { port: 5173, proxy: { '/api': 'http://localhost:3001' } } });
