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
    var dzStatus = document.getElementById('dz-status');
    var dzProgressWrap = document.getElementById('dz-progress-wrap');
    var dzProgressFill = document.getElementById('dz-progress-fill');
    var dzProgressPct = document.getElementById('dz-progress-pct');
    var dzProgressLabel = document.getElementById('dz-progress-label');
    var dzDone = document.getElementById('dz-done');
    var btnVerPdf = document.getElementById('btn-ver-pdf');

    var peticionXhr = null;
    var intervaloProceso = null;
    var progresoActual = 0;

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
        detenerProceso();
        dzFile.hidden = true;
        dzEmpty.hidden = false;
        dzStatus.hidden = true;
        dropzone.classList.remove('processing');
        dropzone.disabled = false;
        dzError.textContent = mensaje;
        dzError.hidden = false;
    }

    function detenerProceso() {
        if (peticionXhr !== null) {
            peticionXhr.abort();
            peticionXhr = null;
        }
        if (intervaloProceso !== null) {
            clearInterval(intervaloProceso);
            intervaloProceso = null;
        }
    }

    function actualizarProgreso(pct, texto) {
        if (pct < progresoActual) {
            pct = progresoActual;
        }
        if (pct > 100) {
            pct = 100;
        }
        progresoActual = pct;
        dzProgressFill.style.width = pct + '%';
        dzProgressPct.textContent = pct + '%';
        if (texto) {
            dzProgressLabel.textContent = texto;
        }
    }

    function consultarProgreso(token) {
        fetch('../../api/tmp/progreso_' + token + '.json', { cache: 'no-store' })
            .then(function (resp) {
                return resp.text();
            })
            .then(function (texto) {
                var data;
                try {
                    data = JSON.parse(texto);
                } catch (e) {
                    data = null;
                }
                if (data && typeof data.pct === 'number') {
                    actualizarProgreso(data.pct, data.texto || 'Procesando PDF...');
                }
            })
            .catch(function () { });
    }

    function iniciarProgreso() {
        peticionXhr = null;
        intervaloProceso = null;
        progresoActual = 0;

        dzProgressWrap.hidden = false;
        dzDone.hidden = true;
        dzStatus.hidden = false;
        dzError.hidden = true;
        btnVerPdf.disabled = true;

        actualizarProgreso(0, 'Subiendo archivo...');
    }

    function completarProceso() {
        detenerProceso();
        actualizarProgreso(100, 'Documento procesado correctamente.');
        dzProgressWrap.hidden = true;
        dzDone.hidden = false;
        btnVerPdf.disabled = false;
    }

    function finalizarCarga() {
        completarProceso();
    }

    function subirArchivo(archivo) {
        var formData = new FormData();
        formData.append('archivo', archivo);

        var token = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        formData.append('progreso', token);

        dropzone.classList.add('processing');
        dzSize.textContent = 'Procesando PDF...';
        iniciarProgreso();

        peticionXhr = new XMLHttpRequest();
        peticionXhr.open('POST', '../../api/pdf/subir.php');
        peticionXhr.responseType = 'text';

        peticionXhr.upload.addEventListener('progress', function (evt) {
            if (!evt.lengthComputable) {
                return;
            }
            var pct = Math.round((evt.loaded / evt.total) * 30);
            actualizarProgreso(pct, 'Subiendo archivo...');
        });

        peticionXhr.upload.addEventListener('load', function () {
            actualizarProgreso(30, 'Documento subido. Procesando...');
        });

        peticionXhr.addEventListener('load', function () {
            var respuesta = typeof this.responseText === 'string' ? this.responseText : String(this.response || '');
            var res;
            try {
                res = JSON.parse(respuesta);
            } catch (e) {
                res = null;
            }
            peticionXhr = null;

            if (this.status >= 400 || !res || !res.ok) {
                mostrarError((res && res.error) || 'Error al procesar el PDF.');
                return;
            }

            actualizarProgreso(95, 'Documento procesado. Finalizando...');
            App.guardarProceso(res);
            setTimeout(finalizarCarga, 600);
        });

        peticionXhr.addEventListener('error', function () {
            peticionXhr = null;
            mostrarError('No se pudo conectar con el servidor.');
        });

        peticionXhr.addEventListener('abort', function () {
            peticionXhr = null;
        });

        peticionXhr.send(formData);
        intervaloProceso = setInterval(function () {
            consultarProgreso(token);
        }, 600);
    }

    function verPdfProcesado() {
        if (btnVerPdf.disabled) {
            return;
        }
        window.location.href = '../procesamiento/hallazgo/hallazgo.html';
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
        subirArchivo(archivo);
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
    btnVerPdf.addEventListener('click', verPdfProcesado);

    mostrarUsuario();
    mostrarFecha();
    configurarDropzone();
})();