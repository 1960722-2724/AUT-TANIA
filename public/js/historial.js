(function () {
    'use strict';

    var alertBox = document.getElementById('historial-alert');
    var tabla = document.getElementById('historial-table');
    var cuerpo = document.getElementById('historial-body');
    var vacio = document.getElementById('historial-vacio');

    function getEl(id) {
        return document.getElementById(id);
    }

    function iniciales(nombre) {
        if (!nombre) {
            return 'U';
        }
        return nombre.trim().split(/\s+/).map(function (p) {
            return p.charAt(0);
        }).slice(0, 2).join('').toUpperCase();
    }

    function mostrarUsuario() {
        var sesion = App.obtenerSesion();
        var nombre = sesion && sesion.usuario ? sesion.usuario.nombre : 'Invitado';
        var rol = sesion && sesion.usuario ? sesion.usuario.rol : '';

        getEl('user-name').textContent = nombre;
        getEl('user-rol').textContent = rol;
        getEl('user-avatar').textContent = iniciales(nombre);
    }

    function mostrarAlert(tipo, mensaje) {
        alertBox.className = 'alert alert-' + tipo;
        alertBox.textContent = mensaje;
        alertBox.hidden = false;
    }

    function escapar(texto) {
        var div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }

    function formatearFecha(iso) {
        var d = new Date(iso);
        if (isNaN(d.getTime())) {
            return '—';
        }
        return d.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }) + ' · ' + d.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function badgeEstado(estado) {
        var clase = estado === 'error' ? 'badge badge-orange' : 'badge badge-blue';
        return '<span class="' + clase + '">' + escapar(estado || 'procesado') + '</span>';
    }

    function crearFila(proceso) {
        var tr = document.createElement('tr');

        var hallazgo = proceso.hallazgo || {};
        var municipio = hallazgo.municipio || '—';

        var tdFecha = document.createElement('td');
        tdFecha.textContent = formatearFecha(proceso.fecha);
        tdFecha.className = 'cell-fecha';

        var tdArchivo = document.createElement('td');
        tdArchivo.textContent = proceso.nombre_archivo || '—';
        tdArchivo.className = 'cell-archivo';
        tdArchivo.title = tdArchivo.textContent;

        var tdMunicipio = document.createElement('td');
        tdMunicipio.textContent = municipio;

        var tdEstado = document.createElement('td');
        tdEstado.innerHTML = badgeEstado(proceso.estado);

        var tdAcciones = document.createElement('td');
        var a = document.createElement('a');
        a.className = 'btn-ver-orden';
        a.href = '../procesamiento/hallazgo/hallazgo.html?id=' + encodeURIComponent(proceso.id);
        a.textContent = 'Ver';
        tdAcciones.appendChild(a);

        tr.appendChild(tdFecha);
        tr.appendChild(tdArchivo);
        tr.appendChild(tdMunicipio);
        tr.appendChild(tdEstado);
        tr.appendChild(tdAcciones);

        return tr;
    }

    function render() {
        var procesos = App.obtenerHistorial();

        if (procesos.length === 0) {
            tabla.hidden = true;
            vacio.hidden = false;
            return;
        }

        tabla.hidden = false;
        vacio.hidden = true;
        cuerpo.innerHTML = '';

        procesos.forEach(function (proceso) {
            cuerpo.appendChild(crearFila(proceso));
        });
    }

    function inicializar() {
        var sesion = App.obtenerSesion();
        var rol = sesion && sesion.usuario ? sesion.usuario.rol : '';

        if (rol !== 'ADMIN') {
            mostrarAlert('error', 'Solo el perfil Administrador puede consultar el historial.');
            window.location.href = '../dashboard/dashboard.html';
            return;
        }

        render();
    }

    function cerrarSesion() {
        App.cerrarSesion();
        window.location.href = '../auth/login.html';
    }

    getEl('logout-btn').addEventListener('click', cerrarSesion);

    mostrarUsuario();
    inicializar();
})();