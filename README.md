# QUBITS-BT · Contabilidad

Aplicación contable personal para clientes, facturas, ingresos cobrados, gastos, proveedores y cuentas contables. Los datos contables se guardan en Supabase; GitHub Pages solo sirve los archivos de la aplicación.

## Publicar en GitHub Pages

El workflow de `.github/workflows/pages.yml` publica el sitio automáticamente al enviar cambios a `main`. En GitHub, activa **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Con GitHub Free, GitHub Pages requiere que el repositorio sea público. La página también será visible públicamente. El código no contiene registros de clientes ni movimientos; para ver datos se requiere iniciar sesión y las tablas usan políticas RLS. Nunca subas una clave `service_role` ni contraseñas. Consulta la [disponibilidad de GitHub Pages por plan](https://docs.github.com/en/pages/quickstart).

## Conectar desde cada equipo

1. Abre la dirección publicada de GitHub Pages.
2. Pega la URL del proyecto Supabase y la clave pública `publishable`/`anon` en la pantalla de conexión. La configuración se guarda solo en ese navegador.
3. Inicia sesión con la misma cuenta de QUBITS-BT para acceder a los datos sincronizados.

En Supabase, añade la dirección exacta de GitHub Pages a **Authentication → URL Configuration → Redirect URLs**. El flujo de confirmación de correo vuelve a la ruta publicada del proyecto.

Para desarrollo local, ejecuta `node serve.cjs` y abre `http://localhost:4173/`. Esa URL ya está incluida en la configuración de retorno local.

## Base de datos

Ejecuta `supabase-schema.sql` en SQL Editor para crear la tabla contable y sus políticas RLS. Ejecuta también `supabase-income-schema.sql` para crear la tabla aislada de cobros recibidos. Los proveedores se guardan dentro del mismo payload JSONB del usuario, junto con los otros registros.

## Funciones

- Resumen por mes de facturas, ingresos recibidos, gastos e IVA.
- Clientes con identificación, contactos y datos de facturación.
- Facturas con servicio, base, IVA, fecha contable y periodo.
- Notas débito y crédito asociadas a factura y cliente.
- Ingresos cobrados vinculados a cliente, factura y cuenta de ingresos.
- Proveedores normalizados y selección obligatoria en gastos nuevos.
- Plan de cuentas contables y diseño adaptable a móvil.

Los importes se muestran en pesos colombianos (COP). La clave pública está diseñada para usarse en el navegador; la privacidad de los datos depende de las políticas RLS. Conserva respaldos de tus datos y revisa los [límites de Supabase](https://supabase.com/pricing). La aplicación no emite factura electrónica ni reemplaza la contabilidad o las obligaciones tributarias oficiales.
