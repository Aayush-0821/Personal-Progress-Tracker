const path = require("path");

module.exports = {
  packagerConfig: {
    name: "Momentum",
    productName: "Momentum",

    icon: path.resolve(
      __dirname,
      "assets",
      "icon.ico"
    ),

    asar: true,

    extraResource: [
      path.resolve(
        __dirname,
        "dist",
        "app"
      )
    ]
  },

  makers: [
    {
      name: "@electron-forge/maker-squirrel",

      config: {
        name: "Momentum",

        setupExe: "Momentum Setup.exe",

        setupIcon: path.resolve(
          __dirname,
          "assets",
          "icon.ico"
        ),

        authors: "aayush",

        description:
          "Desktop daily progress tracking app"
      }
    }
  ]
};