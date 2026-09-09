(function () {
    'use strict';

    var SESSION_KEY = 'autn_sesion';
    var PROCESO_KEY = 'autn_proceso_actual';

    var mockData = {
        usuarios: [],
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

    function guardarProceso(proceso) {
        sessionStorage.setItem(PROCESO_KEY, JSON.stringify(proceso));
    }

    function obtenerProceso() {
        var raw = sessionStorage.getItem(PROCESO_KEY);
        return raw ? JSON.parse(raw) : null;
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
        iniciarLayout: iniciarLayout
    };

    iniciarLayout();
})();