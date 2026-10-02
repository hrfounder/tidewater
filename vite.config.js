import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

// `npm run dev:lan` serves to the local network over https: a phone's browser gives a page WebGPU
// only in a secure context, which plain http from another machine is not. TIDEWATER_CERT names a
// folder holding key.pem and cert.pem (self-signed will do: the phone asks once).
const cert = process.env.TIDEWATER_CERT;
const https = cert ? { key: readFileSync( cert + '/key.pem' ), cert: readFileSync( cert + '/cert.pem' ) } : undefined;

export default defineConfig( {
	// relative asset paths: the build runs from any sub-path (GitHub Pages serves it under /tidewater/)
	base: './',
	build: { target: 'esnext', chunkSizeWarningLimit: 4000 },
	server: { port: 5188, strictPort: true, host: '127.0.0.1', https },
} );
