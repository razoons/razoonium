import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import { createVuetify } from 'vuetify';

export default createVuetify({
  icons: { defaultSet: 'mdi' },
  theme: {
    defaultTheme: 'razoonium',
    themes: {
      razoonium: {
        dark: true,
        colors: {
          background: '#04060d',
          surface: '#0a1226',
          primary: '#00f0ff',
          secondary: '#ff2bd6',
          success: '#9dff4a',
          warning: '#ffb020',
          error: '#ff4d6d',
          info: '#8a7dff',
        },
      },
    },
  },
});
