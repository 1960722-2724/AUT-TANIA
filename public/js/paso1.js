(function () {
    'use strict';

    var alertBox = document.getElementById('paso1-alert');
    var contBtn = document.getElementById('btn-continuar');

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

    function renderInfo(proceso) {
        var original = proceso.archivo_original || proceso.archivo || '—';
        var paginas = proceso.paginas || 0;
        var registro = proceso.registro || null;

        getEl('info-archivo').textContent = original;
        getEl('info-paginas').textContent = String(paginas) + (paginas === 1 ? ' página' : ' páginas');

        if (registro) {
            getEl('info-pagina-registro').textContent = 'Página ' + registro.page;
            getEl('info-posicion-registro').textContent =
                'X ' + Math.round(registro.x) + ' · Y ' + Math.round((registro.yMin + registro.yMax) / 2);
        } else {
            getEl('info-pagina-registro').textContent = 'No detectada';
            getEl('info-posicion-registro').textContent = '—';
        }
    }

    function renderImagen(proceso) {
        var img = proceso.imagen || null;
        var foto = getEl('registro-foto');
        var vacio = getEl('foto-vacio');

        if (img && img.url) {
            foto.src = img.url;
            foto.hidden = false;
            vacio.hidden = true;
        } else {
            foto.hidden = true;
            vacio.hidden = false;
        }
    }

    function renderTexto(proceso) {
        var lista = document.getElementById('texto-lista');
        lista.innerHTML = '';

        var texto = proceso.texto || [];
        if (!Array.isArray(texto)) {
            texto = [texto];
        }

        if (texto.length === 0 || (texto.length === 1 && texto[0] === '')) {
            var sinContenido = document.createElement('p');
            sinContenido.className = 'empty-text';
            sinContenido.textContent = 'No se extrajo texto del documento.';
            lista.appendChild(sinContenido);
            return;
        }

        texto.forEach(function (pagina, i) {
            var bloque = document.createElement('div');
            bloque.className = 'pagina-bloque';

            var titulo = document.createElement('p');
            titulo.className = 'pagina-titulo';
            titulo.textContent = 'Página ' + (i + 1);
            bloque.appendChild(titulo);

            var contenido = document.createElement('pre');
            contenido.className = 'pagina-contenido';
            contenido.textContent = pagina;
            bloque.appendChild(contenido);

            lista.appendChild(bloque);
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

        renderInfo(proceso);
        renderImagen(proceso);
        renderTexto(proceso);

        contBtn.addEventListener('click', function () {
            window.location.href = id ? '../paso2/paso2.html?id=' + id : '../paso2/paso2.html';
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
