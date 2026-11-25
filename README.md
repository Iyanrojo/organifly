# Organifly

Organizador personal: tareas, proyectos, calendario, clases, facturas, finanzas, reuniones, sueños y deporte en una sola app limpia, conectada con Google.

## Qué hay

| Ruta | Qué es |
|---|---|
| `index.html` | Landing con la maqueta de registro. Al final del registro lleva a la app. |
| `app/index.html` | **La app**, volcada desde el artefacto de Claude. Un solo archivo (HTML + CSS + JS). |
| `app/adapter.js` | Hace que la app funcione fuera de Claude: datos en Firebase (o en el navegador), Google Calendar por su API, descargas. |
| `app/adapter.css` | Pantalla de acceso, panel de copia de seguridad. |
| `app/assets/` | Tipografía Montserrat para las facturas en PDF. |
| `firebase-config.js` | Configuración de Firebase. Vacía = modo prueba. |
| `firestore.rules` | Reglas: cada persona solo ve lo suyo (`users/{uid}/…`). |

## Modos

- **Modo prueba** (mientras `firebase-config.js` esté vacío): sin login; los datos se guardan solo en ese navegador.
- **Modo real** (con Firebase): entrar con Google es obligatorio; cada persona tiene sus datos en `users/{uid}/…` y Google Calendar se conecta con el mismo inicio de sesión.

## Activar el login con Google (Firebase)

1. Crea un proyecto en [Firebase](https://console.firebase.google.com) (el plan gratuito basta).
2. **Authentication → Sign-in method:** activa **Google**.
3. **Authentication → Settings → Authorized domains:** añade el dominio donde se publica (p. ej. `iyanrojo.github.io` o tu `.com`).
4. **Firestore Database:** créala en modo producción, región europea (p. ej. `europe-southwest1`, Madrid).
5. **Firestore → Reglas:** pega `firestore.rules` y publica.
6. **Configuración del proyecto → Tus apps → App web:** copia el bloque `firebaseConfig` en `firebase-config.js` como `window.ORGANIFLY_FIREBASE = { … }`.
7. **Google Calendar:** en [Google Cloud Console](https://console.cloud.google.com) (mismo proyecto que Firebase) → *APIs y servicios* → activa **Google Calendar API**. En *Pantalla de consentimiento OAuth* añade el permiso `…/auth/calendar.events`. Mientras la app no esté verificada por Google, añade tu Gmail como usuario de prueba.

## Pasar tus datos desde Claude

En la barra lateral de la app → **Copia de seguridad** → *Importar copia…* y elige el `.json` exportado del artefacto. *Descargar copia* hace lo contrario.

## Publicar

- **GitHub Pages:** *Settings → Pages → Deploy from a branch → `main` / root*. Queda en `https://iyanrojo.github.io/organifly/` (la app en `/app/`).
- **Cloudflare Pages:** *Workers & Pages → Create → Pages → Connect to Git → `Iyanrojo/organifly`*, sin comando de build, carpeta `/`. Después, *Custom domains* para el `.com`.

## Pendiente

- **IA** (actas de reunión, ejercicios, etiquetas de sueños): en Claude usa `sample`; fuera de Claude hace falta una función de servidor (p. ej. Cloudflare Worker con la API de Claude). Mientras tanto la app usa sus alternativas sin IA.
- **Generalizar para cualquier persona:** algunos módulos aún están pensados para Iyán (proyecto «Nueva Vida», academia «DB5», alumnos online, plantillas de factura). Datos de facturación (`settings/invoicing`: `issuer`, `payers`, `logo`) y equipo (`settings/team.members`) ya se leen de la base de datos.
- Ajustes dentro de la app para editar datos fiscales, clientes y equipo.
- Política de privacidad, términos y verificación de la app OAuth de Google.
