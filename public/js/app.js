(function () {
    'use strict';

    var SESSION_KEY = 'autn_sesion';

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

    window.App = {
        mockData: mockData,
        obtenerSesion: obtenerSesion,
        crearSesion: crearSesion,
        cerrarSesion: cerrarSesion
    };
})();