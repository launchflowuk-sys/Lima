module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // react-native-worklets/plugin is the Reanimated 4 (SDK 54) plugin and MUST be last.
    plugins: ["react-native-worklets/plugin"],
  };
};
