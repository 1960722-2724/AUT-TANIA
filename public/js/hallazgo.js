(function () {
    'use strict';

    var alertBox = document.getElementById('hallazgo-alert');
    var body = document.getElementById('hallazgo-body');
    var contBtn = document.getElementById('btn-continuar');

    var secciones = [
        {
            grid: document.getElementById('identificacion-grid'),
            campos: [
                { clave: 'quienReporta', etiqueta: 'Quien reporta' },
                { clave: 'fechaHora', etiqueta: 'Fecha y hora' },
                { clave: 'aliado', etiqueta: 'Aliado' },
                { clave: 'regional', etiqueta: 'Regional' },
                { clave: 'departamento', etiqueta: 'Departamento' },
                { clave: 'municipio', etiqueta: 'Municipio' },
                { clave: 'barrio', etiqueta: 'Barrio' }
            ]
        },
        {
            grid: document.getElementById('ubicacion-grid'),
            campos: [
                { clave: 'direccion', etiqueta: 'Dirección', ancho: 'field-full' },
                { clave: 'puntoReferencia', etiqueta: 'Punto de referencia' },
                { clave: 'coordenadas', etiqueta: 'Coordenadas', mono: true }
            ]
        },
        {
            grid: document.getElementById('infraestructura-grid'),
            campos: [
                { clave: 'duenoInfraestructura', etiqueta: 'Dueño de infraestructura' },
                { clave: 'codigoPacvi', etiqueta: 'Código PACVI' },
                { clave: 'vulnerabilidadesInfraestructura', etiqueta: 'Vulnerabilidades de infraestructura', ancho: 'field-full' },
                { clave: 'estadoInfraestructura', etiqueta: 'Nivel de deterioro de la estructura', destacado: true, ancho: 'field-full' },
                { clave: 'vulnerabilidad', etiqueta: 'Vulnerabilidad red propia', destacado: true },
                { clave: 'asociarOT', etiqueta: 'Asociar OT' },
                { clave: 'prioridad', etiqueta: 'Prioridad', ancho: 'field-full' }
            ]
        }
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

    function valorCampo(hallazgo, clave) {
        if (!hallazgo || hallazgo[clave] === undefined || hallazgo[clave] === null) {
            return null;
        }
        var valor = String(hallazgo[clave]).trim();
        return valor === '' ? null : valor;
    }

    function crearCampo(campo, valor) {
        var wrapper = document.createElement('div');
        wrapper.className = 'hallazgo-field';
        if (campo.ancho) {
            wrapper.classList.add(campo.ancho);
        }
        if (campo.destacado) {
            wrapper.classList.add('hallazgo-destacado');
        }

        var dt = document.createElement('dt');
        dt.textContent = campo.etiqueta;

        var dd = document.createElement('dd');
        if (campo.mono) {
            dd.className = 'hallazgo-mono';
        }

        if (valor === null) {
            dd.className = (dd.className ? dd.className + ' ' : '') + 'value-empty';
            dd.textContent = '—';
        } else {
            dd.innerHTML = escapar(valor);
        }

        wrapper.appendChild(dt);
        wrapper.appendChild(dd);
        return wrapper;
    }

    function renderResumen(proceso) {
        var original = proceso.archivo_original || proceso.archivo || '—';
        var paginas = proceso.paginas || 0;

        getEl('sum-archivo').textContent = original;
        getEl('sum-paginas').textContent = paginas + (paginas === 1 ? ' página' : ' páginas');
        getEl('sum-procesamiento').textContent = proceso.escaneado ? 'OCR' : 'Texto';

        var registro = proceso.registro;
        getEl('sum-registro').textContent = registro && registro.page
            ? 'Página ' + registro.page
            : 'No detectada';

        if (proceso.escaneado) {
            getEl('badge-ocr').hidden = false;
        }
    }

    function renderSecciones(proceso) {
        var hallazgo = proceso.hallazgo || {};

        secciones.forEach(function (seccion) {
            var grid = seccion.grid;
            grid.innerHTML = '';

            seccion.campos.forEach(function (campo) {
                var valor = valorCampo(hallazgo, campo.clave);
                grid.appendChild(crearCampo(campo, valor));
            });
        });

        var obs = valorCampo(hallazgo, 'observaciones');
        var obsEl = getEl('hallazgo-observaciones');
        if (obs === null) {
            obsEl.className = 'hallazgo-observaciones value-empty';
            obsEl.textContent = '—';
        } else {
            obsEl.className = 'hallazgo-observaciones';
            obsEl.innerHTML = escapar(obs);
        }
    }

    function renderEvidencia(proceso) {
        var img = proceso.imagen || null;
        var foto = getEl('foto-evidencia');
        var frame = getEl('foto-frame');
        var vacio = getEl('foto-vacio');

        if (img && img.url) {
            foto.src = img.url;
            frame.hidden = false;
            vacio.hidden = true;
        } else {
            frame.hidden = true;
            vacio.hidden = false;
        }
    }

    function inicializar() {
        var proceso = App.obtenerProceso();

        if (!proceso) {
            mostrarAlert('error', 'No hay un proceso activo. Vuelve al Dashboard y sube un PDF.');
            contBtn.disabled = true;
            return;
        }

        renderResumen(proceso);
        renderSecciones(proceso);
        renderEvidencia(proceso);

        body.hidden = false;

        contBtn.addEventListener('click', function () {
            window.location.href = '../paso2/paso2.html';
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