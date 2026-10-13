import '@arvo/tokens/css';
import '@arvo/assets/o9con/css';
import '@arvo/assets/o9illus/css';
import '@arvo/assets/fonts/css';
import '@arvo/styles/css';
import './filters/filters.scss';
import { Filters } from './filters/Filters';

const container = document.getElementById('app');
if (!container) throw new Error('Missing #app container');

new Filters({ container });
