(function () {
    'use strict';

    var MESES = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

    var dropzone = document.getElementById('dropzone');
    var fileInput = document.getElementById('file-input');
    var dzEmpty = document.getElementById('dz-empty');
    var dzFile = document.getElementById('dz-file');
    var dzFilename = document.getElementById('dz-filename');
    var dzSize = document.getElementById('dz-size');
    var dzError = document.getElementById('dz-error');

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

        var hora = new Date().getHours();
        var saludo = 'Buen día';
        if (hora < 12) {
            saludo = 'Buenos días';
        } else if (hora < 19) {
            saludo = 'Buenas tardes';
        } else {
            saludo = 'Buenas noches';
        }
        getEl('greeting').textContent = saludo + ', ' + nombre.split(' ')[0];
    }

    function mostrarFecha() {
        var hoy = new Date();
        getEl('fecha-hoy').textContent =
            DIAS[hoy.getDay()] + ', ' + hoy.getDate() + ' de ' + MESES[hoy.getMonth()] + ' de ' + hoy.getFullYear();
    }

    function formatearTamano(bytes) {
        if (bytes < 1024) {
            return bytes + ' B';
        }
        if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(1) + ' KB';
        }
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    function mostrarArchivo(archivo) {
        dzError.hidden = true;
        dzEmpty.hidden = true;
        dzFile.hidden = false;
        dzFilename.textContent = archivo.name;
        var tipo = archivo.type || 'application/pdf';
        dzSize.textContent = formatearTamano(archivo.size) + ' · ' + tipo;
    }

    function mostrarError(mensaje) {
        dzFile.hidden = true;
        dzEmpty.hidden = false;
        dzError.textContent = mensaje;
        dzError.hidden = false;
    }

    function manejarArchivo(archivo) {
        if (!archivo) {
            return;
        }
        if (!/\.pdf$/i.test(archivo.name)) {
            mostrarError('Solo se permiten archivos PDF.');
            return;
        }
        mostrarArchivo(archivo);
    }

    function configurarDropzone() {
        dropzone.addEventListener('click', function () {
            fileInput.click();
        });

        dropzone.addEventListener('keydown', function (evt) {
            if (evt.key === 'Enter' || evt.key === ' ') {
                evt.preventDefault();
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', function () {
            manejarArchivo(fileInput.files[0]);
        });

        ['dragenter', 'dragover'].forEach(function (tipo) {
            dropzone.addEventListener(tipo, function (evt) {
                evt.preventDefault();
                dropzone.classList.add('dragging');
            });
        });

        ['dragleave', 'drop'].forEach(function (tipo) {
            dropzone.addEventListener(tipo, function (evt) {
                evt.preventDefault();
                dropzone.classList.remove('dragging');
            });
        });

        dropzone.addEventListener('drop', function (evt) {
            manejarArchivo(evt.dataTransfer.files[0]);
        });

        document.addEventListener('dragover', function (evt) {
            evt.preventDefault();
        });

        document.addEventListener('drop', function (evt) {
            evt.preventDefault();
        });
    }

    function cerrarSesion() {
        App.cerrarSesion();
        window.location.href = '../auth/login.html';
    }

    getEl('logout-btn').addEventListener('click', cerrarSesion);

    mostrarUsuario();
    mostrarFecha();
    configurarDropzone();
})();