# Firebase Web Config

Snippet generado al registrar la app web en Firebase (proyecto `supstatus-c1ab5`). Úsalo en el frontend para inicializar el SDK.

```ts
// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyDdk4ZjSGeyzO5pmlasJ672iF1BdhDtaCI',
  authDomain: 'supstatus-c1ab5.firebaseapp.com',
  projectId: 'supstatus-c1ab5',
  storageBucket: 'supstatus-c1ab5.appspot.com',
  messagingSenderId: '858880938649',
  appId: '1:858880938649:web:7340bdd7f957a078ac1e08',
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);
```

> Nota: este `apiKey` identifica tu proyecto, no es un secreto. Protege el acceso real mediante reglas de Firestore/Storage y verificación de tokens en el backend.
