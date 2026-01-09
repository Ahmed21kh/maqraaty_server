module.exports = {
  // ...
  packagerConfig: {
    icon: '/dist/maqraaty_2/browser/favicon.ico' // no file extension required
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        certificateFile: './cert.pfx',
        certificatePassword: process.env.CERTIFICATE_PASSWORD
      }
    }
  ]
  // ...
}