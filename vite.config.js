import { defineConfig } from 'vite';
import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

// پس از Build، لیست فایل‌های خروجی را در public/sw.js (کپی داخل dist) درج می‌کند
// تا برنامه بعد از اولین بار کاملاً آفلاین کار کند. هیچ پکیج اضافه‌ای لازم نیست.
function precachePlugin() {
  let outDir = 'dist';
  let failed = false;
  return {
    name: 'studia-precache',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    buildEnd(error) {
      failed = Boolean(error);
    },
    closeBundle() {
      // اگر Build خطا داشته باشد، این پلاگین ساکت می‌ماند تا خطای اصلی گم نشود
      if (failed || !existsSync(join(outDir, 'sw.js'))) return;
      const files = [];
      const walk = (dir) => {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name);
          if (statSync(full).isDirectory()) walk(full);
          else files.push(relative(outDir, full).split(sep).join('/'));
        }
      };
      walk(outDir);
      const skip = new Set(['sw.js', '_headers', '_redirects']);
      const list = files.filter((f) => !skip.has(f) && !f.endsWith('.map') && !f.endsWith('.svg') || f === 'favicon.svg');
      const swPath = join(outDir, 'sw.js');
      let sw = readFileSync(swPath, 'utf8');
      const version = Date.now().toString(36);
      sw = sw.replace('/*__PRECACHE__*/ []', JSON.stringify(list)).replace('__BUILD_VERSION__', version);
      writeFileSync(swPath, sw);
      console.log(`[studia] service worker: ${list.length} فایل پیش‌کش شد (نسخه ${version})`);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [precachePlugin()],
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
    assetsInlineLimit: 4096,
  },
  server: { host: true },
});
