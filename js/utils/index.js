/** @format */

/**
 * request 方法
 * @param url
 * @param data
 */
function request(url, data) {
  const {headers, token, ...others} = data;
  return fetch(libBasicLibConfig.basicUrl + url, {
    headers: {
      token,
      ...headers,
    },
    ...others,
  }).then(response => response.json());
}

/**
 * 校验当前url
 * @param url
 */
function testCurrentTabUrl(url) {
  try {
    const origin = new URL(url).origin;
    const reg = /^(https?):\/\/([.\w-_]*?)\.(([^.]+)\.)\.([.\w-_]+)$/;
    if (reg.test(origin)) {
      return {
        origin: origin,
        env: RegExp.$4,
        cid: RegExp.$5,
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * 节流
 * @param fn
 * @param delay number
 */
function throttle(fn, delay = 500) {
  let canRun = true;
  return (...rest) => {
    if (!canRun) return;
    canRun = false;
    setTimeout(() => {
      fn.apply(this, rest);
      canRun = true;
    }, delay);
  };
}

/**
 * 生成message handlers
 * @param handlers Object<type: function>
 */
function createMessageHandler(handlers) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request?.type && handlers[request.type]) {
      handlers[request.type](request.data, sender, sendResponse);
    }
    return true;
  });
}
