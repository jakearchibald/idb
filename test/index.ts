// Since this library proxies IDB, I haven't retested all of IDB. I've tried to cover parts of the
// library that behave differently to IDB, or may cause accidental differences.

import 'mocha/mocha';
import { deleteDatabase } from './utils';
mocha.setup('tdd');

function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(Error('Script load error'));
    document.body.appendChild(script);
  });
}

(async function() {
  const edgeCompat = navigator.userAgent.includes('Edge/');

  if (!edgeCompat) await loadScript('./open.js');
  await loadScript('./main.js');
  if (!edgeCompat) await loadScript('./iterate.js');
  await deleteDatabase();
  mocha.run();
})();
