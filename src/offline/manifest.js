import { DEFAULT_REGION } from '../regions/index.js';

// The file name of a region's web app manifest: the default region's is the plain one. The build
// writes them (vite.config.js) and the page links the one for the region it was opened in
// (Offline.js), so the game installed to a home screen opens where it was installed from.
export const manifestOf = ( id ) => id === DEFAULT_REGION ? 'manifest.webmanifest' : `manifest-${ id }.webmanifest`;
