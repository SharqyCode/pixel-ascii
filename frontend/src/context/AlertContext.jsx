import { createContext, useCallback, useContext, useState } from 'react';
import AlertDialog from '../components/AlertDialog.jsx';

// Themed replacement for window.alert(). Call showAlert(message) from anywhere.
const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [message, setMessage] = useState(null);
  const showAlert = useCallback(msg => setMessage(msg), []);
  const closeAlert = useCallback(() => setMessage(null), []);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {message !== null && <AlertDialog message={message} onClose={closeAlert} />}
    </AlertContext.Provider>
  );
}

export const useAlert = () => useContext(AlertContext);
