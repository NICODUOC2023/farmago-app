/**
 * Config dinámica de Expo.
 *
 * `app.json` no interpola `process.env.*`: los valores se pasarían literales
 * (p. ej. la key quedaría como "process.env.ANDROID_MAPS_API_KEY"). Por eso
 * los plugins que dependen de variables de entorno se resuelven acá.
 *
 * `config` es la configuración estática leída de `app.json`; la devolvemos con
 * los ajustes necesarios para EAS/local.
 */

module.exports = ({ config }) => {
  const androidMapsKey = process.env.ANDROID_MAPS_API_KEY;
  const iosMapsKey = process.env.IOS_MAPS_API_KEY;

  const mapsProps = {};
  if (androidMapsKey) {
    mapsProps.androidGoogleMapsApiKey = androidMapsKey;
  }
  if (iosMapsKey) {
    mapsProps.iosGoogleMapsApiKey = iosMapsKey;
  }

  const plugins = (config.plugins ?? []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'react-native-maps') {
      return ['react-native-maps', mapsProps];
    }
    return plugin;
  });

  return {
    ...config,
    plugins,
  };
};
