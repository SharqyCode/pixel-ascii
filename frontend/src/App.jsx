import { useEffect, useMemo, useState } from "react";
import Board from "./components/Board.jsx";
import Controls from "./components/Controls.jsx";
import AuthModal from "./components/AuthModal.jsx";
import MatrixRain from "./components/MatrixRain.jsx";
import UserBar from "./components/UserBar.jsx";
import { DETAIL } from "./lib/constants.js";
import { demoImage, fitSize, buildGrid } from "./lib/ascii.js";

export default function App() {
  const [source, setSource] = useState(() => demoImage());
  const [detail, setDetail] = useState("m");
  const [color, setColor] = useState(true);
  const [theme, setTheme] = useState("retro");
  const [centerSignal, setCenterSignal] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState("");

  // derived data: recomputed only when the picture or detail level changes
  const size = useMemo(() => fitSize(source), [source]);
  const cell = DETAIL[detail];
  const grid = useMemo(
    () => buildGrid(source, size, cell),
    [source, size, cell],
  );

  // theme class on <body> drives the CSS variables
  useEffect(() => {
    document.body.classList.toggle("matrix", theme === "matrix");
  }, [theme]);

  const loadFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file),
      img = new Image();
    img.onload = () => {
      setSource(img);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const openAuth = (notice = "") => {
    setAuthNotice(notice);
    setAuthOpen(true);
  };

  return (
    <>
      <MatrixRain active={theme === "matrix"} />

      <header className="topbar">
        <h1>PIXEL ASCII</h1>
        <div className="ctrl">
          <UserBar onLogin={() => openAuth()} />
        </div>
      </header>
      <p className="sub">Drag the picture across the line</p>

      <div className="panel">
        <Board
          source={source}
          size={size}
          grid={grid}
          cell={cell}
          color={color}
          theme={theme}
          centerSignal={centerSignal}
          onFile={loadFile}
        />
        <Controls
          detail={detail}
          onDetail={setDetail}
          color={color}
          onToggleColor={() => setColor((c) => !c)}
          theme={theme}
          onTheme={setTheme}
          onCenter={() => setCenterSignal((s) => s + 1)}
          onFile={loadFile}
          grid={grid}
          cell={cell}
          onNeedLogin={openAuth}
        />
      </div>

      <AuthModal
        open={authOpen}
        notice={authNotice}
        onClose={() => setAuthOpen(false)}
      />
    </>
  );
}
