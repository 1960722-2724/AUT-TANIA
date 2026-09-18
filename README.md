# Móviles Dobles

# ⚙️ Información General

- **Nombre del Proyecto:** Móviles Dobles
- **Tipo de Desarrollo:** Aplicativo Web
- **Versión:** 1.0.0
- **Fecha de inicio:** 04/08/2026
- **Responsables:** Lina Marcela Lopez Garcia
- **Sitios o Sedes Implicadas:** UMM / UMC Cali
- **Solicitantes:** Adrián Majin Mopan

---

# moviles_dobles — Documentación Técnica

## Metadata del Proyecto

- **Nombre del Proyecto:** moviles-dobles (Tabasco OC)
- **Propósito:** Aplicación web interna para el control diario de asistencia de técnicos y auxiliares en campo. Los supervisores registran reportes diarios (quién está laborando) y los administradores gestionan usuarios, aprueban registros y exportan reportes a Excel.
- **Última Revisión:** 2026-08-18 (última entrada del historial de cambios en `README.md`: corrección de codificación de nombres con tildes/eñes).
- **Datos reales de operación:** catálogo fusionado desde "PLAN PADRINO I&M" (agosto 2026) → **232 técnicos activos** y 172 auxiliares activos; 4 usuarios semilla en `db/backup.sql` (1 admin + 3 supervisores).

---

# 1. Descripción General del Proyecto

Centraliza el reporte diario de asistencia de personal de campo (técnicos y auxiliares), su aprobación de cuentas de usuario, la administración del catálogo de personal y la exportación de reportes a Excel.

Roles: `supervisor` (crea reportes diarios y consulta solo los propios) y `admin` (aprueba/rechaza registros de usuario, ve todos los reportes, administra usuarios y el catálogo de técnicos/auxiliares, exporta a Excel). Ambos roles están definidos como `ENUM('admin', 'supervisor')` en la tabla `users` (`db/backup.sql`), sin un tercer nivel intermedio.

El proyecto cuenta con documentación interna propia y actualizada en `README.md` (incluye un historial de cambios detallado por iteración), a diferencia de otros proyectos del equipo donde la documentación suele desincronizarse — aquí es la fuente de verdad.

---

# 2. Stack Tecnológico

- **Backend:** Node.js + Express 5, sin ORM (queries SQL directas vía `mysql2/promise`).
- **Autenticación:** JWT (`jsonwebtoken`), expiración 24h; contraseñas con `bcryptjs`.
- **Frontend:** HTML5 + CSS propio (`public/css/style.css`, paleta de marca `#003E93` azul / `#FF9401` naranja / `#908C8B` gris) + JS vanilla (`public/js/app.js`, helpers de fetch autenticado). Sin framework de frontend ni bundler.
- **Iconos:** Bootstrap Icons vía CDN (reemplazaron emojis de color por íconos monocromáticos heredando `currentColor`).
- **Exportación a Excel:** librería `xlsx` cargada vía CDN directamente en `dashboard.html` (no como dependencia npm).
- **Base de Datos:** MySQL 8+ (o compatible), base `moviles_dobles`, charset `utf8mb4_unicode_ci`, acceso vía pool `mysql2`.
- **Variables de entorno:** `dotenv`, archivo `.env` en la raíz de `proyecto/` (no versionado).

---

# 3. Estructura de Directorios

```
proyecto/
├── server.js                  # Punto de entrada: levanta Express y monta las rutas
├── package.json
├── .env                        # Variables de entorno (no versionar)
├── preview.html                # Mockup estático de todas las pantallas (NO lo sirve el servidor)
│
├── config/
│   └── database.js             # Pool de conexión MySQL (mysql2/promise)
│
├── middleware/
│   └── auth.js                 # Verifica el JWT en rutas protegidas (authMiddleware)
│
├── utils/
│   └── validators.js           # isValidCedula() — valida cédula (6 a 11 dígitos numéricos)
│
├── routes/
│   ├── auth.js                  # Login, registro, aprobación de usuarios (/api/auth/*)
│   └── api.js                    # Técnicos, auxiliares, reportes, usuarios (/api/*)
│
├── db/
│   └── backup.sql                # Esquema completo + datos (usuarios semilla, catálogo técnicos/auxiliares)
│
├── docs/
│   ├── Moviles dobles Julio.xlsx                              # Histórico de reportes usado para poblar el catálogo inicial
│   └── PLAN PADRINO IM UMM UMC CALI AGOSTO 2026 V.1 (3) (1).xlsx  # Base oficial de personal activo (fuente de la última actualización de catálogo)
│
└── public/                     # Todo lo que Express sirve como estático (el frontend real)
    ├── index.html               # Pantalla de login
    ├── register.html            # Pantalla de registro
    ├── css/style.css            # Estilos (paleta de marca)
    ├── js/app.js                 # apiGet/apiPost/... (fetch autenticado) y manejo de sesión
    ├── img/logo.jpg              # Logo de la empresa
    └── pages/dashboard.html      # SPA con dashboard, reportes, usuarios (rol admin/supervisor)
```

