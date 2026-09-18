(function () {
    'use strict';

    var form = document.getElementById('login-form');
    var alertBox = document.getElementById('login-alert');
    var loginBtn = document.getElementById('login-btn');
    var cedulaInput = document.getElementById('cedula');
    var passwordInput = document.getElementById('password');
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

    function manejarEnvio(evt) {
        evt.preventDefault();
        ocultarAlert();

        var cedula = cedulaInput.value.trim();
        var password = passwordInput.value;

        if (!validar(cedula, password)) {
            return;
        }

        loginBtn.disabled = true;
        loginBtn.textContent = 'Ingresando...';

        App.iniciarSesion(cedula, password).then(function () {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Iniciar sesión';
            mostrarAlert('success', 'Sesión iniciada correctamente.');
            form.reset();
            window.setTimeout(function () {
                window.location.href = '../dashboard/dashboard.html';
            }, 600);
        }).catch(function (error) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Iniciar sesión';
            mostrarAlert('error', error.message || 'No se pudo iniciar sesión.');
        });
    }

    form.addEventListener('submit', manejarEnvio);

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