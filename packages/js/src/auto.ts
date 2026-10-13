/**
 * Self-registering entry point -- importing this module augments the global
 * jQuery instance (`$` / `jQuery`) with all `$.fn.arvo*` component plugins and
 * the overlay helpers.
 *
 * Usage (AMD / RequireJS):
 *   require(['@arvo/js/auto'], function () {
 *     $('#my-btn').arvoButton({ variant: 'primary' });
 *   });
 *
 * Usage (ES module):
 *   import '@arvo/js/auto';
 *   $('#my-btn').arvoButton({ variant: 'primary' });
 */
import $ from 'jquery';
import { registerArvoPlugins } from './plugin';

registerArvoPlugins($);