Nota: `preview.html` es un mockup de diseño con HTML/CSS/JS embebidos, pensado para revisar pantallas sin backend; no forma parte de la app que corre en `server.js` (el frontend real vive en `public/`).

---

# 4. Instalación y Ejecución

Sin build ni transpilación: es Node.js/Express servido directo con `node server.js`.

1. Requisitos: Node.js 18+, MySQL 8+ (o compatible).
2. Instalar dependencias:
   ```bash
   cd proyecto
   npm install
   ```
3. Crear la base de datos e importar el esquema (⚠️ ver nota de codificación en la sección 5):
   ```bash
   mysql -u tu_usuario -p -e "CREATE DATABASE moviles_dobles"
   mysql --default-character-set=utf8mb4 -u tu_usuario -p moviles_dobles < db/backup.sql
   ```
4. Levantar el servidor:
   ```bash
   node server.js
   ```
5. La app queda disponible en `http://localhost:3000` (o el puerto definido en `PORT`).

---

# 5. Configuración Necesaria

Archivo de entorno (raíz de `proyecto/`, no versionado):

```env
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_NAME=moviles_dobles
PORT=3000
JWT_SECRET=una_clave_secreta_larga_y_aleatoria
```

Importante — codificación al importar: siempre usar `--default-character-set=utf8mb4` al importar `db/backup.sql`. En Windows, `mysql.exe` sin ese flag interpreta el archivo con la codificación de la consola (no UTF-8), y los nombres con tildes/eñes quedan guardados con doble codificación en la base (bug ya detectado y corregido una vez sobre los 3 usuarios supervisores semilla — ver sección 7).

Credenciales semilla (`db/backup.sql`, comentario junto a cada `INSERT`):
- `admin` / `admin123` (rol `admin`)
- `supervisor1`, `supervisor2`, `supervisor3` / `super123` (rol `supervisor`)

---

# 6. API

Todas las rutas bajo `/api` salvo login/registro requieren `Authorization: Bearer <token>` (JWT devuelto por el login, vía `middleware/auth.js`).

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Inicia sesión |
| POST | `/api/auth/register` | Crea cuenta (queda `pending` hasta que un admin la aprueba) |
| GET | `/api/auth/pending` | Lista solicitudes pendientes (admin) |
| PUT | `/api/auth/approve/:id` | Aprueba una cuenta (admin) |
| PUT | `/api/auth/reject/:id` | Rechaza una cuenta (admin) |
| GET | `/api/auth/me` | Datos del usuario autenticado |
| POST | `/api/auth/logout` | Cierra sesión |
| GET | `/api/technicians` / `/api/auxiliaries` | Catálogos activos |
| GET | `/api/technicians/all` / `/api/auxiliaries/all` | Catálogo completo, incluye inactivos (admin) |
| POST/PUT/DELETE | `/api/technicians`, `/api/auxiliaries` (`/:id`) | CRUD de técnicos/auxiliares (admin) |
| POST | `/api/personnel/:type/:id/convert` | Mueve un registro entre `technicians` y `auxiliaries` cuando cambia su cargo (admin) |
| GET | `/api/reports/mine` | Reportes del supervisor autenticado |
| GET | `/api/reports?all=1` | Todos los reportes (admin) |
| GET | `/api/reports/export` | Reportes para exportar a Excel |
| POST | `/api/reports` | Crea un reporte diario |
| GET | `/api/users` | Lista de usuarios (admin) |
| POST | `/api/users` | Crea usuario (admin) |
| PUT | `/api/users/:id` | Edita usuario (admin) |
| DELETE | `/api/users/:id` | Desactiva usuario (admin) |

---

# 7. Modelo de Datos

