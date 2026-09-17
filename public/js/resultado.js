(function () {
    'use strict';

    var alertBox = document.getElementById('resultado-alert');
    var body = document.getElementById('resultado-body');
    var btnGuardar = document.getElementById('btn-guardar');
    var guardarModal = document.getElementById('guardar-modal');
    var btnGuardarClose = document.getElementById('btn-guardar-close');
    var btnVolverInicio = document.getElementById('btn-volver-inicio');
    var modalTitulo = document.getElementById('guardar-modal-title');
    var modalTexto = document.getElementById('guardar-modal-text');

    var ambitoFase1 = [
        { clave: 'quienReporta', etiqueta: 'Quien reporta' },
        { clave: 'fechaHora', etiqueta: 'Fecha y hora del hallazgo' },
        { clave: 'direccion', etiqueta: 'Dirección', ancho: 'field-full' },
        { clave: 'municipio', etiqueta: 'Municipio' },
        { clave: 'prioridad', etiqueta: 'Prioridad' },
        { clave: 'vulnerabilidadesInfraestructura', etiqueta: 'Vulnerabilidades de infraestructura', ancho: 'field-full' },
        { clave: 'estadoInfraestructura', etiqueta: 'Nivel de deterioro de la estructura', destacado: true, ancho: 'field-full' }
    ];

    var ambitoFase2 = [
        { clave: 'tecnico', etiqueta: 'Técnico que resuelve' },
        { clave: 'supervisor', etiqueta: 'Supervisor' },
        { clave: 'wo', etiqueta: 'WO Vulnerabilidad' },
        { clave: 'estadoV', etiqueta: 'Estado V' },
        { clave: 'observaciones', etiqueta: 'Observaciones', ancho: 'field-full' }
    ];

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

    function escapar(texto) {
        var div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }

    function mostrarAlert(tipo, mensaje) {
        alertBox.className = 'alert alert-' + tipo;
        alertBox.textContent = mensaje;
        alertBox.hidden = false;
    }

    function valorCampo(origen, clave) {
        if (!origen || origen[clave] === undefined || origen[clave] === null) {
            return null;
        }
        var valor = String(origen[clave]).trim();
        return valor === '' ? null : valor;
    }

    function crearCampo(campo, valor) {
        var wrapper = document.createElement('div');
        wrapper.className = 'resumen-field';
        if (campo.ancho) {
            wrapper.classList.add(campo.ancho);
        }
        if (campo.destacado) {
            wrapper.classList.add('resumen-destacado');
        }

        var dt = document.createElement('dt');
        dt.textContent = campo.etiqueta;

        var dd = document.createElement('dd');
        if (valor === null) {
            dd.className = 'value-empty';
            dd.textContent = '—';
        } else {
            dd.innerHTML = escapar(valor);
        }

        wrapper.appendChild(dt);
        wrapper.appendChild(dd);
        return wrapper;
    }

    function renderGrid(grid, campos, origen) {
        grid.innerHTML = '';
        campos.forEach(function (campo) {
            grid.appendChild(crearCampo(campo, valorCampo(origen, campo.clave)));
        });
    }

    function renderResumen(proceso) {
        var hallazgo = proceso.hallazgo || {};
        var f2 = proceso.fase2 || {};
        var estado = proceso.confirmado ? 'Completada' : 'En gestión';

        App.renderDatosPrimarios(getEl('datos-primarios'), proceso);
        App.renderChipsProcesamiento(getEl('datos-procesamiento'), proceso);

        var badgeEstado = getEl('resumen-estado-badge');
        badgeEstado.textContent = estado;
        badgeEstado.className = 'badge ' + (proceso.confirmado ? 'badge-green' : 'badge-orange');

        renderGrid(getEl('fase1-grid'), ambitoFase1, hallazgo);
        renderGrid(getEl('fase2-grid'), ambitoFase2, f2);

        var pdfImg = proceso.imagen && proceso.imagen.url;
        var movilImg = f2.fotoData;

        if (pdfImg) {
            getEl('pdf-foto').src = pdfImg;
            getEl('pdf-foto-frame').hidden = false;
        }
        if (movilImg) {
            getEl('movil-foto').src = movilImg;
            getEl('movil-foto-frame').hidden = false;
        }
        if (!pdfImg && !movilImg) {
            getEl('evidencia-vacio').hidden = false;
        }
    }

    function abrirModal() {
        guardarModal.hidden = false;
        document.body.classList.add('modal-open');
    }

    function cerrarModal() {
        guardarModal.hidden = true;
        document.body.classList.remove('modal-open');
    }

    function inicializar() {
        var params = new URLSearchParams(window.location.search);
        var id = params.get('id');
        var promesa = id ? App.obtenerProcesoPorId(id) : App.obtenerProceso();

        promesa.then(function (proceso) {
            if (!proceso) {
                mostrarAlert('error', id ? 'No se encontró la orden solicitada.' : 'No hay una orden activa. Vuelve a Mis hallazgos.');
                body.hidden = true;
                btnGuardar.disabled = true;
                return;
            }

            var sesion = App.obtenerSesion();
            var esAdmin = sesion && sesion.usuario && sesion.usuario.rol === 'ADMIN';

            if (esAdmin && !App.exigirAsignacion(proceso, id)) {
                body.hidden = true;
                return;
            }

            modalTitulo.textContent = esAdmin ? 'Orden completada' : 'Hallazgo guardado';
            modalTexto.textContent = esAdmin
                ? 'La orden se marcó como completada y quedó registrada en el historial.'
                : 'La orden se completó correctamente y quedó disponible para el administrador.';

            function mostrarModalCompletada() {
                abrirModal();
            }

            function continuarDesdeModal() {
                window.location.href = '../../dashboard/dashboard.html';
            }

            if (!proceso.fase2 && !esAdmin) {
                window.location.href = id ? '../paso2/paso2.html?id=' + encodeURIComponent(id) : '../paso2/paso2.html';
                return;
            }

            if (esAdmin && !proceso.fase2) {
                btnGuardar.hidden = true;
            } else if (proceso.confirmado) {
                btnGuardar.querySelector('.span').textContent = 'Completada';
            }

            renderResumen(proceso);
            body.hidden = false;

            btnGuardar.addEventListener('click', function () {
                if (proceso.confirmado) {
                    mostrarModalCompletada();
                    return;
                }
                btnGuardar.disabled = true;
                btnGuardar.querySelector('.span').textContent = 'Guardando...';
                App.confirmarProceso(proceso).then(function (actualizado) {
                    proceso = actualizado;
                    btnGuardar.disabled = true;
                    btnGuardar.querySelector('.span').textContent = 'Completada';
                    mostrarModalCompletada();
                }).catch(function (error) {
                    btnGuardar.disabled = false;
                    btnGuardar.querySelector('.span').textContent = 'Guardar y completar';
                    mostrarAlert('error', error.message || 'No se pudo guardar la orden.');
                });
            });

            btnVolverInicio.addEventListener('click', continuarDesdeModal);
            btnGuardarClose.addEventListener('click', cerrarModal);
            guardarModal.addEventListener('click', function (evt) {
                if (evt.target === guardarModal) {
                    cerrarModal();
                }
            });
            document.addEventListener('keydown', function (evt) {
                if (evt.key === 'Escape' && !guardarModal.hidden) {
                    cerrarModal();
                }
            });
        });
    }

    function cerrarSesion() {
        App.cerrarSesion();
        window.location.href = '../../auth/login.html';
    }

    getEl('logout-btn').addEventListener('click', cerrarSesion);

    mostrarUsuario();
    inicializar();
})();