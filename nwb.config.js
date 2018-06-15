module.exports = {
  type: 'react-component',
  npm: {
    esModules: true,
    umd: {
      global: 'featureViewer',
      externals: {
        react: 'React'
      }
    }
  }
}
