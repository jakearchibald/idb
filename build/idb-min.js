var idb=function(e){"use strict";const t=(e,t)=>t.some(t=>e instanceof t);let n,r;const o=new WeakMap,s=new WeakMap,i=new WeakMap,a=new WeakMap;let c={get(e,t){if(e instanceof IDBTransaction){if("done"===t)return s.get(e);if("store"===t)return e.objectStoreNames[1]?void 0:e.objectStore(e.objectStoreNames[0])}return l(e[t])},has:(e,t)=>e instanceof IDBTransaction&&("done"===t||"store"===t)||t in e};function u(e){c=e(c)}function d(e){return(r||(r=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey]),r).includes(e)?function(...t){const n=p(this);return e.apply(n,t),l(o.get(this))}:function(...t){const n=p(this);return l(e.apply(n,t))}}function f(e){return"function"==typeof e?d(e):(e instanceof IDBTransaction&&function(e){if(s.has(e))return;const t=new Promise((t,n)=>{const r=()=>{e.removeEventListener("complete",o),e.removeEventListener("error",s),e.removeEventListener("abort",s)},o=()=>{t(),r()},s=()=>{n(e.error),r()};e.addEventListener("complete",o),e.addEventListener("error",s),e.addEventListener("abort",s)});s.set(e,t)}(e),t(e,(n||(n=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction]),n))?new Proxy(e,c):e)}function l(e){if(e instanceof IDBRequest)return function(e){const t=new Promise((t,n)=>{const r=()=>{e.removeEventListener("success",o),e.removeEventListener("error",s)},o=()=>{t(l(e.result)),r()},s=()=>{n(e.error),r()};e.addEventListener("success",o),e.addEventListener("error",s)});return t.then(t=>{t instanceof IDBCursor&&o.set(t,e)}),a.set(t,e),t}(e);if(i.has(e))return i.get(e);const t=f(e);return t!==e&&(i.set(e,t),a.set(t,e)),t}function p(e){return a.get(e)}function v(e,t){return e instanceof IDBDatabase&&!(t in e)&&"string"==typeof t}const D=["get","getKey","getAll","getAllKeys","count"],I=["put","add","delete","clear"];D.push(...D.map(e=>e+"Index"));const b=new Map;async function*h(){let e=this;for(e instanceof IDBCursor||(e=await e.openCursor()),e=e;e;)e instanceof IDBCursorWithValue?yield[e.key,e.value]:yield e.key,e=await e.continue()}function B(e,n){return n===Symbol.asyncIterator&&t(e,[IDBCursor,IDBObjectStore,IDBIndex])}return u(e=>({get(t,n,r){if(!v(t,n))return e.get(t,n,r);n=n;const o=b.get(n);if(o)return o;const s=function(e){return D.includes(e)?function(t,...n){let r="",o=e;o.endsWith("Index")&&(r=n.shift(),o=o.slice(0,-5));let s=this.transaction(t).objectStore(t);return r&&(s=s.index(r)),s[o](...n)}:I.includes(e)?function(t,...n){const r=this.transaction(t,"readwrite");return r.objectStore(t)[e](...n),r.done}:void 0}(n);return s?(b.set(n,s),s):e.get(t,n,r)},has:(t,n)=>v(t,n)&&(D.includes(n)||I.includes(n))||e.has(t,n)})),u(e=>({get:(t,n,r)=>B(t,n)?h:e.get(t,n,r),has:(t,n)=>B(t,n)||e.has(t,n)})),e.openDb=function(e,t,n={}){const{blocked:r,upgrade:o,blocking:s}=n,i=indexedDB.open(e,t),a=l(i);return o&&i.addEventListener("upgradeneeded",e=>{o(l(i.result),e.oldVersion,e.newVersion,l(i.transaction))}),r&&i.addEventListener("blocked",()=>r()),s&&a.then(e=>e.addEventListener("versionchange",s)),a},e.deleteDb=function(e,t={}){const{blocked:n}=t,r=indexedDB.deleteDatabase(e);return n&&r.addEventListener("blocked",()=>n()),l(r).then(()=>void 0)},e.unwrap=p,e.wrap=l,e}({});