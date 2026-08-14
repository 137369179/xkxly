import http from 'node:http';

const routes = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/modules/growth/GrowthMuseumPage.tsx',
  '/src/modules/pet/CatHousePage.tsx',
  '/src/modules/fun/FunPage.tsx',
  '/src/modules/game/GameCenterPage.tsx',
  '/src/modules/wrongbook/WrongBookDashboard.tsx',
  '/src/modules/today/TodayPage.tsx',
  '/src/modules/hanzi/HanziPage.tsx',
  '/src/modules/numbers/NumbersPage.tsx',
  '/src/modules/letters/LettersPage.tsx',
  '/src/modules/words/WordsPage.tsx',
  '/src/modules/poems/PoemsPage.tsx',
  '/src/modules/songs/SongsPage.tsx',
  '/src/modules/parent/ParentPage.tsx',
];

async function checkRoute(path) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: '127.0.0.1',
        port: 5173,
        path,
        timeout: 5000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({ path, statusCode: res.statusCode, length: body.length });
        });
      }
    );
    req.on('error', (err) => {
      resolve({ path, error: err.message });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ path, error: 'TIMEOUT' });
    });
  });
}

async function main() {
  console.log('🚀 Checking local Vite server health...');
  let hasError = false;
  for (const r of routes) {
    const res = await checkRoute(r);
    if (res.statusCode === 200) {
      console.log(` ✅ [${res.statusCode}] ${r} (${(res.length / 1024).toFixed(1)} KB)`);
    } else {
      console.error(` ❌ [${res.statusCode || 'ERR'}] ${r}: ${res.error || 'Non-200 status'}`);
      hasError = true;
    }
  }

  if (hasError) {
    console.error('\n❌ Health check failed!');
    process.exit(1);
  } else {
    console.log('\n🎉 All routes and core modules responded 200 OK without errors!');
  }
}

main();
