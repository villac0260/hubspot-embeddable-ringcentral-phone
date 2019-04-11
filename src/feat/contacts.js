/**
 * third party contacts related feature
 */

import _ from 'lodash'
import loadingImg from 'ringcentral-embeddable-extension-common/src/common/loading.svg'
import {setCache, getCache} from 'ringcentral-embeddable-extension-common/src/common/cache'
import {
  showAuthBtn,
  notifyRCAuthed
} from './auth'
import {
  popup,
  createElementFromHTML,
  formatPhone,
  host,
  notify
} from 'ringcentral-embeddable-extension-common/src/common/helpers'
import {rc, getPortalId, getCSRFToken} from './common'
import {thirdPartyConfigs} from 'ringcentral-embeddable-extension-common/src/common/app-config'
import {jsonHeader} from 'ringcentral-embeddable-extension-common/src/common/fetch'
import fetchBg from 'ringcentral-embeddable-extension-common/src/common/fetch-with-background'

let {
  serviceName,
  apiServerHS
} = thirdPartyConfigs

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
/**
 * click contact info panel event handler
 * @param {Event} e
 */
function onClickContactPanel (e) {
  let {target} = e
  let {classList} = target
  if (classList.contains('rc-close-contact')) {
    document
      .querySelector('.rc-contact-panel')
      .classList.add('rc-hide-contact-panel')
  }
}

function onloadIframe () {
  let dom = document
    .querySelector('.rc-contact-panel')
  dom && dom.classList.add('rc-contact-panel-loaded')
}

/**
 * search contacts by number match
 * @param {array} contacts
 * @param {string} keyword
 */
export function findMatchContacts(contacts = [], numbers) {
  let {formatedNumbers, formatNumbersMap} = numbers.reduce((prev, n) => {
    let nn = formatPhone(n)
    prev.formatedNumbers.push(nn)
    prev.formatNumbersMap[nn] = n
    return prev
  }, {
    formatedNumbers: [],
    formatNumbersMap: {}
  })
  let res = contacts.filter(contact => {
    let {
      phoneNumbers
    } = contact
    return _.find(phoneNumbers, n => {
      return formatedNumbers
        .includes(
          formatPhone(n.phoneNumber)
        )
    })
  })
  return res.reduce((prev, it) => {
    let phone = _.find(it.phoneNumbers, n => {
      return formatedNumbers.includes(
        formatPhone(n.phoneNumber)
      )
    })
    let num = phone.phoneNumber
    let key = formatNumbersMap[
      formatPhone(num)
    ]
    if (!prev[key]) {
      prev[key] = []
    }
    let res = {
      id: it.id, // id to identify third party contact
      type: serviceName, // need to same as service name
      name: it.name,
      phoneNumbers: it.phoneNumbers
    }
    prev[key].push(res)
    return prev
  }, {})
}


/**
 * search contacts by keyword
 * @param {array} contacts
 * @param {string} keyword
 */
export function searchContacts(contacts = [], keyword) {
  return contacts.filter(contact => {
    let {
      name,
      phoneNumbers
    } = contact
    return name.includes(keyword) ||
      _.find(phoneNumbers, n => {
        return n.phoneNumber.includes(keyword)
      })
  })
}

/**
 * build name from contact info
 * @param {object} contact
 * @return {string}
 */
function buildName(contact) {
  let firstname = _.get(
    contact,
    'properties.firstname.value'
  ) || ''
  let lastname = _.get(
    contact,
    'properties.lastname.value'
  ) || ''
  let name = firstname || lastname ? firstname + ' ' + lastname : 'noname'
  return {
    name,
    firstname,
    lastname
  }
}

/**
 * build email
 * @param {Object} contact
 */
function buildEmail(contact) {
  for (let f of contact['identity-profiles']) {
    for (let g of f.identities) {
      if (g.type === 'EMAIL') {
        return [g.value]
      }
    }
  }
  return []
}

/**
 * build phone numbers from contact info
 * @param {object} contact
 * @return {array}
 */
function buildPhone(contact) {
  let phoneNumber = _.get(contact, 'properties.phone.value')
  let mobile = _.get(contact, 'properties.mobilephone.value')
  let res = []
  if (phoneNumber) {
    res.push({
      phoneNumber,
      phoneType: 'directPhone'
    })
  }
  if (mobile) {
    res.push({
      phoneNumber: mobile,
      phoneType: 'directPhone'
    })
  }
  return res
}

