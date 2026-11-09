import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useAlert } from '../context/AlertContext.jsx';

const EMPTY = { username: '', password: '' };

export default function AuthModal({ open, notice, onClose }) {
  const { login, register } = useAuth();
  const { showAlert } = useAlert();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(EMPTY);
  const [invalid, setInvalid] = useState(null); // name of the field with a problem
  const [error, setError] = useState('');

  // blank the inputs whenever the modal closes
  useEffect(() => {
    if (!open) { setForm(EMPTY); setError(''); setInvalid(null); }
  }, [open]);

  if (!open) return null;

  const set = key => e => {
    const value = e.target.value;
    setForm(f => ({ ...f, [key]: value }));
    if (invalid === key) setInvalid(null);
  };

  // client-side checks; the first failure is highlighted and shown in the themed alert
  const validate = () => {
    const username = form.username.trim(), password = form.password;
    const rules = [
      [!username, 'username', 'Please enter a username.'],
      [username.length < 3, 'username', 'Username must be at least 3 characters.'],
      [!password, 'password', 'Please enter a password.'],
      [password.length < 6, 'password', 'Password must be at least 6 characters.'],
    ];
    const failed = rules.find(([bad]) => bad);
    if (failed) {
      setInvalid(failed[1]);
      showAlert(failed[2]);
      return false;
    }
    setInvalid(null);
    return true;
  };

  const submit = async e => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const action = mode === 'login' ? login : register;
      await action(form.username.trim(), form.password);
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form className="box" noValidate onSubmit={submit}>
        <div className="tabs">
          {['login', 'register'].map(m => (
            <button
              key={m}
              type="button"
              className={`tab${mode === m ? ' active' : ''}`}
              onClick={() => { setMode(m); setError(''); }}
            >
              {m === 'login' ? 'Login' : 'Register'}
            </button>
          ))}
        </div>

        <label className="field">
          Username
          <input
            className={invalid === 'username' ? 'invalid' : ''}
            value={form.username}
            onChange={set('username')}
            autoComplete="username"
          />
        </label>
        <label className="field">
          Password
          <input
            type="password"
            className={invalid === 'password' ? 'invalid' : ''}
            value={form.password}
            onChange={set('password')}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>

        <p className="error">{error || notice}</p>
        <div className="ctrl">
          <button type="submit">{mode === 'login' ? 'Login' : 'Register'}</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