- **users** — cuentas del sistema. `role`: `admin` \| `supervisor`. `status`: `pending` \| `approved` \| `rejected`. `active` (bool).
- **technicians / auxiliaries** — catálogo de personal de campo. `cedula` única, `full_name`, `active`.
- **reports** — un registro diario por supervisor: `technician_id` (obligatorio) + `technician_laborando`, `auxiliary_id` (opcional, `NULL` permitido) + `auxiliary_laborando`, `report_date`. FKs a `users`, `technicians`, `auxiliaries`.

---

# 8. Patrones Principales Identificados

- **API REST plana con Express Router:** dos routers (`routes/auth.js`, `routes/api.js`) montados en `server.js`; sin capa de servicios/repositorios — las queries SQL viven directamente en los handlers de ruta.
- **SPA fallback:** `app.get('/{*path}', ...)` sirve siempre `public/index.html`, dejando el ruteo de pantallas al frontend.
- **Auth stateless:** JWT de 24h con payload mínimo (`id`, `username`, `full_name`, `role`); no hay refresh token ni blacklist de logout (el endpoint `/logout` es solo un ack del cliente).
- **Aprobación de cuentas:** el registro nunca activa una cuenta directamente (`status = 'pending'`); requiere `approve`/`reject` explícito de un admin.
- **Conversión de categoría sin borrado:** `POST /api/personnel/:type/:id/convert` crea (o reactiva) en la tabla destino y desactiva en la de origen dentro de una transacción, preservando el historial de `reports` que referencia el `technician_id`/`auxiliary_id` original.
- **Falsy-safe con `??`:** los campos `technician_laborando`/`auxiliary_laborando` usan `??` en vez de `||` para no confundir `0` (Retirado) con "sin enviar" (bug corregido, ver sección 9).
- **Frontend sin build:** todo el JS de cliente es vanilla, con un módulo único de helpers de fetch autenticado (`public/js/app.js`) reutilizado por `index.html`, `register.html` y `dashboard.html`.

---

# 9. Notas y Recomendaciones de Mantenimiento

- **Sin gestor de versiones (git) detectado** en la carpeta del proyecto — solo existen respaldos manuales en `.zip` (`MOVILES DOBLES.zip`, carpeta `Respaldos_moviles-dobles/`). Recomendación: inicializar un repositorio git para trazabilidad de cambios, en vez de depender de copias `.zip` completas.
- **Dependencia `xlsx` vía CDN, no npm:** la exportación a Excel del dashboard depende de un CDN externo sin versión fijada localmente ni fallback offline; `package.json` no la declara como dependencia (fue removida deliberadamente de la raíz del repo por no tener uso real ahí).
- **Sin tests automatizados:** `package.json` no tiene script de test real (`"test": "echo ... && exit 1"`).
- **Catálogo de personal como fuente móvil:** técnicos/auxiliares se cargan por `INSERT` manual regenerando `db/backup.sql` desde archivos Excel externos (`docs/`), no hay UI de importación masiva ni proceso repetible automatizado — cada actualización de catálogo (ver historial en `README.md`) fue un proceso manual de depuración por cédula.
- **Registro pendiente de corrección:** el auxiliar con cédula `1113650320` quedó registrado como `Carlos Que Eduardo Vargas Mejia` por un probable error de digitación en la hoja fuente; no hay UI para editar directamente, requiere `UPDATE` manual en base de datos.
- **Codificación UTF-8 al importar:** ya causó un incidente real (nombres con tildes/eñes guardados con doble codificación) — mitigado documentando el flag `--default-character-set=utf8mb4`, pero sigue siendo un paso manual propenso al mismo error si alguien importa sin seguir el README.
- **`docs/`** contiene planillas Excel operativas (no documentación técnica en sí) — son la fuente de datos del catálogo de personal, conviene no confundirlas con documentación de arquitectura.
- **Sin HTTPS ni configuración de producción documentada en el repo** — solo hay variables de entorno de desarrollo; si el sistema ya está desplegado, esa configuración vive fuera de este repositorio.

---

# Documentación adyacente

- `README.md` (raíz de `proyecto/`) — incluye instalación, API y el historial de cambios completo por iteración (identidad visual, limpieza de estructura, iconografía, catálogo de técnicos/auxiliares, conversión de categoría, auxiliar opcional, corrección de codificación).
- `db/backup.sql` — única fuente del esquema de base de datos; no hay migraciones separadas.