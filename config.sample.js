/**
 * config sample file
 * use `cp config.sample.js config.js` to create a config
 *
 */
module.exports = {

  //// dev related

  // local dev server port
  // devPort: 8020,

  // build process count
  // devCPUCount: os.cpus().length,

  //// build options

  // minimize content.js
  // minimize: false

  // congfigs to build app

  //// ringcentral config

  //ringcentral config
  ringCentralConfigs: {
    clientID: 'ZMgsqZICQXWCgL7WEa1Xug',
    clientSecret: 'Md_AbUIOSzu21DeoeSKJogAp1FE6xeQ5eF09HNXSkMHA',
    appServer: 'https://platform.ringcentral.com'
  },


  //// for third party related
  thirdPartyConfigs: {

    // hubspot app auth server, not required
    // appServerHS: 'https://app.hubspot.com',

    // hubspot app api server, not required
    // apiServerHS: 'https://app.hubspot.com',

    // show call log sync desc form or not
    // showCallLogSyncForm: true
  },

  //// content modification for click to call feature
  /*
  insertClickToCallButton: [
    {
      urlCheck: href => {
        return href.includes('?interaction=call')
      },
      parentToInsertButton: [
        () => {
          return document.querySelector('.start-call').parentNode
        },
        () => {
          return document
            .querySelector('.panel-is-call button [data-key="twilio.notEnabled.skipOnboarding"]')
            .parentNode.parentNode
        }
      ],
      insertMethod: [
        'insertBefore',
        'append'
      ]
    }
  ],
  hoverShowClickToCallButton: [
    {
      urlCheck: href => {
        return href.includes('contacts/list/view/all/')
      },
      selector: 'table.table tbody tr'
    }
  ]
  */

 clientID: 'n2Hbs3xyRW6PlCgAJ5tV5A',
 appServer: '	https://platform.devtest.ringcentral.com',

}




