(function () {
    'use strict';

    var MESES = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    var alertBox = document.getElementById('historial-alert');
    var lista = document.getElementById('historial-lista');
    var vacio = document.getElementById('historial-vacio');
    var inputBuscar = document.getElementById('historial-buscar');
    var selectMes = document.getElementById('filtro-mes');
    var selectDia = document.getElementById('filtro-dia');

    var procesos = [];
    var filtroMes = '';
    var filtroDia = '';
    var filtradosActuales = [];
    var btnExportar = document.getElementById('btn-exportar');

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

    function normalizar(texto) {
        return String(texto || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
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

    function valorHallazgo(proceso, clave) {
        var h = proceso.hallazgo || {};
        var v = h[clave];
        if (v === undefined || v === null) {
            return '';
        }
        return String(v).trim();
    }

    function esPendiente(proceso) {
        return proceso.escaneado === true && !proceso.fase2;
    }

    function textoBusqueda(proceso) {
        var f2 = proceso.fase2 || {};
        return normalizar([
            proceso.consecutivo,
            valorHallazgo(proceso, 'quienReporta'),
            valorHallazgo(proceso, 'vulnerabilidadesInfraestructura'),
            f2.tecnico,
            f2.supervisor,
            f2.wo,
            proceso.nombre_archivo
        ].join(' '));
    }

    function crearDato(etiqueta, valor, muted) {
        var dl = document.createElement('dl');
        dl.className = 'orden-dato';

        var dt = document.createElement('dt');
        dt.textContent = etiqueta;

        var dd = document.createElement('dd');
        dd.textContent = valor || '—';
        if (muted && !valor) {
            dd.className = 'muted';
        }

        dl.appendChild(dt);
        dl.appendChild(dd);
        return dl;
    }

    function crearFase1(proceso) {
        var div = document.createElement('div');
        div.className = 'orden-fase orden-fase1';

        var titulo = document.createElement('p');
        titulo.className = 'orden-fase-titulo';
        titulo.innerHTML = '<span class="dot"></span> Fase 1 · PDF';

        var contenido = document.createElement('div');
        contenido.className = 'orden-datos';
        contenido.appendChild(crearDato('Técnico (reporta)', valorHallazgo(proceso, 'quienReporta'), true));
        contenido.appendChild(crearDato('Vulnerabilidad', valorHallazgo(proceso, 'vulnerabilidadesInfraestructura'), true));
        contenido.appendChild(crearDato('Municipio', valorHallazgo(proceso, 'municipio'), true));
        contenido.appendChild(crearDato('Prioridad', valorHallazgo(proceso, 'prioridad'), true));

        div.appendChild(titulo);
        div.appendChild(contenido);
        return div;
    }

    function crearFase2(proceso) {
        var f2 = proceso.fase2 || {};
        var div = document.createElement('div');
        div.className = 'orden-fase orden-fase2';

        var titulo = document.createElement('p');
        titulo.className = 'orden-fase-titulo';
        titulo.innerHTML = '<span class="dot"></span> Fase 2 · Móvil';

        var contenido = document.createElement('div');
        contenido.className = 'orden-datos';
        contenido.appendChild(crearDato('Técnico que resuelve', f2.tecnico, true));
        contenido.appendChild(crearDato('Supervisor', f2.supervisor, true));
        contenido.appendChild(crearDato('WO', f2.wo, true));
        contenido.appendChild(crearDato('Observación', f2.observaciones, true));

        div.appendChild(titulo);
        div.appendChild(contenido);
        return div;
    }

    function crearTarjeta(proceso) {
        var article = document.createElement('article');
        var pendiente = esPendiente(proceso);
        article.className = 'orden-card' + (pendiente ? ' pendiente' : ' completada');

        var header = document.createElement('div');
        header.className = 'orden-header';

        var titulo = document.createElement('div');
        titulo.className = 'orden-titulo';

        var consecutivo = document.createElement('span');
        consecutivo.className = 'orden-consecutivo' + (pendiente ? ' pendiente' : '');
        consecutivo.textContent = '#' + proceso.consecutivo;

        var archivo = document.createElement('span');
        archivo.className = 'orden-archivo';
        archivo.textContent = proceso.nombre_archivo || 'PDF';
        archivo.title = archivo.textContent;

        titulo.appendChild(consecutivo);
        titulo.appendChild(archivo);

        var badges = document.createElement('div');
        badges.className = 'orden-badges';

        var badge1 = document.createElement('span');
        badge1.className = 'badge badge-blue';
        badge1.textContent = 'Fase 1';

        var fecha = document.createElement('span');
        fecha.className = 'orden-fecha';
        fecha.textContent = formatearFecha(proceso.fecha);

        badges.appendChild(badge1);

        if (pendiente) {
            var badgePend = document.createElement('span');
            badgePend.className = 'badge badge-orange';
            badgePend.textContent = 'Pendiente móvil';
            badges.appendChild(badgePend);
        } else {
            var badge2 = document.createElement('span');
            badge2.className = 'badge badge-blue';
            badge2.textContent = 'Fase 2';
            badges.appendChild(badge2);
        }

        badges.appendChild(fecha);

        header.appendChild(titulo);
        header.appendChild(badges);

        var fases = document.createElement('div');
        fases.className = 'orden-fases' + (pendiente ? ' una-fase' : '');
        fases.appendChild(crearFase1(proceso));
        if (proceso.fase2) {
            fases.appendChild(crearFase2(proceso));
        }

        var acciones = document.createElement('div');
        acciones.className = 'orden-acciones';

        var a = document.createElement('a');
        a.className = 'btn-ver-orden';
        a.href = '../procesamiento/hallazgo/hallazgo.html?id=' + encodeURIComponent(proceso.id);
        a.textContent = 'Ver detalle';
        acciones.appendChild(a);

        article.appendChild(header);
        article.appendChild(fases);
        article.appendChild(acciones);

        return article;
    }

    function filtrarYRender() {
        var texto = normalizar(inputBuscar.value.trim());
        var original = procesos;
        var filtrados = original.filter(function (p) {
            if (filtroMes && p.fecha) {
                var d = new Date(p.fecha);
                if (d.getMonth() !== parseInt(filtroMes, 10)) {
                    return false;
                }
            }
            if (filtroDia && p.fecha) {
                var d2 = new Date(p.fecha);
                if (d2.getDate() !== parseInt(filtroDia, 10)) {
                    return false;
                }
            }
            if (texto) {
                return textoBusqueda(p).indexOf(texto) !== -1;
            }
            return true;
        });

        mostrar(filtrados);
    }

    function mostrar(filtrados) {
        filtradosActuales = filtrados;
        lista.innerHTML = '';
        if (filtrados.length === 0) {
            lista.hidden = true;
            vacio.hidden = false;
            btnExportar.disabled = true;
            return;
        }

        lista.hidden = false;
        vacio.hidden = true;
        btnExportar.disabled = false;

        filtrados.forEach(function (proceso) {
            lista.appendChild(crearTarjeta(proceso));
        });
    }

    function llenarSelectMes() {
        var option = document.createElement('option');
        option.value = '';
        option.textContent = 'Todos';
        selectMes.appendChild(option);

        MESES.forEach(function (mes, i) {
            var o = document.createElement('option');
            o.value = String(i);
            o.textContent = mes;
            selectMes.appendChild(o);
        });
    }

    function llenarSelectDia() {
        selectDia.innerHTML = '';
        var option = document.createElement('option');
        option.value = '';
        option.textContent = 'Todos';
        selectDia.appendChild(option);

        for (var d = 1; d <= 31; d++) {
            var o = document.createElement('option');
            o.value = String(d);
            o.textContent = String(d);
            selectDia.appendChild(o);
        }
    }

    function escaparCelda(valor) {
        return String(valor === null || valor === undefined ? '' : valor)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function exportarExcel() {
        var registros = filtradosActuales;
        if (!registros || registros.length === 0) {
            return;
        }

        var cabeceras = [
            'Consecutivo',
            'Fecha',
            'Archivo',
            'Escaneado',
            'Técnico (reporta)',
            'Vulnerabilidad',
            'Municipio',
            'Prioridad',
            'Técnico que resuelve',
            'Supervisor',
            'WO',
            'Estado V',
            'Observación'
        ];

        var filas = registros.map(function (p) {
            var h = p.hallazgo || {};
            var f2 = p.fase2 || {};
            return [
                p.consecutivo,
                formatearFecha(p.fecha),
                p.nombre_archivo,
                p.escaneado ? 'Sí' : 'No',
                valorHallazgo(p, 'quienReporta'),
                valorHallazgo(p, 'vulnerabilidadesInfraestructura'),
                valorHallazgo(p, 'municipio'),
                valorHallazgo(p, 'prioridad'),
                f2.tecnico,
                f2.supervisor,
                f2.wo,
                f2.estadoV,
                f2.observaciones
            ];
        });

        var html =
            '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
            'xmlns:x="urn:schemas-microsoft-com:office:excel">' +
            '<head><meta charset="utf-8"></head>' +
            '<body><table border="1">' +
            '<tr>' + cabeceras.map(function (c) { return '<th>' + escaparCelda(c) + '</th>'; }).join('') + '</tr>';

        filas.forEach(function (fila) {
            html += '<tr>' + fila.map(function (v) { return '<td>' + escaparCelda(v) + '</td>'; }).join('') + '</tr>';
        });

        html += '</table></body></html>';

        var blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'historial_ordenes.xls';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        mostrarAlert('success', 'Excel exportado con ' + registros.length + ' órdenes.');
    }

    function inicializar() {
        var sesion = App.obtenerSesion();
        var rol = sesion && sesion.usuario ? sesion.usuario.rol : '';

        if (rol !== 'ADMIN') {
            mostrarAlert('error', 'Solo el perfil Administrador puede consultar el historial.');
            window.location.href = '../dashboard/dashboard.html';
            return;
        }

        procesos = App.obtenerHistorial();
        llenarSelectMes();
        llenarSelectDia();
        filtrarYRender();
    }

    function cerrarSesion() {
        App.cerrarSesion();
        window.location.href = '../auth/login.html';
    }

    inputBuscar.addEventListener('input', filtrarYRender);
    selectMes.addEventListener('change', function () {
        filtroMes = selectMes.value;
        filtrarYRender();
    });
    selectDia.addEventListener('change', function () {
        filtroDia = selectDia.value;
        filtrarYRender();
    });

    if (btnExportar) {
        btnExportar.addEventListener('click', exportarExcel);
    }

    getEl('logout-btn').addEventListener('click', cerrarSesion);

    mostrarUsuario();
    inicializar();
})();