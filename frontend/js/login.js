document.addEventListener('DOMContentLoaded', () => {
  requireGuest();

  const form      = document.getElementById('loginForm');
  const alertEl   = document.getElementById('authAlert');
  const btnText   = document.getElementById('loginBtnText');
  const spinner   = document.getElementById('loginSpinner');
  const togglePw  = document.getElementById('togglePw');
  const pwInput   = document.getElementById('password');

  togglePw.addEventListener('click', () => {
    pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    alertEl.classList.add('hidden');

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Basic client-side validation
    let valid = true;
    if (!email) { document.getElementById('emailError').textContent = 'Email required'; valid = false; }
    else document.getElementById('emailError').textContent = '';
    if (!password) { document.getElementById('passwordError').textContent = 'Password required'; valid = false; }
    else document.getElementById('passwordError').textContent = '';
    if (!valid) return;

    btnText.textContent = 'Logging in…';
    spinner.classList.remove('hidden');
    form.querySelector('button[type=submit]').disabled = true;

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect based on role
      window.location.href = data.user.role === 'employer'
        ? '/pages/employer-dashboard.html'
        : '/pages/seeker-dashboard.html';
    } catch (err) {
      showAlert(alertEl, 'error', err.message);
      btnText.textContent = 'Log In';
      spinner.classList.add('hidden');
      form.querySelector('button[type=submit]').disabled = false;
    }
  });
});
