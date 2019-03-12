var idb=function(e){"use strict";const t=(e,t)=>t.some(t=>e instanceof t);let n,r;const o=new WeakMap,s=new WeakMap,i=new WeakMap,a=new WeakMap,c=new WeakMap;let u={get(e,t,n){if(e instanceof IDBTransaction){if("done"===t)return s.get(e);if("objectStoreNames"===t)return e.objectStoreNames||i.get(e);if("store"===t)return n.objectStoreNames[1]?void 0:n.objectStore(n.objectStoreNames[0])}return l(e[t])},has:(e,t)=>e instanceof IDBTransaction&&("done"===t||"store"===t)||t in e};function d(e){u=e(u)}function f(e){return e!==IDBDatabase.prototype.transaction||"objectStoreNames"in IDBTransaction.prototype?(r||(r=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey]),r).includes(e)?function(...t){const n=D(this);return e.apply(n,t),l(o.get(this))}:function(...t){const n=D(this);return l(e.apply(n,t))}:function(t,...n){const r=D(this),o=e.call(r,t,...n);return i.set(o,Array.isArray(t)?t.sort():[t]),l(o)}}function p(e){return"function"==typeof e?f(e):(e instanceof IDBTransaction&&function(e){if(s.has(e))return;const t=new Promise((t,n)=>{const r=()=>{e.removeEventListener("complete",o),e.removeEventListener("error",s),e.removeEventListener("abort",s)},o=()=>{t(),r()},s=()=>{n(e.error),r()};e.addEventListener("complete",o),e.addEventListener("error",s),e.addEventListener("abort",s)});s.set(e,t)}(e),t(e,(n||(n=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction]),n))?new Proxy(e,u):e)}function l(e){if(e instanceof IDBRequest)return function(e){const t=new Promise((t,n)=>{const r=()=>{e.removeEventListener("success",o),e.removeEventListener("error",s)},o=()=>{t(l(e.result)),r()},s=()=>{n(e.error),r()};e.addEventListener("success",o),e.addEventListener("error",s)});return t.then(t=>{t instanceof IDBCursor&&o.set(t,e)}),c.set(t,e),t}(e);if(a.has(e))return a.get(e);const t=p(e);return t!==e&&(a.set(e,t),c.set(t,e)),t}function D(e){return c.get(e)}const I=["get","getKey","getAll","getAllKeys","count"],B=["put","add","delete","clear"],v=new Map;function y(e,t){if(!(e instanceof IDBDatabase)||t in e||"string"!=typeof t)return;const n=v.get(t);if(n)return n;const r=t.replace(/FromIndex$/,""),o=t!==r;if(!(r in(o?IDBIndex:IDBObjectStore).prototype))return;let s;return I.includes(r)&&(s=function(e,...t){let n=this.transaction(e).store;return o&&(n=n.index(t.shift())),n[r](...t)}),B.includes(r)&&(s=function(e,...t){const n=this.transaction(e,"readwrite");return n.store[r](...t),n.done}),s&&v.set(t,s),s}d(e=>({get:(t,n,r)=>y(t,n)||e.get(t,n,r),has:(t,n)=>!!y(t,n)||e.has(t,n)}));const b=["continue","continuePrimaryKey","advance"],g={},h=new WeakMap,m=new WeakMap,w={get(e,t){if(!b.includes(t))return e[t];let n=g[t];return n||(n=g[t]=function(...e){h.set(this,m.get(this)[t](...e))}),n}};async function*E(...e){let t=this;if(t instanceof IDBCursor||(t=await t.openCursor(...e)),!t)return;t=t;const n=new Proxy(t,w);for(m.set(n,t);t;)yield n,t=await(h.get(n)||t.continue()),h.delete(n)}function L(e,n){return n===Symbol.asyncIterator&&t(e,[IDBIndex,IDBObjectStore,IDBCursor])||"iterate"===n&&t(e,[IDBIndex,IDBObjectStore])}return d(e=>({get:(t,n,r)=>L(t,n)?E:e.get(t,n,r),has:(t,n)=>L(t,n)||e.has(t,n)})),e.openDB=function(e,t,n={}){const{blocked:r,upgrade:o,blocking:s}=n,i=indexedDB.open(e,t),a=l(i);return o&&i.addEventListener("upgradeneeded",e=>{o(l(i.result),e.oldVersion,e.newVersion,l(i.transaction))}),r&&i.addEventListener("blocked",()=>r()),s&&a.then(e=>e.addEventListener("versionchange",s)),a},e.deleteDB=function(e,t={}){const{blocked:n}=t,r=indexedDB.deleteDatabase(e);return n&&r.addEventListener("blocked",()=>n()),l(r).then(()=>void 0)},e.unwrap=D,e.wrap=l,e}({});