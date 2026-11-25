# Organifly · guía para agentes

Organifly es el organizador personal de Iyán Rojo, que quiere lanzarlo como producto web. Idioma de trabajo: español.

## Estructura

- `index.html`: landing + maqueta de registro (un solo archivo).
- `app/index.html`: la app (un solo archivo). Viene del artefacto de Claude y sigue llamando a `window.claude.use("db" | "mcp" | "downloads" | "sample")`.
- `app/adapter.js`: implementa ese `window.claude` fuera de Claude (Firestore o localStorage, Google Calendar REST, descargas). No cambies la interfaz que espera la app; si hace falta algo nuevo, añádelo aquí.
- `firebase-config.js`: configuración de Firebase. **No subir nada secreto**; la seguridad está en `firestore.rules`.
- `firestore.rules`: cada persona solo accede a `users/{uid}/…`. Si las cambias, avisa: el propietario las publica a mano.

## Reglas

- **Nada de datos personales en el código** (NIF, IBAN, direcciones, datos de clientes, ids de calendarios, nombres de compañeros). Todo eso va en la base de datos de cada persona (`settings/invoicing`, `settings/team`, `settings/finance`).
- Colores solo con las variables de `:root` (claro y oscuro). Tipografías: Figtree en la app; Outfit + Inter en la landing.
- Sin librerías nuevas salvo Firebase compat y jsPDF (cdnjs) que ya se usan.
- Respetar `prefers-reduced-motion`.
- Probar en local con `python3 -m http.server` (modo prueba) antes de subir.
