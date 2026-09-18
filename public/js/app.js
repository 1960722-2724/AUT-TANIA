(function () {
    'use strict';

    var SESSION_KEY = 'autn_sesion';
    var PROCESO_ACTUAL_KEY = 'autn_proceso_actual_id';
    var EXIGIR_ASIGNACION_KEY = 'autn_exigir_asignacion';

    function apiBaseDesdePagina() {
        var partes = window.location.pathname.split('/');
        var indicePages = partes.indexOf('pages');
        if (indicePages === -1) {
            return 'api/pdf/';
        }
        var profundidad = partes.length - indicePages - 1;
        return new Array(profundidad + 1).join('../') + 'api/pdf/';
    }

    function publicBaseDesdePagina() {
        var partes = window.location.pathname.split('/');
        var indicePages = partes.indexOf('pages');
        if (indicePages === -1) {
            return '';
        }
        var profundidad = partes.length - indicePages - 1;
        return new Array(profundidad + 1).join('../');
    }

    // Prefijo base absoluto de la app en la URL (p. ej. "/AUTN%20TANIA/public").
    function publicBaseAbsoluta() {
        var partes = window.location.pathname.split('/');
        var indicePages = partes.indexOf('pages');
        if (indicePages === -1) {
            return '';
        }
        return partes.slice(0, indicePages).join('/');
    }

    // Las URLs root-relative guardadas antes de que sincronizar.php incluyera el
    // prefijo de la app (p. ej. "/uploads/imagenes/...") se resuelven agregando
    // el prefijo actual para que las imágenes sigan siendo accesibles.
    function resolverUrlImagen(url) {
        if (!url) {
            return url;
        }
        if (/^(https?:)?\/\//i.test(url)) {
            return url;
        }
        if (url.charAt(0) === '/') {
            var base = publicBaseAbsoluta();
            if (base && url.indexOf(base) !== 0) {
                return base + url;
            }
        }
        return url;
    }

    var API_BASE = apiBaseDesdePagina();

    function apiFetch(ruta, opciones) {
        return fetch(API_BASE + ruta, opciones).then(function (resp) {
            return resp.json().then(function (datos) {
                if (!resp.ok || !datos || !datos.ok) {
                    throw new Error((datos && datos.error) || 'Error de comunicación con el servidor.');
                }
                return datos;
            });
        });
    }

    function apiPost(ruta, body) {
        return apiFetch(ruta, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    }

    function apiDelete(ruta) {
        return apiFetch(ruta, { method: 'DELETE' });
    }

    // Envía una evidencia local al cliente de sincronización (public/api/imagenes/sincronizar.php),
    // que la reenvía al hosting Hostinger y devuelve la URL servida.
    function apiSincronizarImagen(payload) {
        var base = publicBaseDesdePagina() + 'api/imagenes/sincronizar.php';
        return fetch(base, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(function (resp) {
            return resp.json().then(function (datos) {
                if (!resp.ok || !datos || !datos.ok) {
                    throw new Error((datos && datos.error) || 'Error al sincronizar la imagen.');
                }
                return datos;
            });
        });
    }

    // --- Sesión (token de usuario autenticado, no es "la base de datos") ---

    function obtenerSesion() {
        var raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    }

    function crearSesion(sesion) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(sesion));
    }

    function cerrarSesion() {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(PROCESO_ACTUAL_KEY);
    }

    function iniciarSesion(cedula, password) {
        return apiPost('login.php', { cedula: cedula, password: password }).then(function (res) {
            var sesion = { usuario: res.usuario, iniciada: new Date().toISOString() };
            crearSesion(sesion);
            return sesion;
        });
    }

    // --- Mapeo de campos hallazgo/fase2 (camelCase en el frontend <-> snake_case en la BD) ---

    var MAPA_HALLAZGO = {
        quienReporta: 'quien_reporta',
        fechaHora: 'fecha_hora',
        aliado: 'aliado',
        regional: 'regional',
        departamento: 'departamento',
        municipio: 'municipio',
        barrio: 'barrio',
        direccion: 'direccion',
        puntoReferencia: 'punto_referencia',
        coordenadas: 'coordenadas',
        duenoInfraestructura: 'dueno_infraestructura',
        codigoPacvi: 'codigo_pacvi',
        vulnerabilidadesInfraestructura: 'vulnerabilidades_infraestructura',
        estadoInfraestructura: 'estado_infraestructura',
        vulnerabilidad: 'vulnerabilidad',
        asociarOT: 'asociar_ot',
        prioridad: 'prioridad',
        observaciones: 'observaciones'
    };

    var MAPA_FASE2 = {
        supervisor: 'supervisor',
        wo: 'wo',
        tecnico: 'tecnico',
        estadoV: 'estado_v',
        observaciones: 'observaciones'
    };

    function convertirAApi(objeto, mapa) {
        var resultado = {};
        Object.keys(mapa).forEach(function (claveJs) {
            if (objeto[claveJs] !== undefined) {
                resultado[mapa[claveJs]] = objeto[claveJs];
            }
        });
        return resultado;
    }

    function convertirDeApi(fila, mapa) {
        if (!fila) {
            return null;
        }
        var resultado = {};
        Object.keys(mapa).forEach(function (claveJs) {
            resultado[claveJs] = fila[mapa[claveJs]];
        });
        return resultado;
    }

    function normalizarFecha(mysqlDatetime) {
        if (!mysqlDatetime) {
            return null;
        }
        return mysqlDatetime.replace(' ', 'T');
    }

    function resolverImagen(img) {
        if (!img) {
            return null;
        }
        img.url = resolverUrlImagen(img.url);
        img.ruta = resolverUrlImagen(img.ruta);
        return img;
    }

    function normalizarProceso(fila) {
        if (!fila) {
            return null;
        }
        var fase2 = convertirDeApi(fila.fase2, MAPA_FASE2);
        if (fase2) {
            fase2.foto = !!(fila.fase2 && fila.fase2.tiene_foto);
            fase2.fotoData = (fila.evidencias && fila.evidencias.length)
                ? fila.evidencias[fila.evidencias.length - 1]
                : '';
        }

        return {
            id: fila.id_proceso,
            consecutivo: fila.consecutivo,
            nombre_archivo: fila.nombre_archivo,
            archivo_original: fila.archivo_original,
            escaneado: !!fila.escaneado,
            paginas: fila.paginas,
            fecha: normalizarFecha(fila.creado_en),
            confirmado: !!fila.confirmado,
            fechaConfirmacion: normalizarFecha(fila.fecha_confirmacion),
            registro: fila.registro || null,
            imagen: resolverImagen(fila.imagen),
            imagenes: fila.imagenes || [],
            texto: fila.texto || [],
            asignado_a: fila.asignado_a || null,
            fase2: fase2 || null,
            hallazgo: convertirDeApi(fila.hallazgo, MAPA_HALLAZGO)
        };
    }

    // --- Procesos (reemplaza el historial que antes vivía en localStorage) ---

    function guardarProceso(resultadoSubida) {
        var sesion = obtenerSesion();
        var imagenLocal = resultadoSubida.imagen || null;

        function armarBody(imagenFinal) {
            var imagenes = [];
            if (imagenFinal && imagenFinal.url) {
                var original = (resultadoSubida.imagen && resultadoSubida.imagen.original) || {};
                imagenes.push({
                    tipo: 'pdf',
                    etiqueta: 'Registro fotografico extraido del PDF',
                    ruta: imagenFinal.url,
                    pagina: (resultadoSubida.registro && resultadoSubida.registro.page) || null,
                    mime: 'image/png',
                    ancho: original.width || null,
                    alto: original.height || null,
                    peso: (resultadoSubida.imagen && resultadoSubida.imagen.peso) || null
                });
            }
            return {
                nombre_archivo: resultadoSubida.archivo_original || resultadoSubida.archivo || 'Sin nombre',
                archivo_original: resultadoSubida.archivo_original || resultadoSubida.archivo || null,
                escaneado: !!resultadoSubida.escaneado,
                paginas: resultadoSubida.paginas || null,
                id_usuario_creador: sesion && sesion.usuario ? sesion.usuario.id : null,
                imagenes: imagenes,
                registro: resultadoSubida.registro || null,
                texto: resultadoSubida.texto || [],
                hallazgo: convertirAApi(resultadoSubida.hallazgo || {}, MAPA_HALLAZGO)
            };
        }

        // Si hay registro fotográfico local (public/api/tmp), sincronizarlo al
        // hosting antes de crear el proceso; si no hay sincronización configurada
        // o falla, se conserva la URL local.
        var preparacion = imagenLocal && imagenLocal.url
            ? apiSincronizarImagen({ url: imagenLocal.url }).then(function (res) {
                return { url: res.url };
            }).catch(function () {
                return imagenLocal;
            })
            : Promise.resolve(imagenLocal);

        return preparacion.then(function (imagenFinal) {
            return apiPost('procesos.php', armarBody(imagenFinal)).then(function (res) {
                sessionStorage.setItem(PROCESO_ACTUAL_KEY, res.proceso.id_proceso);
                return normalizarProceso(res.proceso);
            });
        });
    }

    function obtenerProcesoPorId(id) {
        return apiFetch('procesos.php?id=' + encodeURIComponent(id)).then(function (res) {
            return normalizarProceso(res.proceso);
        }).catch(function () {
            return null;
        });
    }

    function obtenerProceso() {
        var id = sessionStorage.getItem(PROCESO_ACTUAL_KEY);
        if (!id) {
            return Promise.resolve(null);
        }
        return obtenerProcesoPorId(id);
    }

    function obtenerHistorial() {
        return apiFetch('procesos.php').then(function (res) {
            return res.procesos.map(normalizarProceso);
        });
    }

    function actualizarProceso(proceso) {
        var body = { _accion: 'actualizar' };

        ['escaneado', 'confirmado'].forEach(function (campo) {
            if (proceso[campo] !== undefined) {
                body[campo] = proceso[campo] ? 1 : 0;
            }
        });
        if (proceso.fechaConfirmacion) {
            body.fecha_confirmacion = proceso.fechaConfirmacion.replace('T', ' ').slice(0, 19);
        }
        if (proceso.asignado_a !== undefined) {
            body.asignado_a_id_usuario = proceso.asignado_a ? proceso.asignado_a.id : null;
        }
        if (proceso.hallazgo) {
            body.hallazgo = convertirAApi(proceso.hallazgo, MAPA_HALLAZGO);
        }
        if (proceso.fase2) {
            body.fase2 = convertirAApi(proceso.fase2, MAPA_FASE2);
            body.fase2.tiene_foto = proceso.fase2.foto ? 1 : 0;
        }

        function enviar() {
            return apiPost('procesos.php?id=' + encodeURIComponent(proceso.id), body).then(function (res) {
                return normalizarProceso(res.proceso);
            });
        }

        // Evidencia móvil: si la foto es nueva (dataURL), se sincroniza al
        // hosting y se guarda la URL servida en pdf_imagenes (tipo 'movil').
        // Si la ruta ya es una URL persistida, no se duplica la imagen.
        if (proceso.fase2 && proceso.fase2.fotoData) {
            var fotoData = proceso.fase2.fotoData;
            if (typeof fotoData === 'string' && fotoData.indexOf('data:image/') === 0) {
                var preparacionFoto = apiSincronizarImagen({ base64: fotoData }).then(function (res) {
                    body.imagenes_nuevas = [{
                        tipo: 'movil',
                        etiqueta: 'Registro fotografico digital (paso 2)',
                        ruta: res.url
                    }];
                }).catch(function () {
                    body.imagenes_nuevas = [{
                        tipo: 'movil',
                        etiqueta: 'Registro fotografico digital (paso 2)',
                        ruta: fotoData
                    }];
                });
                return preparacionFoto.then(enviar);
            }
        }

        return enviar();
    }

    function guardarFase2(procesoId, datos) {
        return actualizarProceso({ id: procesoId, fase2: datos });
    }

    function confirmarProceso(proceso) {
        proceso.confirmado = true;
        proceso.fechaConfirmacion = new Date().toISOString();
        return actualizarProceso(proceso);
    }

    // Regla central de asignación: un ADMIN no puede continuar (Paso 2,
    // Resultado, completar orden) con una orden sin técnico asignado. Si hace
    // falta asignarlo, se redirige a la ficha del hallazgo y se deja un aviso.
    function exigirAsignacion(proceso, id) {
        var sesion = obtenerSesion();
        var esAdmin = sesion && sesion.usuario && sesion.usuario.rol === 'ADMIN';
        if (!esAdmin || !proceso || proceso.asignado_a) {
            return true;
        }
        sessionStorage.setItem(EXIGIR_ASIGNACION_KEY, '1');
        window.location.href = '../hallazgo/hallazgo.html' + (id ? '?id=' + encodeURIComponent(id) : '');
        return false;
    }

    var META_ICONOS = {
        hash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>',
        reloj: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
        usuario: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
        alerta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        archivo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
        paginas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>',
        metodo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
        imagen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>'
    };

    function escaparMetaTexto(texto) {
        var div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }

    function formatearMetaFecha(iso) {
        if (!iso) {
            return null;
        }
        var d = new Date(iso);
        if (isNaN(d.getTime())) {
            return iso;
        }
        function dos(n) { return ('0' + n).slice(-2); }
        return dos(d.getDate()) + '/' + dos(d.getMonth() + 1) + '/' + d.getFullYear() +
            ' ' + dos(d.getHours()) + ':' + dos(d.getMinutes());
    }

    // Componente "datos primarios" compartido por Hallazgo y Resultado: destaca
    // la identidad de la orden (consecutivo, fecha, técnico, prioridad) en
    // celdas separadas por líneas verticales azules.
    function renderDatosPrimarios(root, proceso) {
        if (!root || !proceso) {
            return;
        }
        var hallazgo = proceso.hallazgo || {};
        var consecutivo = proceso.consecutivo ? String(proceso.consecutivo) : null;
        var fecha = (hallazgo.fechaHora && hallazgo.fechaHora.trim())
            ? hallazgo.fechaHora.trim()
            : formatearMetaFecha(proceso.fecha);
        // La ficha del hallazgo surge de los datos extraídos del PDF: en esa
        // etapa aún no existe técnico asignado, por lo que la celda muestra el
        // campo "NOMBRE QUIEN REPORTA" del documento. Una vez asignado el
        // técnico (Paso 2/Resultado), gana el nombre del usuario móvil.
        var tecnico = (proceso.asignado_a && proceso.asignado_a.nombre) || null;
        var quienReporta = (hallazgo.quienReporta && hallazgo.quienReporta.trim())
            ? hallazgo.quienReporta.trim()
            : null;
        var reporta = tecnico || quienReporta;
        var etiquetaReporta = tecnico ? 'Técnico asignado' : 'Quien reporta';
        var prioridad = (hallazgo.prioridad && hallazgo.prioridad.trim())
            ? hallazgo.prioridad.trim()
            : null;

        var estadisticas = [
            { etiqueta: 'Consecutivo', valor: consecutivo, icono: META_ICONOS.hash },
            { etiqueta: 'Fecha del hallazgo', valor: fecha, icono: META_ICONOS.reloj },
            { etiqueta: etiquetaReporta, valor: reporta, icono: META_ICONOS.usuario },
            { etiqueta: 'Prioridad', valor: prioridad, icono: META_ICONOS.alerta }
        ];

        var html = '<div class="meta-stats">';
        estadisticas.forEach(function (s) {
            var claseValor = s.valor
                ? (s.etiqueta === 'Prioridad' ? ' meta-stat-value--naranja' : '')
                : ' is-empty';
            html += '<div class="meta-stat">' +
                '<span class="meta-stat-icon" aria-hidden="true">' + s.icono + '</span>' +
                '<div class="meta-stat-body">' +
                    '<span class="meta-stat-label">' + s.etiqueta + '</span>' +
                    '<div class="meta-stat-value' + claseValor + '">' +
                    (s.valor ? escaparMetaTexto(s.valor) : '—') +
                    '</div>' +
                '</div>' +
            '</div>';
        });
        html += '</div>';

        root.innerHTML = html;
    }

    // Meta de procesamiento en una tarjeta aparte: archivo, páginas, método
    // (OCR/Texto) y ubicación del registro fotográfico.
    function renderChipsProcesamiento(root, proceso) {
        if (!root || !proceso) {
            return;
        }
        var archivo = proceso.archivo_original || proceso.nombre_archivo || proceso.archivo || null;
        var paginas = proceso.paginas ? proceso.paginas + (proceso.paginas === 1 ? ' página' : ' páginas') : null;
        var metodo = proceso.escaneado ? 'OCR' : 'Texto';
        var registro = (proceso.registro && proceso.registro.page)
            ? 'Registro: Página ' + proceso.registro.page
            : 'Registro: No detectada';

        var html = '<div class="meta-chips">';

        function chip(icono, texto, truncar) {
            if (!texto) {
                return;
            }
            var titulo = truncar ? ' title="' + escaparMetaTexto(texto) + '"' : '';
            html += '<span class="meta-chip' + (truncar ? ' meta-chip-truncate' : '') + '"' + titulo + '>' +
                icono + '<span>' + escaparMetaTexto(texto) + '</span></span>';
        }

        chip(META_ICONOS.archivo, archivo, true);
        chip(META_ICONOS.paginas, paginas, false);
        chip(META_ICONOS.metodo, metodo, false);
        chip(META_ICONOS.imagen, registro, false);
        html += '</div>';

        root.innerHTML = html;
    }

    function obtenerMisHallazgos() {
        var sesion = obtenerSesion();
        var idUsuario = sesion && sesion.usuario ? sesion.usuario.id : null;
        if (!idUsuario) {
            return Promise.resolve([]);
        }
        return apiFetch('procesos.php?asignado_a=' + encodeURIComponent(idUsuario)).then(function (res) {
            return res.procesos.map(normalizarProceso);
        });
    }

    function obtenerUsuariosMoviles() {
        return apiFetch('usuarios_movil.php').then(function (res) {
            return res.usuarios;
        });
    }

    function eliminarProceso(id) {
        return apiDelete('procesos.php?id=' + encodeURIComponent(id));
    }

    var ICONOS = {
        dashboard: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg>',
        documento: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
        historial: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v5h5"></path><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path><polyline points="12 7 12 12 16 14"></polyline></svg>'
    };

    function paginaActual() {
        var ruta = window.location.pathname;
        if (/\/historial\//.test(ruta)) {
            return 'historial';
        }
        if (/\/dashboard\//.test(ruta)) {
            return 'dashboard';
        }
        if (/\/hallazgo\/|\/paso1\/|\/paso2\//.test(ruta)) {
            return 'procesamiento';
        }
        return '';
    }

    function enlaceMenu(opcion, activo) {
        var a = document.createElement('a');
        a.href = opcion.href;
        a.className = 'nav-link' + (activo ? ' active' : '');
        a.innerHTML = ICONOS[opcion.icono] + opcion.etiqueta;
        return a;
    }

    function renderMenu() {
        var nav = document.getElementById('sidebar-nav');
        if (!nav) {
            return;
        }

        var base = publicBaseDesdePagina();
        var sesion = obtenerSesion();
        var rol = sesion && sesion.usuario ? sesion.usuario.rol : '';
        var actual = paginaActual();

        var opciones = [
            {
                seccion: 'Principal',
                id: 'dashboard',
                href: base + 'pages/dashboard/dashboard.html',
                etiqueta: 'Dashboard',
                icono: 'dashboard'
            },
            {
                id: 'procesamiento',
                href: base + 'pages/procesamiento/hallazgo/hallazgo.html',
                etiqueta: 'Procesamiento',
                icono: 'documento'
            }
        ];

        if (rol === 'ADMIN') {
            opciones.push({
                id: 'historial',
                href: base + 'pages/historial/historial.html',
                etiqueta: 'Historial',
                icono: 'historial'
            });
        }

        nav.innerHTML = '';

        var seccionActual = null;
        opciones.forEach(function (opcion) {
            if (opcion.seccion && opcion.seccion !== seccionActual) {
                var p = document.createElement('p');
                p.className = 'nav-section';
                p.textContent = opcion.seccion;
                nav.appendChild(p);
                seccionActual = opcion.seccion;
            }
            nav.appendChild(enlaceMenu(opcion, opcion.id === actual));
        });
    }

    function abrirSidebar() {
        document.body.classList.add('sidebar-open');
    }

    function cerrarSidebar() {
        document.body.classList.remove('sidebar-open');
    }

    function iniciarLayout() {
        var body = document.body;
        var sidebar = document.getElementById('sidebar');

        if (!sidebar) {
            return;
        }

        renderMenu();

        var toggle = document.getElementById('btn-toggle-sidebar');
        var closeBtn = document.getElementById('btn-sidebar-close');
        var backdrop = document.getElementById('sidebar-backdrop');

        if (toggle) {
            toggle.addEventListener('click', function () {
                if (body.classList.contains('sidebar-open')) {
                    cerrarSidebar();
                } else {
                    abrirSidebar();
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', cerrarSidebar);
        }

        if (backdrop) {
            backdrop.addEventListener('click', cerrarSidebar);
        }

        sidebar.addEventListener('click', function (evt) {
            if (body.classList.contains('sidebar-open') && evt.target.closest('a')) {
                cerrarSidebar();
            }
        });

        document.addEventListener('keydown', function (evt) {
            if (evt.key === 'Escape' && body.classList.contains('sidebar-open')) {
                cerrarSidebar();
            }
        });
    }

    window.App = {
        iniciarSesion: iniciarSesion,
        obtenerSesion: obtenerSesion,
        crearSesion: crearSesion,
        cerrarSesion: cerrarSesion,
        guardarProceso: guardarProceso,
        obtenerProceso: obtenerProceso,
        obtenerHistorial: obtenerHistorial,
        obtenerProcesoPorId: obtenerProcesoPorId,
        actualizarProceso: actualizarProceso,
        guardarFase2: guardarFase2,
        confirmarProceso: confirmarProceso,
        exigirAsignacion: exigirAsignacion,
        renderDatosPrimarios: renderDatosPrimarios,
        renderChipsProcesamiento: renderChipsProcesamiento,
        obtenerMisHallazgos: obtenerMisHallazgos,
        obtenerUsuariosMoviles: obtenerUsuariosMoviles,
        eliminarProceso: eliminarProceso,
        iniciarLayout: iniciarLayout
    };

    iniciarLayout();
})();
