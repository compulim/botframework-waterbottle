module.exports = {
  plugins: [
    '@babel/proposal-object-rest-spread'
  ],
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: '10'
      },
      modules: 'commonjs'
    }]
  ]
};
