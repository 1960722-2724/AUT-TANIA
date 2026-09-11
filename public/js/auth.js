(function () {
    'use strict';

    var form = document.getElementById('login-form');
    var alertBox = document.getElementById('login-alert');
    var loginBtn = document.getElementById('login-btn');
    var cedulaInput = document.getElementById('cedula');
    var passwordInput = document.getElementById('password');
    var rolNav = document.getElementById('rol-nav');
    var rolItems = rolNav ? rolNav.querySelectorAll('.rol-nav-item') : [];
    var rolIndicator = document.getElementById('rol-nav-indicator');
    var rolActual = 'USUARIO';
    var authLayout = document.querySelector('.auth-layout');
    var cedulaError = document.getElementById('cedula-error');
    var passwordError = document.getElementById('password-error');

    var forgotBtn = document.getElementById('forgot-password-btn');
    var forgotModal = document.getElementById('forgot-modal');
    var forgotModalClose = document.getElementById('forgot-modal-close');
    var forgotModalAccept = document.getElementById('forgot-modal-accept');

    var bugsToggle = document.getElementById('bugs-toggle');
    var bugsViewer = document.getElementById('bugs-viewer');

    function mostrarErrorInput(input, errorEl, mensaje) {
        if (!mensaje) {
            input.classList.remove('has-error');
            errorEl.hidden = true;
            errorEl.textContent = '';
            return;
        }
        input.classList.add('has-error');
        errorEl.textContent = mensaje;
        errorEl.hidden = false;
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

    function abrirModal() {
        forgotModal.hidden = false;
        document.body.classList.add('modal-open');
        document.getElementById('forgot-modal-accept').focus();
    }

    function cerrarModal() {
        forgotModal.hidden = true;
        document.body.classList.remove('modal-open');
        forgotBtn.focus();
    }

    function validar(cedula, password) {
        var valido = true;

        if (!cedula) {
            mostrarErrorInput(cedulaInput, cedulaError, 'La cédula es obligatoria.');
            valido = false;
        } else if (!/^\d+$/.test(cedula)) {
            mostrarErrorInput(cedulaInput, cedulaError, 'Ingresa una cédula válida (solo números).');
            valido = false;
        } else {
            mostrarErrorInput(cedulaInput, cedulaError, null);
        }

        if (!password) {
            mostrarErrorInput(passwordInput, passwordError, 'La contraseña es obligatoria.');
            valido = false;
        } else if (password.length < 4) {
            mostrarErrorInput(passwordInput, passwordError, 'La contraseña debe tener al menos 4 caracteres.');
            valido = false;
        } else {
            mostrarErrorInput(passwordInput, passwordError, null);
        }

        return valido;
    }

    function login(cedula, password, rol) {
        return new Promise(function (resolve) {
            setTimeout(function () {
                var sesion = {
                    usuario: {
                        nombre: rol === 'ADMIN' ? 'Administrador Demo' : 'Usuario Demo',
                        cedula: cedula,
                        rol: rol
                    },
                    iniciada: new Date().toISOString()
                };
                App.crearSesion(sesion);
                resolve(sesion);
            }, 400);
        });
    }

    function manejarEnvio(evt) {
        evt.preventDefault();
        ocultarAlert();

        var cedula = cedulaInput.value.trim();
        var password = passwordInput.value;
        var rol = rolActual;

        if (!validar(cedula, password)) {
            return;
        }

        loginBtn.disabled = true;
        loginBtn.textContent = 'Ingresando...';

        login(cedula, password, rol).then(function () {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Iniciar sesión';
            mostrarAlert('success', 'Sesión iniciada correctamente.');
            form.reset();
            window.setTimeout(function () {
                window.location.href = '../dashboard/dashboard.html';
            }, 600);
        });
    }

    form.addEventListener('submit', manejarEnvio);

    function moverIndicador(activo) {
        if (rolIndicator && activo) {
            rolIndicator.style.left = activo.offsetLeft + 'px';
            rolIndicator.style.width = activo.offsetWidth + 'px';
        }
    }

    if (rolNav) {
        rolItems.forEach(function (item) {
            item.addEventListener('click', function () {
                rolItems.forEach(function (otro) {
                    otro.classList.remove('is-active');
                    otro.setAttribute('aria-selected', 'false');
                });
                item.classList.add('is-active');
                item.setAttribute('aria-selected', 'true');
                rolActual = item.getAttribute('data-rol');
                if (authLayout) {
                    authLayout.classList.toggle('auth-layout--admin', rolActual === 'ADMIN');
                }
                moverIndicador(item);
            });
        });

        var activoInicial = rolNav.querySelector('.rol-nav-item.is-active') || rolItems[0];
        window.addEventListener('load', function () {
            moverIndicador(activoInicial);
        });
        window.addEventListener('resize', function () {
            var activo = rolNav.querySelector('.rol-nav-item.is-active');
            moverIndicador(activo);
        });
    }

    cedulaInput.addEventListener('input', function () {
        if (cedulaInput.value) {
            mostrarErrorInput(cedulaInput, cedulaError, null);
        }
    });

    passwordInput.addEventListener('input', function () {
        if (passwordInput.value) {
            mostrarErrorInput(passwordInput, passwordError, null);
        }
    });

    forgotBtn.addEventListener('click', abrirModal);
    forgotModalClose.addEventListener('click', cerrarModal);
    forgotModalAccept.addEventListener('click', cerrarModal);
    forgotModal.addEventListener('click', function (evt) {
        if (evt.target === forgotModal) {
            cerrarModal();
        }
    });
    document.addEventListener('keydown', function (evt) {
        if (evt.key === 'Escape' && !forgotModal.hidden) {
            cerrarModal();
        }
    });

    if (bugsToggle && bugsViewer) {
        bugsToggle.addEventListener('click', function () {
            bugsViewer.hidden = !bugsViewer.hidden;
        });
    }
})();