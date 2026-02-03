const fs = require('fs');
const path = require('path');

function patchFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('webpackIgnore:true')) return false;
  if (content.includes('@vite-ignore')) return false;

  const patched = content.replace(
    /import\(\/\*webpackIgnore:true\*\//g,
    'import(/* @vite-ignore */ /*webpackIgnore:true*/'
  );

  if (patched === content) return false;
  fs.writeFileSync(filePath, patched, 'utf8');
  return true;
}

function main() {
  const distDir = path.join(
    __dirname,
    '..',
    'node_modules',
    'onnxruntime-web',
    'dist'
  );

  if (!fs.existsSync(distDir)) {
    console.log('[patch-onnxruntime] dist not found, skipping');
    return;
  }

  const entries = fs.readdirSync(distDir);
  const targets = entries
    .filter((name) => name.endsWith('.mjs'))
    .map((name) => path.join(distDir, name));

  let patchedCount = 0;
  for (const filePath of targets) {
    if (patchFile(filePath)) patchedCount += 1;
  }

  if (patchedCount > 0) {
    console.log(`[patch-onnxruntime] patched ${patchedCount} file(s)`);
  } else {
    console.log('[patch-onnxruntime] no changes needed');
  }
}

main();
