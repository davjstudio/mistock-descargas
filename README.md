# MiStock Descargas

Portal de descargas de MiStock para Windows y Android, con acceso a la web principal instalable.

- Sitio: https://davjstudio.github.io/mistock-descargas/
- Aplicación web principal: https://davjstudio.github.io/mistock/
- Instaladores: https://github.com/davjstudio/mistock-descargas/releases

## Versiones

Windows 1.4 (EXE portátil de 64 bits con navegación superior), APK Android de prueba y aplicación web que se puede añadir al inicio del iPhone desde Safari.

La web usa el mismo proyecto Firebase y las mismas cuentas que las aplicaciones. Incluye inventario con fotos de productos, movimientos de entrada y salida, alertas de stock, perfil y exportación CSV.

## Datos y acceso

`config.json` contiene la configuración pública del cliente Firebase, no credenciales de administrador. Las peticiones a Firestore utilizan la identidad del usuario y respetan las reglas del proyecto. La sesión permanece en memoria; al recargar puede ser necesario iniciar sesión de nuevo. El service worker guarda únicamente la interfaz pública, sin inventarios ni tokens.

La demostración usa datos temporales y no modifica cuentas reales. La configuración y operaciones se probaron con respuestas simuladas; la validación con cuentas reales y con Safari en un iPhone sigue pendiente.

## Publicación

Los archivos del sitio se publican desde la raíz de la rama `main` mediante GitHub Pages. El EXE se distribuye como archivo adjunto de la versión `v1.4` en Releases. La descarga del APK está en `v1.3`.
