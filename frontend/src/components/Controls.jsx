import { useAuth } from '../context/AuthContext.jsx';
import { useAlert } from '../context/AlertContext.jsx';
import { exportTxt, exportPng } from '../api/exports.js';
import { asciiText, asciiPng, download } from '../lib/exporters.js';

export default function Controls({
  detail, onDetail, color, onToggleColor, theme, onTheme,
  onCenter, onFile, grid, cell, onNeedLogin,
}) {
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();

  // runs an export request; a 401 means the session expired
  async function runExport(makeRequest, filename) {
    try {
      download(await makeRequest(), filename);
    } catch (err) {
      if (err.status === 401) {
        logout();
        onNeedLogin('Session expired. Please log in again.');
      } else {
        showAlert(err.message);
      }
    }
  }

  const handleTxt = () => {
    if (!user) return onNeedLogin('Log in to export.');
    runExport(() => exportTxt(asciiText(grid)), 'ascii.txt');
  };

  const handlePng = () => {
    if (!user) return onNeedLogin('Log in to export.');
    runExport(() => exportPng(asciiPng(grid, cell, { color, theme })), 'ascii.png');
  };

  return (
    <>
      <div className="bar">
        <div className="ctrl">
          <label className="btn">
            Upload Picture
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { onFile(e.target.files[0]); e.target.value = ''; }}
            />
          </label>
          <button onClick={onCenter}>Center</button>
          <span className="note">Detail</span>
          <select value={detail} onChange={e => onDetail(e.target.value)}>
            <option value="s">Fine</option>
            <option value="m">Medium</option>
            <option value="l">Chunky</option>
          </select>
        </div>
        <div className="ctrl">
          <button onClick={onToggleColor}>{color ? 'Color: On' : 'Color: Mono'}</button>
          <select value={theme} onChange={e => onTheme(e.target.value)}>
            <option value="retro">Retro</option>
            <option value="matrix">Matrix</option>
          </select>
        </div>
      </div>
      <div className="bar">
        <div className="ctrl">
          <button onClick={handlePng}>Export PNG</button>
          <button onClick={handleTxt}>Export TXT</button>
        </div>
        <p className="note">Left: original. Right: ASCII. Drop an image onto the board to load it.</p>
      </div>
    </>
  );
}
