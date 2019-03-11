// Since this library proxies IDB, I haven't retested all of IDB. I've tried to cover parts of the
// library that behave differently to IDB, or may cause accidental differences.

import 'mocha/mocha';
import { deleteDatabase } from './utils';
mocha.setup('tdd');

deleteDatabase().then(() => mocha.run());
