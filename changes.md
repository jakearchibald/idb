# Changes in 4.x

TODO: These are just notes, I need to expand on them.

Breaking changes:

* `openDb` and `deleteDb` are now `openDB` and `deleteDB`. More consistent with DOM naming.
* `iterateCursor` is gone, since browsers do the right thing with promises.
* 'Private' properties that link to real IDB objects are gone. Use `unwrap` instead.
* Methods that return promises may also throw. This is unnoticeable with async functions.
* Dropped support for IE.

New stuff:

* Objects now proxy IDB objects, so no properties/methods are missing from the originals.
* Improved TypeScript.
* Async iterators.
* Helper methods for one-off actions.
* `tx.store`.
* Smaller in size.

# Changes in 3.x

The library is now a module. To take advantage of this, importing has changed slightly:

```js
// Old 2.x way:
import idb from 'idb';
idb.open(…);
idb.delete(…);

// 3.x way:
import { openDb, deleteDb } from 'idb';
openDb(…);
deleteDb(…);
```
