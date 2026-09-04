(function () {
    'use strict';

    var form = document.getElementById('paso2-form');
    var alertBox = document.getElementById('paso2-alert');
    var submitBtn = document.getElementById('paso2-btn');

    var campos = [
        { input: document.getElementById('supervisor'), error: document.getElementById('supervisor-error'), label: 'Supervisor', requerido: true },
        { input: document.getElementById('wo'), error: document.getElementById('wo-error'), label: 'WO Vulnerabilidad', requerido: true },
        { input: document.getElementById('tecnico'), error: document.getElementById('tecnico-error'), label: 'Técnico Móvil', requerido: true },
        { input: document.getElementById('estado'), error: document.getElementById('estado-error'), label: 'Estado V', requerido: true },
        { input: document.getElementById('link-rf'), error: document.getElementById('link-error'), label: 'Link RF Finalizado Vulnerabilidad', requerido: false }
    ];

    function getEl(id) {
        return document.getElementById(id);
    }

    function esCampoVacio(el) {
        if (el.tagName === 'SELECT') {
            return el.value === '';
        }
        return el.value.trim() === '';
    }

    function mostrarError(campo, mensaje) {
        campo.input.classList.add('has-error');
        campo.error.textContent = mensaje;
        campo.error.hidden = false;
    }

    function limpiarError(campo) {
        campo.input.classList.remove('has-error');
        campo.error.hidden = true;
        campo.error.textContent = '';
    }

    function validar() {
        var valido = true;

        campos.forEach(function (campo) {
            if (!campo.requerido) {
                limpiarError(campo);
                return;
            }
            if (esCampoVacio(campo.input)) {
                mostrarError(campo, campo.label + ' es obligatorio.');
                valido = false;
            } else {
                limpiarError(campo);
            }
        });

        return valido;
    }

    function mostrarAlert(tipo, mensaje) {
        alertBox.className = 'alert alert-' + tipo;
        alertBox.textContent = mensaje;
        alertBox.hidden = false;
    }

    function ocultarAlert() {
        alertBox.hidden = true;
        alertBox.textContent = '';
        alertBox.className = 'alert';
    }

    function guardar() {
        return new Promise(function (resolve) {
            setTimeout(function () {
                var datos = {
                    supervisor: getEl('supervisor').value.trim(),
                    wo: getEl('wo').value.trim(),
                    tecnico: getEl('tecnico').value.trim(),
                    observaciones: getEl('observaciones').value.trim(),
                    linkRf: getEl('link-rf').value.trim(),
                    estadoV: getEl('estado').value
                };
                resolve(datos);
            }, 400);
        });
    }

    function manejarEnvio(evt) {
        evt.preventDefault();
        ocultarAlert();

        if (!validar()) {
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        guardar().then(function () {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar';
            mostrarAlert('success', 'Datos guardados correctamente.');
        });
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

    function cerrarSesion() {
        App.cerrarSesion();
        window.location.href = '../auth/login.html';
    }

    form.addEventListener('submit', manejarEnvio);

    campos.forEach(function (campo) {
        campo.input.addEventListener('input', function () {
            if (!esCampoVacio(campo.input)) {
                limpiarError(campo);
            }
        });
    });

    getEl('logout-btn').addEventListener('click', cerrarSesion);

    mostrarUsuario();
})();