(function () {
    'use strict';

    var form = document.getElementById('paso2-form');
    var alertBox = document.getElementById('paso2-alert');
    var submitBtn = document.getElementById('paso2-btn');

    var photoEmpty = document.getElementById('photo-empty');
    var photoPreview = document.getElementById('photo-preview');
    var photoPreviewImg = document.getElementById('photo-preview-img');
    var btnTomarFoto = document.getElementById('btn-tomar-foto');
    var btnSubirFoto = document.getElementById('btn-subir-foto');
    var btnEliminarFoto = document.getElementById('btn-eliminar-foto');
    var inputCamera = document.getElementById('input-camera');
    var inputFile = document.getElementById('input-file');
    var fotoError = document.getElementById('foto-error');

    var archivoFoto = null;
    var procesoId = null;

    function obtenerProcesoActual() {
        var params = new URLSearchParams(window.location.search);
        var id = params.get('id');
        var promesa = id ? App.obtenerProcesoPorId(id) : App.obtenerProceso();
        return promesa.then(function (proceso) {
            if (proceso && proceso.id) {
                procesoId = proceso.id;
            }
            return proceso;
        });
    }

    var campos = [
        { input: document.getElementById('supervisor'), error: document.getElementById('supervisor-error'), label: 'Supervisor', requerido: true },
        { input: document.getElementById('wo'), error: document.getElementById('wo-error'), label: 'WO Vulnerabilidad', requerido: true },
        { input: document.getElementById('tecnico'), error: document.getElementById('tecnico-error'), label: 'Técnico Móvil', requerido: true },
        { input: document.getElementById('estado'), error: document.getElementById('estado-error'), label: 'Estado V', requerido: true }
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

    function mostrarErrorFoto(mensaje) {
        fotoError.textContent = mensaje;
        fotoError.hidden = false;
    }

    function limpiarErrorFoto() {
        fotoError.hidden = true;
        fotoError.textContent = '';
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

        if (!archivoFoto) {
            mostrarErrorFoto('La evidencia fotográfica es obligatoria.');
            valido = false;
        } else {
            limpiarErrorFoto();
        }

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

    function generarMiniatura(dataUrl, max) {
        return new Promise(function (resolve) {
            var img = new Image();
            img.onload = function () {
                var escala = Math.min(1, max / Math.max(img.width, img.height));
                var w = Math.max(1, Math.round(img.width * escala));
                var h = Math.max(1, Math.round(img.height * escala));
                var canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.72));
            };
            img.onerror = function () {
                resolve(dataUrl);
            };
            img.src = dataUrl;
        });
    }

    function manejarFoto(archivo) {
        if (!archivo) {
            return;
        }

        if (!archivo.type.startsWith('image/')) {
            mostrarErrorFoto('Solo se permiten archivos de imagen.');
            return;
        }

        limpiarErrorFoto();
        archivoFoto = archivo;

        var reader = new FileReader();
        reader.onload = function (e) {
            archivoFoto.fotoData = e.target.result;
            photoPreviewImg.src = e.target.result;
            photoEmpty.hidden = true;
            photoPreview.hidden = false;
            generarMiniatura(e.target.result, 480).then(function (mini) {
                archivoFoto.fotoData = mini;
            });
        };
        reader.readAsDataURL(archivo);
    }

    function eliminarFoto() {
        archivoFoto = null;
        photoPreviewImg.src = '';
        photoPreview.hidden = true;
        photoEmpty.hidden = false;
        inputCamera.value = '';
        inputFile.value = '';
        limpiarErrorFoto();
    }

    function guardar() {
        var promesaAnterior = procesoId ? App.obtenerProcesoPorId(procesoId) : Promise.resolve(null);

        return promesaAnterior.then(function (proc) {
            var anterior = proc && proc.fase2 ? proc.fase2 : null;
            var fotoData = archivoFoto && archivoFoto.fotoData
                ? archivoFoto.fotoData
                : (anterior && anterior.fotoData) || '';
            var datos = {
                supervisor: getEl('supervisor').value.trim(),
                wo: getEl('wo').value.trim(),
                tecnico: getEl('tecnico').value.trim(),
                observaciones: getEl('observaciones').value.trim(),
                estadoV: getEl('estado').value,
                foto: !!archivoFoto || !!(anterior && anterior.foto),
                fotoData: fotoData
            };
            if (!procesoId) {
                return datos;
            }
            return App.guardarFase2(procesoId, datos).then(function () {
                return datos;
            });
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
            var destino = '../resultado/resultado.html';
            if (procesoId) {
                destino += '?id=' + encodeURIComponent(procesoId);
            }
            window.location.href = destino;
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

    function precargarFase2(proceso) {
        if (!proceso || !proceso.fase2) {
            return;
        }

        getEl('paso2-edit-note').hidden = false;
        var btnTxt = document.querySelector('#paso2-btn .span');
        if (btnTxt) {
            btnTxt.textContent = 'Guardar cambios';
        }
        var f2 = proceso.fase2;
        if (f2.supervisor) {
            getEl('supervisor').value = f2.supervisor;
        }
        if (f2.wo) {
            getEl('wo').value = f2.wo;
        }
        if (f2.tecnico) {
            getEl('tecnico').value = f2.tecnico;
        }
        if (f2.estadoV) {
            getEl('estado').value = f2.estadoV;
        }
        if (f2.observaciones) {
            getEl('observaciones').value = f2.observaciones;
        }
        if (f2.foto) {
            archivoFoto = {};
        }
    }

    function cerrarSesion() {
        App.cerrarSesion();
        window.location.href = '../../auth/login.html';
    }

    btnTomarFoto.addEventListener('click', function () {
        inputCamera.click();
    });

    btnSubirFoto.addEventListener('click', function () {
        inputFile.click();
    });

    inputCamera.addEventListener('change', function () {
        manejarFoto(inputCamera.files[0]);
    });

    inputFile.addEventListener('change', function () {
        manejarFoto(inputFile.files[0]);
    });

    btnEliminarFoto.addEventListener('click', eliminarFoto);

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
    obtenerProcesoActual().then(precargarFase2);
})();
