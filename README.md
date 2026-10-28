# MiStock

Página de descargas y aplicación web instalable de MiStock.

- Sitio: https://davjstudio.github.io/mistock/
- Aplicación web: https://davjstudio.github.io/mistock/app.html
- Instaladores: https://github.com/davjstudio/mistock/releases

## Versiones

Windows 1.1 (EXE portátil de 64 bits), APK Android de prueba y aplicación web que se puede añadir al inicio del iPhone desde Safari.

La web usa el mismo proyecto Firebase y las mismas cuentas que las aplicaciones. Incluye inventario, movimientos de entrada y salida, alertas de stock, perfil y exportación CSV.

## Datos y acceso

`config.json` contiene la configuración pública del cliente Firebase, no credenciales de administrador. Las peticiones a Firestore utilizan la identidad del usuario y respetan las reglas del proyecto. La sesión permanece en memoria; al recargar puede ser necesario iniciar sesión de nuevo. El service worker guarda únicamente la interfaz pública, sin inventarios ni tokens.

La demostración usa datos temporales y no modifica cuentas reales. La configuración y operaciones se probaron con respuestas simuladas; la validación con cuentas reales y con Safari en un iPhone sigue pendiente.

## Publicación

Los archivos del sitio se publican desde la raíz de la rama `main` mediante GitHub Pages. El EXE y el APK se distribuyen como archivos adjuntos de la versión `v1.1` en Releases.
