// main.jsx
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { useHotkeys, useLocalStorage } from '@mantine/hooks';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './pages/Home/Home';
import HomeAdmin from './pages/HomeAdmin/HomeAdmin';
import Menu from './pages/AMenu/Menu';
import '@fontsource/poppins';

function MainApp() {
  const [colorScheme, setColorScheme] = useLocalStorage({
    key: 'mantine-color-scheme',
    defaultValue: 'light',
    getInitialValueInEffect: true,
  });

  const toggleColorScheme = () =>
    setColorScheme((current) => (current === 'dark' ? 'light' : 'dark'));

  useHotkeys([['mod+J', () => toggleColorScheme()]]);

  useEffect(() => {
    document.body.setAttribute('data-mantine-color-scheme', colorScheme);
  }, [colorScheme]);

  return (
    <MantineProvider
      withGlobalStyles
      withNormalizeCSS
      theme={{
        colorScheme,
        fontFamily: 'Poppins, sans-serif',
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Menu />} />
          <Route path="/client" element={<App toggleColorScheme={toggleColorScheme} colorScheme={colorScheme} />} />
          <Route path="/admin" element={<HomeAdmin />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<MainApp />);
