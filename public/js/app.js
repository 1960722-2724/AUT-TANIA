(function () {
    'use strict';

    var SESSION_KEY = 'autn_sesion';
    var PROCESO_ACTUAL_KEY = 'autn_proceso_actual_id';

    function apiBaseDesdePagina() {
        var partes = window.location.pathname.split('/');
        var indicePages = partes.indexOf('pages');
        if (indicePages === -1) {
            return 'api/pdf/';
        }
        var profundidad = partes.length - indicePages - 1;
        return new Array(profundidad + 1).join('../') + 'api/pdf/';
    }

    function publicBaseDesdePagina() {
        var partes = window.location.pathname.split('/');
        var indicePages = partes.indexOf('pages');
        if (indicePages === -1) {
            return '';
        }
        var profundidad = partes.length - indicePages - 1;
        return new Array(profundidad + 1).join('../');
    }

    var API_BASE = apiBaseDesdePagina();

    function apiFetch(ruta, opciones) {
        return fetch(API_BASE + ruta, opciones).then(function (resp) {
            return resp.json().then(function (datos) {
                if (!resp.ok || !datos || !datos.ok) {
                    throw new Error((datos && datos.error) || 'Error de comunicación con el servidor.');
                }
                return datos;
            });
        });
    }

    function apiPost(ruta, body) {
        return apiFetch(ruta, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    }

    function apiDelete(ruta) {
        return apiFetch(ruta, { method: 'DELETE' });
    }

    // --- Sesión (token de usuario autenticado, no es "la base de datos") ---

    function obtenerSesion() {
        var raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    }

    function crearSesion(sesion) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(sesion));
    }

    function cerrarSesion() {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(PROCESO_ACTUAL_KEY);
    }

    function iniciarSesion(cedula, password) {
        return apiPost('login.php', { cedula: cedula, password: password }).then(function (res) {
            var sesion = { usuario: res.usuario, iniciada: new Date().toISOString() };
            crearSesion(sesion);
            return sesion;
        });
    }

    // --- Mapeo de campos hallazgo/fase2 (camelCase en el frontend <-> snake_case en la BD) ---

    var MAPA_HALLAZGO = {
        quienReporta: 'quien_reporta',
        fechaHora: 'fecha_hora',
        aliado: 'aliado',
        regional: 'regional',
        departamento: 'departamento',
        municipio: 'municipio',
        barrio: 'barrio',
        direccion: 'direccion',
        puntoReferencia: 'punto_referencia',
        coordenadas: 'coordenadas',
        duenoInfraestructura: 'dueno_infraestructura',
        codigoPacvi: 'codigo_pacvi',
        vulnerabilidadesInfraestructura: 'vulnerabilidades_infraestructura',
        estadoInfraestructura: 'estado_infraestructura',
        vulnerabilidad: 'vulnerabilidad',
        asociarOT: 'asociar_ot',
        prioridad: 'prioridad',
        observaciones: 'observaciones'
    };

    var MAPA_FASE2 = {
        supervisor: 'supervisor',
        wo: 'wo',
        tecnico: 'tecnico',
        estadoV: 'estado_v',
        observaciones: 'observaciones'
    };

    function convertirAApi(objeto, mapa) {
        var resultado = {};
        Object.keys(mapa).forEach(function (claveJs) {
            if (objeto[claveJs] !== undefined) {
                resultado[mapa[claveJs]] = objeto[claveJs];
            }
        });
        return resultado;
    }

    function convertirDeApi(fila, mapa) {
        if (!fila) {
            return null;
        }
        var resultado = {};
        Object.keys(mapa).forEach(function (claveJs) {
            resultado[claveJs] = fila[mapa[claveJs]];
        });
        return resultado;
    }

    function normalizarFecha(mysqlDatetime) {
        if (!mysqlDatetime) {
            return null;
        }
        return mysqlDatetime.replace(' ', 'T');
    }

    function normalizarProceso(fila) {
        if (!fila) {
            return null;
        }
        var fase2 = convertirDeApi(fila.fase2, MAPA_FASE2);
        if (fase2) {
            fase2.foto = !!(fila.fase2 && fila.fase2.tiene_foto);
            fase2.fotoData = (fila.evidencias && fila.evidencias.length)
                ? fila.evidencias[fila.evidencias.length - 1]
                : '';
        }

        return {
            id: fila.id_proceso,
            consecutivo: fila.consecutivo,
            nombre_archivo: fila.nombre_archivo,
            archivo_original: fila.archivo_original,
            escaneado: !!fila.escaneado,
            paginas: fila.paginas,
            fecha: normalizarFecha(fila.creado_en),
            confirmado: !!fila.confirmado,
            fechaConfirmacion: normalizarFecha(fila.fecha_confirmacion),
            registro: fila.registro || null,
            imagen: fila.imagen || null,
            texto: fila.texto || [],
            asignado_a: fila.asignado_a || null,
            hallazgo: convertirDeApi(fila.hallazgo, MAPA_HALLAZGO)
        };
    }

    // --- Procesos (reemplaza el historial que antes vivía en localStorage) ---

    function guardarProceso(resultadoSubida) {
        var sesion = obtenerSesion();
        var body = {
            nombre_archivo: resultadoSubida.archivo_original || resultadoSubida.archivo || 'Sin nombre',
            archivo_original: resultadoSubida.archivo_original || resultadoSubida.archivo || null,
            escaneado: !!resultadoSubida.escaneado,
            paginas: resultadoSubida.paginas || null,
            id_usuario_creador: sesion && sesion.usuario ? sesion.usuario.id : null,
            imagen: resultadoSubida.imagen || null,
            registro: resultadoSubida.registro || null,
            texto: resultadoSubida.texto || [],
            hallazgo: convertirAApi(resultadoSubida.hallazgo || {}, MAPA_HALLAZGO)
        };

        return apiPost('procesos.php', body).then(function (res) {
            sessionStorage.setItem(PROCESO_ACTUAL_KEY, res.proceso.id_proceso);
            return normalizarProceso(res.proceso);
        });
    }

    function obtenerProcesoPorId(id) {
        return apiFetch('procesos.php?id=' + encodeURIComponent(id)).then(function (res) {
            return normalizarProceso(res.proceso);
        }).catch(function () {
            return null;
        });
    }

    function obtenerProceso() {
        var id = sessionStorage.getItem(PROCESO_ACTUAL_KEY);
        if (!id) {
            return Promise.resolve(null);
        }
        return obtenerProcesoPorId(id);
    }

    function obtenerHistorial() {
        return apiFetch('procesos.php').then(function (res) {
            return res.procesos.map(normalizarProceso);
        });
    }

    function actualizarProceso(proceso) {
        var body = { _accion: 'actualizar' };

        ['escaneado', 'confirmado'].forEach(function (campo) {
            if (proceso[campo] !== undefined) {
                body[campo] = proceso[campo] ? 1 : 0;
            }
        });
        if (proceso.fechaConfirmacion) {
            body.fecha_confirmacion = proceso.fechaConfirmacion.replace('T', ' ').slice(0, 19);
        }
        if (proceso.asignado_a !== undefined) {
            body.asignado_a_id_usuario = proceso.asignado_a ? proceso.asignado_a.id : null;
        }
        if (proceso.hallazgo) {
            body.hallazgo = convertirAApi(proceso.hallazgo, MAPA_HALLAZGO);
        }
        if (proceso.fase2) {
            body.fase2 = convertirAApi(proceso.fase2, MAPA_FASE2);
            body.fase2.tiene_foto = proceso.fase2.foto ? 1 : 0;
            if (proceso.fase2.fotoData) {
                body.evidencia_tipo = 'movil';
                body.evidencia_ruta = proceso.fase2.fotoData;
            }
        }

        return apiPost('procesos.php?id=' + encodeURIComponent(proceso.id), body).then(function (res) {
            return normalizarProceso(res.proceso);
        });
    }

    function guardarFase2(procesoId, datos) {
        return actualizarProceso({ id: procesoId, fase2: datos });
    }

    function confirmarProceso(proceso) {
        proceso.confirmado = true;
        proceso.fechaConfirmacion = new Date().toISOString();
        return actualizarProceso(proceso);
    }

    function obtenerMisHallazgos() {
        var sesion = obtenerSesion();
        var idUsuario = sesion && sesion.usuario ? sesion.usuario.id : null;
        if (!idUsuario) {
            return Promise.resolve([]);
        }
        return apiFetch('procesos.php?asignado_a=' + encodeURIComponent(idUsuario)).then(function (res) {
            return res.procesos.map(normalizarProceso);
        });
    }

    function obtenerUsuariosMoviles() {
        return apiFetch('usuarios_movil.php').then(function (res) {
            return res.usuarios;
        });
    }

    function eliminarProceso(id) {
        return apiDelete('procesos.php?id=' + encodeURIComponent(id));
    }

    var ICONOS = {
        dashboard: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg>',
        documento: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
        historial: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v5h5"></path><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path><polyline points="12 7 12 12 16 14"></polyline></svg>'
    };

    function paginaActual() {
        var ruta = window.location.pathname;
        if (/\/historial\//.test(ruta)) {
            return 'historial';
        }
        if (/\/dashboard\//.test(ruta)) {
            return 'dashboard';
        }
        if (/\/hallazgo\/|\/paso1\/|\/paso2\//.test(ruta)) {
            return 'procesamiento';
        }
        return '';
    }

    function enlaceMenu(opcion, activo) {
        var a = document.createElement('a');
        a.href = opcion.href;
        a.className = 'nav-link' + (activo ? ' active' : '');
        a.innerHTML = ICONOS[opcion.icono] + opcion.etiqueta;
        return a;
    }

    function renderMenu() {
        var nav = document.getElementById('sidebar-nav');
        if (!nav) {
            return;
        }

        var base = publicBaseDesdePagina();
        var sesion = obtenerSesion();
        var rol = sesion && sesion.usuario ? sesion.usuario.rol : '';
        var actual = paginaActual();

        var opciones = [
            {
                seccion: 'Principal',
                id: 'dashboard',
                href: base + 'pages/dashboard/dashboard.html',
                etiqueta: 'Dashboard',
                icono: 'dashboard'
            },
            {
                id: 'procesamiento',
                href: base + 'pages/procesamiento/hallazgo/hallazgo.html',
                etiqueta: 'Procesamiento',
                icono: 'documento'
            }
        ];

        if (rol === 'ADMIN') {
            opciones.push({
                id: 'historial',
                href: base + 'pages/historial/historial.html',
                etiqueta: 'Historial',
                icono: 'historial'
            });
        }

        nav.innerHTML = '';

        var seccionActual = null;
        opciones.forEach(function (opcion) {
            if (opcion.seccion && opcion.seccion !== seccionActual) {
                var p = document.createElement('p');
                p.className = 'nav-section';
                p.textContent = opcion.seccion;
                nav.appendChild(p);
                seccionActual = opcion.seccion;
            }
            nav.appendChild(enlaceMenu(opcion, opcion.id === actual));
        });
    }

    function abrirSidebar() {
        document.body.classList.add('sidebar-open');
    }

    function cerrarSidebar() {
        document.body.classList.remove('sidebar-open');
    }

    function iniciarLayout() {
        var body = document.body;
        var sidebar = document.getElementById('sidebar');

        if (!sidebar) {
            return;
        }

        renderMenu();

        var toggle = document.getElementById('btn-toggle-sidebar');
        var closeBtn = document.getElementById('btn-sidebar-close');
        var backdrop = document.getElementById('sidebar-backdrop');

        if (toggle) {
            toggle.addEventListener('click', function () {
                if (body.classList.contains('sidebar-open')) {
                    cerrarSidebar();
                } else {
                    abrirSidebar();
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', cerrarSidebar);
        }

        if (backdrop) {
            backdrop.addEventListener('click', cerrarSidebar);
        }

        sidebar.addEventListener('click', function (evt) {
            if (body.classList.contains('sidebar-open') && evt.target.closest('a')) {
                cerrarSidebar();
            }
        });

        document.addEventListener('keydown', function (evt) {
            if (evt.key === 'Escape' && body.classList.contains('sidebar-open')) {
                cerrarSidebar();
            }
        });
    }

    window.App = {
        iniciarSesion: iniciarSesion,
        obtenerSesion: obtenerSesion,
        crearSesion: crearSesion,
        cerrarSesion: cerrarSesion,
        guardarProceso: guardarProceso,
        obtenerProceso: obtenerProceso,
        obtenerHistorial: obtenerHistorial,
        obtenerProcesoPorId: obtenerProcesoPorId,
        actualizarProceso: actualizarProceso,
        guardarFase2: guardarFase2,
        confirmarProceso: confirmarProceso,
        obtenerMisHallazgos: obtenerMisHallazgos,
        obtenerUsuariosMoviles: obtenerUsuariosMoviles,
        eliminarProceso: eliminarProceso,
        iniciarLayout: iniciarLayout
    };

    iniciarLayout();
})();
