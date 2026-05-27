import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const lightTheme = {
  bg: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  subtext: '#64748b',
  border: '#f1f5f9',
  inputBg: '#f8fafc',
  iconBg: '#eef2ff',
  tabBar: '#ffffff',
};

export const darkTheme = {
  bg: '#0f172a',
  card: '#1e293b',
  text: '#f1f5f9',
  subtext: '#94a3b8',
  border: '#334155',
  inputBg: '#334155',
  iconBg: '#312e81',
  tabBar: '#1e293b',
};

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = () => setIsDark(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}
