(function () {
    'use strict';

    var form = document.getElementById('login-form');
    var alertBox = document.getElementById('login-alert');
    var loginBtn = document.getElementById('login-btn');
    var correoInput = document.getElementById('correo');
    var passwordInput = document.getElementById('password');
    var correoError = document.getElementById('correo-error');
    var passwordError = document.getElementById('password-error');

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

    function validar(correo, password) {
        var valido = true;

        if (!correo) {
            mostrarErrorInput(correoInput, correoError, 'El correo es obligatorio.');
            valido = false;
        } else if (!correo.includes('@')) {
            mostrarErrorInput(correoInput, correoError, 'Ingresa un correo válido.');
            valido = false;
        } else {
            mostrarErrorInput(correoInput, correoError, null);
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

    function login(correo, password) {
        return new Promise(function (resolve) {
            setTimeout(function () {
                var sesion = {
                    usuario: {
                        nombre: 'Usuario Demo',
                        correo: correo,
                        rol: 'USUARIO'
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

        var correo = correoInput.value.trim();
        var password = passwordInput.value;

        if (!validar(correo, password)) {
            return;
        }

        loginBtn.disabled = true;
        loginBtn.textContent = 'Ingresando...';

        login(correo, password).then(function () {
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

    correoInput.addEventListener('input', function () {
        if (correoInput.value) {
            mostrarErrorInput(correoInput, correoError, null);
        }
    });

    passwordInput.addEventListener('input', function () {
        if (passwordInput.value) {
            mostrarErrorInput(passwordInput, passwordError, null);
        }
    });
})();