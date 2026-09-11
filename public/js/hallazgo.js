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

    var usuariosMoviles = [];
    var usuarioSeleccionado = null;

    var assignCard = document.getElementById('assign-card');
    var assignInput = document.getElementById('asignar-usuario');
    var assignSugerencias = document.getElementById('assign-sugerencias');
    var assignVacio = document.getElementById('assign-vacio');
    var assignSeleccion = document.getElementById('assign-seleccion');
    var assignAvatar = document.getElementById('assign-avatar');
    var assignNombre = document.getElementById('assign-nombre');
    var assignCedula = document.getElementById('assign-cedula');
    var btnQuitar = document.getElementById('btn-quitar-asignacion');
    var asignarError = document.getElementById('asignar-error');

    function normalizar(texto) {
        return String(texto || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function levenshtein(a, b) {
        var m = a.length;
        var n = b.length;
        if (m === 0) { return n; }
        if (n === 0) { return m; }
        var fila = [];
        var i, j, costo, diag, viejo;
        for (j = 0; j <= n; j++) { fila[j] = j; }
        for (i = 1; i <= m; i++) {
            diag = fila[0];
            fila[0] = i;
            for (j = 1; j <= n; j++) {
                viejo = fila[j];
                costo = a[i - 1] === b[j - 1] ? 0 : 1;
                fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, diag + costo);
                diag = viejo;
            }
        }
        return fila[n];
    }

    function puntuar(consulta, texto) {
        if (!consulta) { return 0; }
        var normC = normalizar(consulta);
        var normT = normalizar(texto);
        var tokens = normT.split(' ');
        var score = 0;

        for (var i = 0; i < tokens.length; i++) {
            if (tokens[i] === normC || tokens[i] === normC.charAt(0)) {
                score = Math.max(score, 0.95);
            }
            if (tokens[i].indexOf(normC) === 0) {
                score = Math.max(score, 0.85 + 0.1 * (normC.length / tokens[i].length));
            }
            if (normT.indexOf(normC) === 0) {
                score = Math.max(score, 0.9);
            }
        }

        var dist = levenshtein(normalizar(normT), normalizar(normC));
        var maxLen = Math.max(normalizar(normT).length, normalizar(normC).length);
        var levScore = maxLen > 0 ? 1 - dist / maxLen : 0;
        score = Math.max(score, levScore);

        return score;
    }

    function buscarUsuarios(consulta) {
        if (!consulta || !consulta.trim()) {
            return [];
        }

        var resultados = [];
        usuariosMoviles.forEach(function (u) {
            var scoreNombre = puntuar(consulta, u.nombre);
            var scoreCedula = puntuar(consulta, u.cedula);
            var score = Math.max(scoreNombre, scoreCedula);
            if (score >= 0.4) {
                resultados.push({ usuario: u, score: score });
            }
        });

        resultados.sort(function (a, b) { return b.score - a.score; });
        return resultados.slice(0, 5).map(function (r) { return r.usuario; });
    }

    function escaparHtml(texto) {
        var div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }

    function inicialesShort(nombre) {
        if (!nombre) { return '?'; }
        return nombre.trim().split(/\s+/).map(function (p) {
            return p.charAt(0);
        }).slice(0, 2).join('').toUpperCase();
    }

    function renderSugerencias(lista) {
        assignSugerencias.innerHTML = '';

        if (lista.length === 0) {
            assignSugerencias.hidden = true;
            assignVacio.hidden = false;
            return;
        }

        assignVacio.hidden = true;
        assignSugerencias.hidden = false;

        lista.forEach(function (u) {
            var li = document.createElement('li');
            li.className = 'assign-item';
            li.setAttribute('data-id', u.id);
            li.innerHTML =
                '<span class="assign-item-avatar">' + inicialesShort(u.nombre) + '</span>' +
                '<div class="assign-item-meta">' +
                    '<span class="assign-item-nombre">' + escaparHtml(u.nombre) + '</span>' +
                    '<span class="assign-item-cedula">' + escaparHtml(u.cedula) + '</span>' +
                '</div>';
            li.addEventListener('click', function () {
                seleccionarUsuario(u);
            });
            assignSugerencias.appendChild(li);
        });
    }

    function seleccionarUsuario(u, proceso) {
        usuarioSeleccionado = u;
        assignInput.value = '';
        assignSugerencias.hidden = true;
        assignVacio.hidden = true;
        assignSeleccion.hidden = false;
        assignNombre.textContent = u.nombre;
        assignCedula.textContent = 'C.C. ' + u.cedula;
        assignAvatar.textContent = inicialesShort(u.nombre);
        asignarError.hidden = true;
        persistirAsignacion(proceso, u);
    }

    function quitarSeleccion(proceso) {
        usuarioSeleccionado = null;
        assignSeleccion.hidden = true;
        assignInput.value = '';
        persistirAsignacion(proceso, null);
    }

    function persistirAsignacion(proceso, usuario) {
        if (!proceso) { return; }
        if (usuario) {
            proceso.asignado_a = { id: usuario.id, nombre: usuario.nombre, cedula: usuario.cedula };
        } else {
            delete proceso.asignado_a;
        }
        App.actualizarProceso(proceso);
    }

    function cargarAsignacion(proceso) {
        if (!proceso || !proceso.asignado_a) { return; }
        var u = proceso.asignado_a;
        seleccionarUsuario(u, proceso);
    }

    function inicializarAsignacion(proceso) {
        App.obtenerUsuariosMoviles().then(function (lista) {
            usuariosMoviles = lista;
        });

        if (proceso && proceso.asignado_a) {
            cargarAsignacion(proceso);
        }

        assignInput.addEventListener('input', function () {
            var consulta = assignInput.value.trim();
            if (!consulta) {
                assignSugerencias.hidden = true;
                assignVacio.hidden = true;
                return;
            }
            var resultados = buscarUsuarios(consulta);
            renderSugerencias(resultados);
        });

        assignInput.addEventListener('focus', function () {
            var consulta = assignInput.value.trim();
            if (consulta) {
                var resultados = buscarUsuarios(consulta);
                renderSugerencias(resultados);
            }
        });

        document.addEventListener('click', function (e) {
            if (!e.target.closest('#assign-card')) {
                assignSugerencias.hidden = true;
                assignVacio.hidden = true;
            }
        });

        btnQuitar.addEventListener('click', function () {
            quitarSeleccion(proceso);
        });
    }

    function inicializar() {
        var params = new URLSearchParams(window.location.search);
        var id = params.get('id');
        var proceso = id ? App.obtenerProcesoPorId(id) : App.obtenerProceso();

        if (!proceso) {
            mostrarAlert('error', id ? 'No se encontró la orden solicitada.' : 'No hay un proceso activo. Vuelve al Dashboard y sube un PDF.');
            contBtn.disabled = true;
            return;
        }

        var sesion = App.obtenerSesion();
        var esAdmin = sesion && sesion.usuario && sesion.usuario.rol === 'ADMIN';
        var destino;
        var textoBtn;
        var span;

        if (esAdmin && assignCard) {
            assignCard.hidden = false;
            inicializarAsignacion(proceso);
        }

        if (id) {
            destino = esAdmin ? '../paso1/paso1.html?id=' + id : '../paso2/paso2.html?id=' + id;
            textoBtn = esAdmin ? 'Ver detalle del procesamiento' : 'Validar orden';
        } else {
            destino = esAdmin ? '../paso1/paso1.html' : '../paso2/paso2.html';
            textoBtn = esAdmin ? 'Ver detalle del procesamiento' : 'Continuar al siguiente paso';
        }

        renderResumen(proceso);
        renderSecciones(proceso);
        renderEvidencia(proceso);

        body.hidden = false;

        var contLink = document.querySelector('.hallazgo-actions .cta-white');
        if (id && contLink) {
            contLink.href = '../../historial/historial.html';
            var contSpan = contLink.querySelector('.span');
            if (contSpan) {
                contSpan.textContent = 'Volver al historial';
            }
        }

        span = contBtn.querySelector('.span');
        if (span) {
            span.textContent = textoBtn;
        }

        contBtn.addEventListener('click', function () {
            window.location.href = destino;
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