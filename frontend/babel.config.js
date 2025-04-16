module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Ensure the 'plugins' array related to react-native-dotenv is removed.
    // If you had other plugins, keep them. If not, you might not need the plugins array at all.
  };
};
