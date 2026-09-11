(function () {
    'use strict';

    var SESSION_KEY = 'autn_sesion';
    var PROCESO_KEY = 'autn_proceso_actual';
    var HISTORIAL_KEY = 'autn_procesos';

    var mockData = {
        usuarios: [
            { id: 1, nombre: 'Carlos Mendoza', cedula: '103245678', rol: 'USUARIO' },
            { id: 2, nombre: 'Luisa Fernanda Rojas', cedula: '112224578', rol: 'USUARIO' },
            { id: 3, nombre: 'Andrés Gutiérrez', cedula: '102448913', rol: 'USUARIO' },
            { id: 4, nombre: 'María Camila Torres', cedula: '100245698', rol: 'USUARIO' },
            { id: 5, nombre: 'Jorge Luis Ramírez', cedula: '79845621', rol: 'USUARIO' },
            { id: 6, nombre: 'Ana Sofía Herrera', cedula: '104562387', rol: 'USUARIO' },
            { id: 7, nombre: 'Pedro Antonio Castillo', cedula: '103546892', rol: 'USUARIO' },
            { id: 8, nombre: 'Valentina Gómez', cedula: '105467891', rol: 'USUARIO' },
            { id: 9, nombre: 'Diego Alejandro Vega', cedula: '100789456', rol: 'USUARIO' },
            { id: 10, nombre: 'Sara Isabel Morales', cedula: '110245789', rol: 'USUARIO' },
            { id: 11, nombre: 'Felipe Rincón', cedula: '79856123', rol: 'USUARIO' },
            { id: 12, nombre: 'Paula Andrea Salazar', cedula: '103098745', rol: 'USUARIO' },
            { id: 13, nombre: 'Eduardo Pérez', cedula: '98456123', rol: 'ADMIN' }
        ],
        procesos: [],
        resultadoPDF: {}
    };

    function obtenerSesion() {
        var raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    }

    function crearSesion(sesion) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(sesion));
    }

    function cerrarSesion() {
        localStorage.removeItem(SESSION_KEY);
    }

    function generarConsecutivo() {
        var historial = obtenerHistorial();
        var max = 0;
        historial.forEach(function (p) {
            var n = parseInt(p.consecutivo, 10);
            if (!isNaN(n) && n > max) {
                max = n;
            }
        });
        var s = String(max + 1);
        while (s.length < 4) {
            s = '0' + s;
        }
        return s;
    }

    function prepararProceso(proceso) {
        if (!proceso) {
            return proceso;
        }
        if (!proceso.id) {
            proceso.id = 'proc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        }
        if (!proceso.fecha) {
            proceso.fecha = new Date().toISOString();
        }
        if (!proceso.nombre_archivo) {
            proceso.nombre_archivo = proceso.archivo_original || proceso.archivo || 'Sin nombre';
        }
        if (!proceso.consecutivo) {
            proceso.consecutivo = generarConsecutivo();
        }
        if (!proceso.estado) {
            proceso.estado = 'procesado';
        }
        if (!proceso.usuario) {
            var sesion = obtenerSesion();
            var u = sesion && sesion.usuario ? sesion.usuario : null;
            proceso.usuario = u
                ? { nombre: u.nombre, cedula: u.cedula, rol: u.rol }
                : { nombre: 'Invitado', cedula: '', rol: '' };
        }
        return proceso;
    }

    function quitarDuplicados(lista) {
        var vistos = {};
        return lista.filter(function (p) {
            if (!p || !p.id || vistos[p.id]) {
                return false;
            }
            vistos[p.id] = true;
            return true;
        });
    }

    function guardarProceso(proceso) {
        proceso = prepararProceso(proceso);
        sessionStorage.setItem(PROCESO_KEY, JSON.stringify(proceso));

        var historial = obtenerHistorial();
        historial.unshift(proceso);
        localStorage.setItem(HISTORIAL_KEY, JSON.stringify(quitarDuplicados(historial)));
        return proceso;
    }

    function guardarEnHistorial(proceso) {
        proceso = prepararProceso(proceso);
        var historial = obtenerHistorial();
        historial.unshift(proceso);
        localStorage.setItem(HISTORIAL_KEY, JSON.stringify(quitarDuplicados(historial)));
        return proceso;
    }

    function obtenerProceso() {
        var raw = sessionStorage.getItem(PROCESO_KEY);
        return raw ? JSON.parse(raw) : null;
    }

    function obtenerHistorial() {
        var raw = localStorage.getItem(HISTORIAL_KEY);
        try {
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function obtenerProcesoPorId(id) {
        var historial = obtenerHistorial();
        for (var i = 0; i < historial.length; i++) {
            if (historial[i].id === id) {
                return historial[i];
            }
        }
        return null;
    }

    function actualizarProceso(proceso) {
        if (!proceso || !proceso.id) {
            return proceso;
        }

        var historial = obtenerHistorial();
        for (var i = 0; i < historial.length; i++) {
            if (historial[i].id === proceso.id) {
                historial[i] = proceso;
                break;
            }
        }
        localStorage.setItem(HISTORIAL_KEY, JSON.stringify(historial));

        var actual = obtenerProceso();
        if (actual && actual.id === proceso.id) {
            sessionStorage.setItem(PROCESO_KEY, JSON.stringify(proceso));
        }

        return proceso;
    }

    function guardarFase2(procesoId, datos) {
        var proceso = obtenerProcesoPorId(procesoId);
        if (!proceso) {
            return null;
        }
        proceso.fase2 = datos;
        return actualizarProceso(proceso);
    }

    function obtenerUsuariosMoviles() {
        return new Promise(function (resolve) {
            setTimeout(function () {
                var lista = mockData.usuarios.filter(function (u) {
                    return u.rol === 'USUARIO';
                });
                resolve(lista.map(function (u) {
                    return { id: u.id, nombre: u.nombre, cedula: u.cedula, rol: u.rol };
                }));
            }, 200);
        });
    }

    function eliminarProceso(id) {
        var historial = obtenerHistorial();
        var nuevo = historial.filter(function (p) {
            return p.id !== id;
        });
        localStorage.setItem(HISTORIAL_KEY, JSON.stringify(nuevo));
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

        var sesion = obtenerSesion();
        var rol = sesion && sesion.usuario ? sesion.usuario.rol : '';
        var actual = paginaActual();

        var opciones = [
            {
                seccion: 'Principal',
                id: 'dashboard',
                href: '/pages/dashboard/dashboard.html',
                etiqueta: 'Dashboard',
                icono: 'dashboard'
            },
            {
                id: 'procesamiento',
                href: '/pages/procesamiento/hallazgo/hallazgo.html',
                etiqueta: 'Procesamiento',
                icono: 'documento'
            }
        ];

        if (rol === 'ADMIN') {
            opciones.push({
                id: 'historial',
                href: '/pages/historial/historial.html',
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
        mockData: mockData,
        obtenerSesion: obtenerSesion,
        crearSesion: crearSesion,
        cerrarSesion: cerrarSesion,
        guardarProceso: guardarProceso,
        obtenerProceso: obtenerProceso,
        guardarEnHistorial: guardarEnHistorial,
        obtenerHistorial: obtenerHistorial,
        obtenerProcesoPorId: obtenerProcesoPorId,
        actualizarProceso: actualizarProceso,
        guardarFase2: guardarFase2,
        obtenerUsuariosMoviles: obtenerUsuariosMoviles,
        eliminarProceso: eliminarProceso,
        iniciarLayout: iniciarLayout
    };

    iniciarLayout();
})();