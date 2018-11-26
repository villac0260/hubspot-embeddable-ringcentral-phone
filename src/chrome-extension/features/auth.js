/**
 * auth related feature
 */

import {thirdPartyConfigs} from '../common/app-config'
import logo from '../common/rc-logo'
import {
  createElementFromHTML,
  findParentBySel,
  lsKeys
} from '../common/helpers'
import _ from 'lodash'
import * as ls from '../common/ls'

let {
  serviceName
} = thirdPartyConfigs

window.rc = {
  local: {
    refreshToken: null,
    accessToken: null,
    expireTime: null
  },
  postMessage: data => {
    document.querySelector('#rc-widget-adapter-frame')
      .contentWindow
      .postMessage(data, '*')
  },
  currentUserId: '',
  rcLogined: false,
  cacheKey: 'contacts' + '_' + '',
  updateToken: async (newToken, type = 'apiKey') => {
    if (!newToken){
      await ls.clear()
      window.rc.local = {
        refreshToken: null,
        accessToken: null,
        expireTime: null
      }
    } else if (_.isString(newToken)) {
      window.rc.local[type] = newToken
      let key = lsKeys[`${type}LSKey`]
      await ls.set(key, newToken)
    } else {
      Object.assign(window.rc.local, newToken)
      let ext = Object.keys(newToken)
        .reduce((prev, key) => {
          prev[lsKeys[`${key}LSKey`]] = newToken[key]
          return prev
        }, {})
      await ls.set(ext)
    }
  }
}

function hideAuthBtn() {
  let dom = document.querySelector('.rc-auth-button-wrap')
  dom && dom.classList.add('rc-hide-to-side')
}

export function showAuthBtn() {
  let dom = document.querySelector('.rc-auth-button-wrap')
  dom && dom.classList.remove('rc-hide-to-side')
}

function handleAuthClick(e) {
  let {target} = e
  let {classList}= target
  if (findParentBySel(target, '.rc-auth-btn')) {
    doAuth()
  } else if (classList.contains('rc-dismiss-auth')) {
    hideAuthBtn()
  }
}

function doAuth() {
  if (window.rc.local.apiKey) {
    return
  }
  window.rc.updateToken('true')
  notifyRCAuthed()
  hideAuthBtn()
}

export function notifyRCAuthed(authorized = true) {
  window.rc.postMessage({
    type: 'rc-adapter-update-authorization-status',
    authorized
  }, '*')
}

export async function unAuth() {
  await window.rc.updateToken('')
  notifyRCAuthed(false)
}

export function renderAuthButton() {
  let btn = createElementFromHTML(
    `
      <div class="rc-auth-button-wrap animate rc-hide-to-side">
        <span class="rc-auth-btn">
          <span class="rc-iblock">Auth</span>
          <img class="rc-iblock" src="${logo}" />
          <span class="rc-iblock">access ${serviceName} data</span>
        </span>
        <div class="rc-auth-desc rc-pd1t">
          After auth, you can access ${serviceName} contacts from RingCentral phone's contacts list. You can revoke access from RingCentral phone's setting.
        </div>
        <div class="rc-pd1t">
          <span class="rc-dismiss-auth" title="dismiss">&times;</span>
        </div>
      </div>
    `
  )
  btn.onclick = handleAuthClick
  if (
    !document.querySelector('.rc-auth-button-wrap')
  ) {
    document.body.appendChild(btn)
  }
}
