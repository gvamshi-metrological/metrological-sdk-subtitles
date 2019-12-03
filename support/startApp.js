const style = document.createElement('style')
document.head.appendChild(style)
style.sheet.insertRule(
  '@media all { *,body {margin:0; padding:0;} canvas { position: absolute; z-index: 2; } body { background: black;} }'
)

window.startApp = function(appSettings, platformSettings, appData) {
  console.time('app')

  let appMetadata
  sequence([
    () => getAppMetadata().then(metadata => (appMetadata = metadata)),
    () => loadJS('./dist/lightning.js'),
    () => loadJS('./dist/appBundle.js'),
    () =>
      platformSettings.inspector === true
        ? loadJS('./dist/lightning-inspect.js').then(() => window.attachInspector(window.lng))
        : Promise.resolve(),
    () => {
      console.time('app2')
      platformSettings.appMetadata = appMetadata
      const app = window[appMetadata.id](appSettings, platformSettings, appData)
      document.body.appendChild(app.stage.getCanvas())
    },
  ])
}

const getAppMetadata = () => {
  return new Promise(resolve => {
    var xhr = new XMLHttpRequest()
    xhr.onreadystatechange = function() {
      if (xhr.readyState == XMLHttpRequest.DONE) {
        const metadata = JSON.parse(xhr.responseText)
        metadata.id = 'APP_' + metadata.identifier.replace(/[^0-9a-zA-Z_$]/g, '_')
        resolve(metadata)
      }
    }
    xhr.open('GET', './metadata.json')
    xhr.send(null)
  })
}

const loadJS = (url, id) => {
  return new Promise(resolve => {
    console.log('loadJS', url)
    const tag = document.createElement('script')
    tag.onload = resolve
    tag.src = url

    if (id) tag.id = id

    document.body.appendChild(tag)
  })
}

const sequence = steps => {
  return steps.reduce((promise, method) => {
    return promise.then(() => method())
  }, Promise.resolve(null))
}
