document.addEventListener('DOMContentLoaded', () => {
  requireGuest();

  const form        = document.getElementById('registerForm');
  const alertEl     = document.getElementById('authAlert');
  const roleInput   = document.getElementById('role');
  const nameLabel   = document.getElementById('nameLabel');
  const companyGrp  = document.getElementById('companyGroup');
  const togglePw    = document.getElementById('togglePw');
  const pwInput     = document.getElementById('password');

  // Pre-select role from query param
  const params = getQueryParams();
  if (params.role === 'employer') {
    document.getElementById('employerTab').click();
  }

  // Role tabs
  document.getElementById('roleTabs').addEventListener('click', e => {
    const tab = e.target.closest('.role-tab');
    if (!tab) return;
    document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const role = tab.dataset.role;
    roleInput.value = role;
    if (role === 'employer') {
      companyGrp.style.display = '';
      nameLabel.textContent = 'Your Full Name';
    } else {
      companyGrp.style.display = 'none';
      nameLabel.textContent = 'Your Full Name';
    }
  });

  // Show/hide password
  togglePw.addEventListener('click', () => {
    pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    alertEl.classList.add('hidden');

    const name     = document.getElementById('name').value.trim();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirm  = document.getElementById('confirmPassword').value;
    const role     = roleInput.value;
    const company  = document.getElementById('company_name').value.trim();

    // Validation
    let valid = true;
    const setErr = (id, msg) => { document.getElementById(id).textContent = msg; if (msg) valid = false; };

    setErr('nameError', name ? '' : 'Name is required');
    setErr('emailError', email ? '' : 'Email is required');
    setErr('passwordError', password.length >= 6 ? '' : 'Password must be at least 6 characters');
    setErr('confirmError', password === confirm ? '' : 'Passwords do not match');
    if (role === 'employer') {
      setErr('companyError', company ? '' : 'Company name is required');
    }
    if (!valid) return;

    const btnText = document.getElementById('registerBtnText');
    const spinner = document.getElementById('registerSpinner');
    btnText.textContent = 'Creating account…';
    spinner.classList.remove('hidden');
    form.querySelector('button[type=submit]').disabled = true;

    try {
      const body = { name, email, password, role };
      if (role === 'employer') body.company_name = company;

      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      window.location.href = data.user.role === 'employer'
        ? '/pages/employer-dashboard.html'
        : '/pages/seeker-dashboard.html';
    } catch (err) {
      showAlert(alertEl, 'error', err.message);
      btnText.textContent = 'Create Account';
      spinner.classList.add('hidden');
      form.querySelector('button[type=submit]').disabled = false;
    }
  });
});
