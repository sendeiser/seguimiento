import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    try {
      localStorage.setItem('theme', 'light');
    } catch (e) {}
  }, []);

  const toggleTheme = () => {
    setTheme('light');
    try {
      localStorage.setItem('theme', 'light');
    } catch (e) {}
  };

  const setLightTheme = () => setTheme('light');
  const setDarkTheme = () => setTheme('light');

  return (
    <ThemeContext.Provider value={{
      theme: 'light',
      setTheme,
      toggleTheme,
      setLightTheme,
      setDarkTheme,
      isDark: false,
      isLight: true
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};