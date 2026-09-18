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
    var dzModal = document.getElementById('dz-modal');
    var dzState = document.getElementById('dz-state');
    var dzStateSub = document.getElementById('dz-state-sub');
    var dzRingProgress = document.getElementById('dz-ring-progress');
    var dzDone = document.getElementById('dz-done');
    var btnVerPdf = document.getElementById('btn-ver-pdf');
    var btnCancelar = document.getElementById('btn-cancelar');
    var misHallazgos = document.getElementById('mis-hallazgos');
    var mhLista = document.getElementById('mh-lista');
    var mhVacio = document.getElementById('mh-vacio');

    var CIRCUNFERENCIA = 2 * Math.PI * 52;

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
        dzModal.hidden = true;
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
        dzRingProgress.style.strokeDashoffset = (CIRCUNFERENCIA * (1 - pct / 100)).toFixed(2) + 'px';
        if (texto) {
            dzStateSub.textContent = texto;
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

        dzState.hidden = false;
        dzDone.hidden = true;
        dzModal.hidden = false;
        dzError.hidden = true;
        btnVerPdf.disabled = true;

        actualizarProgreso(0, 'Preparando PDF...');
    }

    function completarProceso() {
        detenerProceso();
        actualizarProgreso(100, 'Documento listo');
        dzSize.textContent = 'PDF procesado correctamente';
        dzState.hidden = true;
        dzDone.hidden = false;
        btnVerPdf.disabled = false;
    }

    function cancelarCarga() {
        detenerProceso();
        dzState.hidden = false;
        dzDone.hidden = true;
        dzModal.hidden = true;
        btnVerPdf.disabled = true;
        dzError.hidden = true;
        dropzone.classList.remove('processing');
        dropzone.disabled = false;
        dzEmpty.hidden = false;
        dzFile.hidden = true;
        fileInput.value = '';
        actualizarProgreso(0, 'Preparando PDF...');
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
            actualizarProgreso(30, 'Procesando PDF...');
        });

        peticionXhr.addEventListener('load', function () {
            // Guardar respuesta y estado ANTES de detenerProceso(): detenerProceso()
            // llama a peticionXhr.abort() sobre este mismo XHR y en algunos
            // navegadores eso vacía responseText/status antes de que se lean.
            var status = this.status;
            var respuesta = typeof this.responseText === 'string' ? this.responseText : String(this.response || '');
            detenerProceso();

            var res;
            try {
                res = JSON.parse(respuesta);
            } catch (e) {
                res = null;
            }
            peticionXhr = null;

            if (status >= 400 || !res || !res.ok) {
                var motivo = (res && res.error);
                if (!motivo && !res) {
                    motivo = 'Respuesta no válida del servidor: ' + (respuesta ? respuesta.slice(0, 120) : '(vacía)');
                }
                mostrarError(motivo || 'Error al procesar el PDF.');
                return;
            }

            actualizarProgreso(95, 'Guardando en la base de datos...');
            App.guardarProceso(res).then(function () {
                setTimeout(finalizarCarga, 600);
            }).catch(function (error) {
                mostrarError(error.message || 'No se pudo guardar el proceso.');
            });
        });

        peticionXhr.addEventListener('error', function () {
            detenerProceso();
            mostrarError('No se pudo conectar con el servidor.');
        });

        peticionXhr.addEventListener('abort', function () {
            detenerProceso();
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

    function valorHallazgo(proceso, clave) {
        var h = proceso.hallazgo || {};
        var v = h[clave];
        if (v === undefined || v === null) {
            return '';
        }
        return String(v).trim();
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
        });
    }

    function crearDatoMH(etiqueta, valor, destacado) {
        var dl = document.createElement('dl');
        dl.className = 'mh-dato' + (destacado ? ' mh-dato--destacado' : '');

        var dt = document.createElement('dt');
        dt.textContent = etiqueta;

        var dd = document.createElement('dd');
        dd.textContent = valor || '—';
        if (!valor) {
            dd.className = 'muted';
        }

        dl.appendChild(dt);
        dl.appendChild(dd);
        return dl;
    }

    function estadoProceso(p) {
        if (p.confirmado) {
            return 'Completada';
        }
        if (p.fase2) {
            return 'En gestión';
        }
        return 'Pendiente móvil';
    }

    function crearTarjetaMH(p) {
        var estado = estadoProceso(p);
        var card = document.createElement('article');
        card.className = 'mh-card' + (estado === 'Completada' ? ' completada' : '');

        var header = document.createElement('div');
        header.className = 'mh-header';

        var cons = document.createElement('span');
        cons.className = 'mh-consecutivo' + (estado === 'Pendiente móvil' ? ' pendiente' : '');
        cons.textContent = '#' + p.consecutivo;

        var archivo = document.createElement('span');
        archivo.className = 'mh-archivo';
        archivo.textContent = p.nombre_archivo || 'PDF';
        archivo.title = archivo.textContent;

        var badges = document.createElement('div');
        badges.className = 'mh-badges';

        var badge = document.createElement('span');
        badge.className = 'badge ' + (estado === 'Completada' ? 'badge-green' : 'badge-orange');
        badge.textContent = estado;
        badges.appendChild(badge);

        var fecha = document.createElement('span');
        fecha.className = 'mh-fecha';
        fecha.textContent = formatearFecha(p.fecha);
        badges.appendChild(fecha);

        header.appendChild(cons);
        header.appendChild(archivo);
        header.appendChild(badges);

        var datos = document.createElement('div');
        datos.className = 'mh-datos';
        var nombreAsignado = p.asignado_a ? p.asignado_a.nombre : '';
        datos.appendChild(crearDatoMH('Quien reporta', valorHallazgo(p, 'quienReporta')));
        datos.appendChild(crearDatoMH('Vulnerabilidad', valorHallazgo(p, 'vulnerabilidadesInfraestructura')));
        datos.appendChild(crearDatoMH('Asignado a', nombreAsignado, true));
        datos.appendChild(crearDatoMH('Prioridad', valorHallazgo(p, 'prioridad')));

        var acciones = document.createElement('div');
        acciones.className = 'mh-acciones';
        var a = document.createElement('a');
        a.className = 'btn btn-primary';
        if (p.fase2 || p.confirmado) {
            a.href = '../procesamiento/resultado/resultado.html?id=' + encodeURIComponent(p.id);
            a.textContent = 'Ver resumen';
        } else {
            a.href = '../procesamiento/paso2/paso2.html?id=' + encodeURIComponent(p.id);
            a.textContent = 'Llenar ficha (Paso 2)';
        }
        acciones.appendChild(a);

        card.appendChild(header);
        card.appendChild(datos);
        card.appendChild(acciones);

        return card;
    }

    function renderMisHallazgos() {
        App.obtenerMisHallazgos().then(function (procesos) {
            mhLista.innerHTML = '';
            if (procesos.length === 0) {
                mhLista.hidden = true;
                mhVacio.hidden = false;
                return;
            }
            mhLista.hidden = false;
            mhVacio.hidden = true;
            procesos.forEach(function (p) {
                mhLista.appendChild(crearTarjetaMH(p));
            });
        });
    }

    function mostrarModoUsuario() {
        dropzone.hidden = true;
        dzError.hidden = true;
        dzModal.hidden = true;
        misHallazgos.hidden = false;
        renderMisHallazgos();
    }

    function mostrarModoAdmin() {
        misHallazgos.hidden = true;
        dropzone.hidden = false;
    }

    getEl('logout-btn').addEventListener('click', cerrarSesion);
    btnVerPdf.addEventListener('click', verPdfProcesado);
    btnCancelar.addEventListener('click', cancelarCarga);

    mostrarUsuario();
    mostrarFecha();
    configurarDropzone();

    var sesion = App.obtenerSesion();
    var rol = sesion && sesion.usuario ? sesion.usuario.rol : '';
    if (rol === 'USUARIO') {
        mostrarModoUsuario();
    } else {
        mostrarModoAdmin();
    }
})();