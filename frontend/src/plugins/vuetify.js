import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import { createVuetify } from 'vuetify';

export default createVuetify({
  icons: { defaultSet: 'mdi' },
  theme: {
    defaultTheme: 'chateau',
    themes: {
      chateau: {
        dark: true,
        colors: {
          background: '#0a0807',
          surface: '#1d1714',
          primary: '#ffb347',
          secondary: '#c9a24a',
          success: '#7fae6a',
          warning: '#ffb347',
          error: '#c0232f',
          info: '#5a6fa8',
        },
      },
    },
  },
});