/**
 * convert hubspot contacts to ringcentral contacts
 * @param {array} contacts
 * @return {array}
 */
function formatContacts(contacts) {
  return contacts.map(contact => {
    return {
      id: contact.vid,
      ...buildName(contact),
      type: serviceName,
      emails: buildEmail(contact),
      phoneNumbers: buildPhone(contact),
      portalId: contact['portal-id']
    }
  })
}

/**
 * get contact list, one single time
 *
 * Request URL: https://api.hubspot.com/contacts/search/v1/search/contacts?resolveOwner=false&showSourceMetadata=false&identityProfileMode=all&showPastListMemberships=false&formSubmissionMode=none&showPublicToken=false&propertyMode=value_only&showAnalyticsDetails=false&resolveAssociations=false&portalId=4920570&clienttimeout=14000
Request Method: POST
Status Code: 200 
Remote Address: 104.16.252.5:443
Referrer Policy: no-referrer-when-downgrade
access-control-allow-credentials: false
cf-ray: 4c075411da2295ef-SJC
content-encoding: br
content-type: application/json;charset=utf-8
date: Mon, 01 Apr 2019 03:03:10 GMT
expect-ct: max-age=604800, report-uri="https://report-uri.cloudflare.com/cdn-cgi/beacon/expect-ct"
server: cloudflare
status: 200
strict-transport-security: max-age=31536000; includeSubDomains; preload
x-trace: 2B60804C6252CCB7E03A4B80ED288C2CE6C759A75E000000000000000000
Provisional headers are shown
Accept: application/json, text/javascript, ; q=0.01
content-type: application/json
Origin: https://api.hubspot.com
Referer: https://api.hubspot.com/cors-preflight-iframe/
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Safari/537.36
X-HS-Referer: https://app.hubspot.com/contacts/4920570/contacts/list/view/all/?
X-HubSpot-CSRF-hubspotapi: PZpN8Tvb7erQooRpVlIdpA
resolveOwner: false
showSourceMetadata: false
identityProfileMode: all
showPastListMemberships: false
formSubmissionMode: none
showPublicToken: false
propertyMode: value_only
showAnalyticsDetails: false
resolveAssociations: false
portalId: 4920570
clienttimeout: 14000
{offset: 0, count: 100, filterGroups: [{filters: []}], properties: [],…}
count: 100
filterGroups: [{filters: []}]
offset: 0
properties: []
query: ""
sorts: [{property: "createdate", order: "DESC"}, {property: "vid", order: "DESC"}]

 */
async function getContact(
  vidOffset = 0,
  count = 100
) {
  let portalId = getPortalId()
  //https://api.hubapi.com/contacts/v1/lists/all/contacts/all
  //  let url =`${apiServerHS}/contacts/v1/lists/all/contacts/all?count=${count}&vidOffset=${vidOffset}&property=firstname&property=phone&property=lastname&property=mobilephone&property=company`

  let url =`${apiServerHS}/contacts/search/v1/search/contacts?resolveOwner=false&showSourceMetadata=false&identityProfileMode=all&showPastListMemberships=false&formSubmissionMode=none&showPublicToken=false&propertyMode=value_only&showAnalyticsDetails=false&resolveAssociations=false&portalId=${portalId}&clienttimeout=14000`
  let data = {
    offset: vidOffset,
    count,
    filterGroups: [
      {
        filters: []
      }
    ],
    //properties: [],
    properties: ['firstname', 'phone', 'lastname', 'mobilephone', 'company'],
    sorts: [
      {
        property: 'createdate',
        order: 'DESC'
      }, {
        property: 'vid',
        order: 'DESC'
      }
    ],
    query: ''
  }
  let headers = {
    ...jsonHeader,
    Accept: 'application/json, text/javascript, */*; q=0.01',
    'X-HS-Referer': window.location.href,
    'X-HubSpot-CSRF-hubspotapi': getCSRFToken()
  }
  let res = await fetchBg(url, {
    body: data,
    headers,
    method: 'post'
  })
  if (res && res.contacts) {
    return res
  } else {
    console.log('fetch contacts error')
    console.log(res)
    return {
      contacts: [],
      'has-more': false,
      'offset': vidOffset
    }
  }
}

/**
 * get contact lists
 */
