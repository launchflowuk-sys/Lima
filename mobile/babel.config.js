module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Reanimated 4 ships worklets separately — the worklets plugin MUST be last.
    plugins: ["react-native-worklets/plugin"],
  };
};
