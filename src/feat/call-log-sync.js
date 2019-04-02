/**
 * call log sync feature
 */

import {thirdPartyConfigs} from 'ringcentral-embeddable-extension-common/src/common/app-config'
import {createForm} from './call-log-sync-form'
import extLinkSvg from 'ringcentral-embeddable-extension-common/src/common/link-external.svg'
import {
  showAuthBtn
} from './auth'
import _ from 'lodash'
import {getContacts} from './contacts'
import {
  notify,
  host,
  formatPhone
} from 'ringcentral-embeddable-extension-common/src/common/helpers'
import fetchBg from 'ringcentral-embeddable-extension-common/src/common/fetch-with-background'
import {commonFetchOptions, rc, getPortalId} from './common'

let {
  showCallLogSyncForm,
  serviceName,
  apiServerHS
} = thirdPartyConfigs

// function getPortalId() {
//   let dom = document.querySelector('.navAccount-portalId')
//   return dom
//     ? dom.textContent.trim()
//     : ''
// }

function notifySyncSuccess({
  id
}) {
  let type = 'success'
  let portalId = getPortalId()
  let url = `${host}/contacts/${portalId}/contact/${id}/?interaction=call`
  let msg = `
    <div>
      <div class="rc-pd1b">
        Call log synced to hubspot!
      </div>
      <div class="rc-pd1b">
        <a href="${url}" target="_blank">
          <img src="${extLinkSvg}" width=16 height=16 class="rc-iblock rc-mg1r" />
          <span class="rc-iblock">
            Check contact activities
          </span>
        </a>
      </div>
    </div>
  `
  notify(msg, type, 9000)
}

export async function syncCallLogToThirdParty(body) {
  // let result = _.get(body, 'call.result')
  // if (result !== 'Call connected') {
  //   return
  // }
  // console.log('logsync body', body)
  let isManuallySync = !body.triggerType
  let isAutoSync = body.triggerType === 'callLogSync'
  if (!isAutoSync && !isManuallySync) {
    return
  }
  if (!rc.local.accessToken) {
    return isManuallySync ? showAuthBtn() : null
  }
  if (showCallLogSyncForm && isManuallySync) {
    return createForm(
      body.call,
      serviceName,
      (formData) => doSync(body, formData)
    )
  } else {
    doSync(body, {})
  }
}

async function getContactId(body) {

  let obj = _.find(
    [
      ..._.get(body, 'call.toMatches') || [],
      ..._.get(body, 'call.fromMatches') || []
    ],
    m => m.type === serviceName
  )
  if (obj) {
    return obj
  }

  let nf = _.get(body, 'to.phoneNumber') || _.get(body.call, 'to.phoneNumber')
  let nt = _.get(body, 'from.phoneNumber') || _.get(body.call, 'from.phoneNumber')
  nf = formatPhone(nf)
  nt = formatPhone(nt)
  let contacts = await getContacts()
  let res = _.find(
    contacts,
    contact => {
      let {
        phoneNumbers
      } = contact
      return _.find(phoneNumbers, nx => {
        let t = formatPhone(nx.phoneNumber)
        return nf === t || nt === t
      })
    }
  )
  return res
}

function getEmail() {
  let emailDom = document.querySelector('.user-info-email')
  if (!emailDom) {
    return ''
  }
  return emailDom.textContent.trim()
}

async function getOwnerId() {
  let pid = getPortalId()
  let url = `${apiServerHS}/login-verify/hub-user-info?early=true&portalId=${pid}`
  let res = await fetchBg(url, {
    headers: commonFetchOptions().headers
  })
  // let res = await fetch.get(url, commonFetchOptions())
  let ownerId = ''
  if (res && res.user) {
    ownerId = _.get(res, 'user.user_id')
  } else {
    console.log('fetch ownerId error')
    console.log(res)
  }
  return ownerId
}

async function doSync(body, formData) {
  let {id: contactId} = await getContactId(body)
  if (!contactId) {
    return notify('no related contact', 'warn')
  }
  let ownerId = await getOwnerId()
  if (!ownerId) {
    return
  }
  let email = getEmail()
  let now = + new Date()
  let contactIds = [contactId]
  let toNumber = _.get(body, 'call.to.phoneNumber')
  let fromNumber = _.get(body, 'call.from.phoneNumber')
  let status = 'COMPLETED'
  let durationMilliseconds = body.call.duration * 1000
  let externalId = body.id || body.call.sessionId
  let data = {
    engagement: {
      active: true,
      ownerId,
      type: 'CALL',
      timestamp: now
    },
    associations: {
      contactIds,
      companyIds: [],
      dealIds: [],
      ownerIds: []
    },
    attachments: [],
    metadata: {
      externalId,
      body: formData.description,
      toNumber,
      fromNumber,
      status,
      durationMilliseconds
    }
  }

  let url = `${apiServerHS}/engagements/v1/engagements/?portalId=4920570&clienttimeout=14000`
  let res = await fetchBg(url, {
    method: 'post',
    body: data,
    headers: {
      ...commonFetchOptions().headers,
      'X-Source': 'CRM_UI',
      'X-SourceId': email
    }
  })
  //let res = await fetch.post(url, data, commonFetchOptions())
  if (res && res.engagement) {
    notifySyncSuccess({id: contactId})
  } else {
    notify('call log sync to hubspot failed', 'warn')
    console.log('post engagements/v1/engagements error')
    console.log(res)
  }
}
