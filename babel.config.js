module.exports = function (api) {
    api.cache(true);

    const presets = [
        "@babel/preset-env",
        // "@babel/preset-flow"
    ];
    const plugins = [
        [
            require.resolve('babel-plugin-module-resolver'),
            {
                root: ["./"],
                alias: {
                    "avni-models": "./node_modules/openchs-models"
                }
            }
        ],
        ["inline-json-import", {}],
        [
            "@babel/plugin-proposal-decorators",
            {
                "legacy": true
            }
        ],
        "@babel/plugin-proposal-class-properties",
        "@babel/plugin-proposal-export-default-from"
    ];

    const sourceMaps = true;

    return {
        presets,
        plugins,
        sourceMaps
    };
};
