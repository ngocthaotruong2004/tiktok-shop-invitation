import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const { VITE_SITE_URL: siteUrl } = loadEnv(mode, '.', 'VITE_');

  return {
    publicDir: 'public',
    plugins: siteUrl ? [{
      name: 'absolute-open-graph-image',
      transformIndexHtml(html: string) {
        const imageUrl = new URL('/og-image.svg', siteUrl).toString();
        return html.replace('content="/og-image.svg"', `content="${imageUrl}"`);
      },
    }] : [],
    build: {
      target: 'es2022',
    },
  };
});