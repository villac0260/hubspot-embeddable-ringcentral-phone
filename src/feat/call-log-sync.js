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
  let portalId = getPortalId()
  let url = `${apiServerHS}/engagements/v1/engagements/?portalId=${portalId}&clienttimeout=14000`
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

/*
Request URL: https://api.hubspot.com/contacts/search/v1/search/engagements?portalId=4920570&clienttimeout=14000
Request Method: POST
Status Code: 200 
Remote Address: 127.0.0.1:1080
Referrer Policy: no-referrer-when-downgrade
access-control-allow-credentials: false
cf-ray: 4cef16ebda7a341b-HKG
content-encoding: br
content-type: application/json;charset=utf-8
date: Mon, 29 Apr 2019 06:06:22 GMT
expect-ct: max-age=604800, report-uri="https://report-uri.cloudflare.com/cdn-cgi/beacon/expect-ct"
server: cloudflare
status: 200
strict-transport-security: max-age=31536000; includeSubDomains; preload
vary: Accept-Encoding
x-trace: 2B74CE7B332FE67C9024898F15D26F94726C621587000000000000000000
Provisional headers are shown
Accept: application/json, text/javascript, *; q=0.01
content-type: application/json
Origin: https://api.hubspot.com
Referer: https://api.hubspot.com/cors-preflight-iframe/
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36
X-HS-Referer: https://app.hubspot.com/reports-dashboard/4920570/sales
X-HubSpot-CSRF-hubspotapi: 4MzzO2ABOkozm1xSiqRV8Q
portalId: 4920570
clienttimeout: 14000

{
  "query":"",
  "count":20,
  "offset":0,
  "filterGroups":[
    {
      "filters":[
      {
        "property":"engagement.createdAt","operator":"ROLLING_DATE_RANGE",
        "inclusive":false,
        "timeUnitCount":30,
        "timeUnit":"DAY"
      }
    ]
  }],
  "sorts":[
    {
      "property":"engagement.createdAt",
      "order":"DESC"
    }
  ],
  "properties":[]
}

*/
export async function findMatchCallLog(data) {
  let portalId = getPortalId()
  let url = `${apiServerHS}/contacts/search/v1/search/engagements?portalId=${portalId}&clienttimeout=14000`
  let body = {
    query: '',
    count: 100,
    offset: 0,
    filterGroups:[
      {
        filters: [
          {
            property: 'engagement.createdAt',
            operator: 'HAS_PROPERTY'
          }
        ]
      }
    ],
    sorts: [
      {
        property: 'engagement.createdAt',
        order: 'DESC'
      }
    ],
    properties: []
  }
  let sessionIds = _.get(data, 'body.sessionIds') || []
  let res = await fetchBg(url, {
    method: 'post',
    body,
    headers: {
      ...commonFetchOptions().headers
    }
  })
  if (!res || !res.engagements) {
    return
  }
  let x = res.engagements.reduce((prev, en) => {
    let sid = _.get(en, 'metadata.externalId')
    let id = _.get(en, 'engagement.id')
    let note = _.get(en, 'engagement.bodyPreview')
    if (!sessionIds.includes(sid)) {
      return prev
    }
    prev[sid] = prev[sid] || []
    prev[sid].push({
      id,
      note
    })
    return prev
  }, {})
  return x
}