export const getContacts = _.debounce(async (noCache) => {
  if (!rc.rcLogined) {
    return []
  }
  if (!rc.local.accessToken) {
    showAuthBtn()
    return []
  }
  let cached = noCache
    ? null
    : await getCache(rc.cacheKey)
  if (cached) {
    console.log('use cache')
    renderRefreshContacts()
    return cached
  }
  rc.isFetchingContacts = true
  let contacts = []
  let res = await getContact()
  contacts = [
    ...contacts,
    ...res.contacts
  ]
  let reqCount = 0
  let shouldWait = reqCount > 7
  let hasMore = res['has-more']
  rc.shouldWait = shouldWait
  let expire = 10000
  if (hasMore) {
    expire = 1000 * 60 * 60 * 24 * 30
  }
  while (res['has-more']) {
    if (reqCount === 3) {
      notify('Fetching contacts...may take some time, please wait', 'info', 99999999)
    }
    reqCount ++
    if (reqCount > 6) {
      await delay(6000)
    }
    res = await getContact(res['offset'])
    contacts = [
      ...contacts,
      ...res.contacts
    ]
    hasMore = res['has-more']
  }
  rc.isFetchingContacts = false
  let final = formatContacts(contacts)
  await setCache(rc.cacheKey, final, expire)
  if (reqCount >= 5) {
    notify('Fetching contacts done', 'info', 500)
  }
  renderRefreshContacts()
  if (!noCache) {
    notifyRCAuthed(false)
    setTimeout(notifyRCAuthed, 50)
  }
  return final
}, 100, {
  leading: true
})


function renderRefreshContacts() {
  if (rc.isFetchingContacts) {
    return
  }
  let refreshContactsBtn = document.getElementById('rc-reload-contacts')
  if (refreshContactsBtn) {
    return
  }
  let elem = createElementFromHTML(
    `
    <img
      src="${loadingImg}"
      class="rc-reload-contacts"
      id="rc-reload-contacts"
      width=16
      height=16
      title="reload contacts"
    />
    `
  )
  elem.onclick = () => {
    elem.remove()
    getContacts(true)
  }
  document.body.appendChild(elem)
}

export function hideContactInfoPanel() {
  let dom = document
    .querySelector('.rc-contact-panel')
  dom && dom.classList.add('rc-hide-contact-panel')
}

/**
 * show caller/callee info
 * @param {Object} call
 */
export async function showContactInfoPanel(call) {
  if (
    !call ||
    !call.telephonyStatus ||
    call.direction === 'Outbound' ||
    call.telephonyStatus === 'CallConnected'
  ) {
    return
  }
  if (call.telephonyStatus === 'NoCall') {
    return hideContactInfoPanel()
  }
  popup()
  let isInbound = call.direction === 'Inbound'
  let phone = isInbound
    ? _.get(
      call,
      'from.phoneNumber'
    )
    : _.get(call, 'to.phoneNumber')
  if (!phone) {
    return
  }
  phone = formatPhone(phone)
  let contacts = await getContacts()
  let contact = _.find(contacts, c => {
    return _.find(c.phoneNumbers, p => {
      return formatPhone(p.phoneNumber) === phone
    })
  })
  if (!contact) {
    return
  }
  // let contactTrLinkElem = canShowNativeContact(contact)
  // if (contactTrLinkElem) {
  //   return showNativeContact(contact, contactTrLinkElem)
  // }
  let url = `${host}/contacts/${contact.portalId}/contact/${contact.id}/?interaction=note`
  let elem = createElementFromHTML(
    `
    <div class="animate rc-contact-panel" draggable="false">
      <div class="rc-close-box">
        <div class="rc-fix rc-pd2x">
          <span class="rc-fleft">Contact</span>
          <span class="rc-fright">
            <span class="rc-close-contact">&times;</span>
          </span>
        </div>
      </div>
      <div class="rc-contact-frame-box">
        <iframe scrolling="no" class="rc-contact-frame" sandbox="allow-same-origin allow-scripts allow-forms allow-popups" allow="microphone" src="${url}" id="rc-contact-frame">
        </iframe>
      </div>
      <div class="rc-loading">loading...</div>
    </div>
    `
  )
  elem.onclick = onClickContactPanel
  elem.querySelector('iframe').onload = onloadIframe
  let old = document
    .querySelector('.rc-contact-panel')
  old && old.remove()

  document.body.appendChild(elem)
  //moveWidgets()
}
