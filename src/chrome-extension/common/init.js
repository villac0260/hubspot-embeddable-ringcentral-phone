

import initThirdPartyApi from '../features/third-party-api'
import insertClickToCall from '../features/insert-click-to-call-button'
import addHoverEvent from '../features/hover-to-show-call-button'
import convertPhoneLink from '../features/make-phone-number-clickable'
import {
  popup
} from './helpers'
import './style.styl'
import './custom.styl'

function registerService() {

  // handle contacts sync feature
  initThirdPartyApi()

  // insert click-to-call button
  insertClickToCall()

  // add event handler to developer configed element, show click-to-dial tooltip to the elements
  addHoverEvent()

  // convert phonenumber text to click-to-dial link
  convertPhoneLink()

}

export default () => {
  // Listen message from background.js to open app window when user click icon.
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.action === 'openAppWindow') {
        popup()
      }
      sendResponse('ok')
    }
  )
  registerService()
}
