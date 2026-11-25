# Organifly

Organizador personal: tareas, proyectos, calendario, clases, facturas, finanzas, reuniones, sueños y deporte en una sola app limpia, conectada con Google y con IA.

## Estado

- `index.html` — landing page + maqueta de registro (Google / email → nombre y perfil → módulos → Google Calendar). **Maqueta**: aún no crea cuentas; lo elegido se guarda solo en `localStorage`.
- La app actual funciona como artefacto privado en Claude. Pasarla aquí requiere sustituir su capa de datos (ver hoja de ruta).

## Ver en local

Es HTML estático, sin dependencias: abre `index.html` en el navegador o sirve la carpeta:

```bash
python3 -m http.server 8080
```

## Despliegue (Cloudflare Pages)

1. Cloudflare → Workers & Pages → Create → Pages → *Connect to Git* → `Iyanrojo/organifly`.
2. Framework preset: **None** · Build command: *(vacío)* · Output directory: `/`.
3. Custom domains → añadir el dominio comprado (p. ej. `organifly.com`).

## Hoja de ruta

1. **Landing + maqueta de registro** ✅
2. **Cuentas reales con Google**: Firebase Authentication (proveedor Google) o Supabase Auth.
3. **Datos por usuario**: Firestore / Supabase con reglas «cada usuario solo lee y escribe lo suyo».
4. **App** (`/app`): portar la versión del artefacto, cambiando `window.claude.use("db")` por el SDK elegido y sacando de la plantilla de facturas cualquier dato personal (cada usuario configura sus datos fiscales y sus clientes).
5. **Google Calendar** con OAuth (scope `calendar.events`), solo si el usuario lo activa.
6. **IA** (actas, ejercicios, etiquetas de sueños) vía una función de servidor (Cloudflare Workers) con la API de Claude, sin exponer claves en el navegador.
7. Legal: política de privacidad, términos y verificación de la app OAuth de Google.
