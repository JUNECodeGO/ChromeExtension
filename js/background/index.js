/** @format */

/**
 * 并发请求Tool list
 * @param projectList Tool Toolalgo
 * @param group // toc
 * @param env // test/uat
 * @param token // token
 */
function fetchData({projectList, group, env, token}) {
  return Promise.all(
    Object.values(projectList).map(project =>
      request(getUrl(project, env, group), {token})
    )
  );
}

/**
 * 更新chrome extension 图标
 * @param tabId number
 * @param origin string Url
 */
function updatePageActionStatus(origin) {
  if (!!origin) {
    chrome.cookies.getAll(
      {
        url: origin,
      },
      function (cookieLists) {
        const allToolName = getAllToolName();
        // 判断cookie中是否存在相关Tool key，假如有的话，图标置为激活状态
        const isActive = cookieLists.find(item =>
          allToolName.includes(item.name)
        );
        chrome.browserAction.setIcon({
          path: !!isActive
            ? '../../img/activeIcon.png'
            : '../../img/inActiveIcon.png',
        });
      }
    );
  } else {
    chrome.browserAction.setIcon({
      path: '../../img/inActiveIcon.png',
    });
  }
}

/**
 * 监听cookie变化，cookie发生变化时，更新icon状态
 *
 */
chrome.cookies.onChanged.addListener(
  throttle(function (changeInfo) {
    try {
      const {
        cookie: {domain},
      } = changeInfo || {};
      if (domain) {
        const isValid = testCurrentTabUrl(`https://${domain}`);
        if (isValid) {
          updatePageActionStatus(`https://${domain}`);
        }
      }
    } catch (error) {}
  })
);

/**
 * 监听popup发来请求信息
 * @param message Object<currentGroup: toC>
 * @param sender
 * @param sendResponse function
 */
createMessageHandler({
  [LIB_ACTION.FETCH_Tool_LIST]: (request, sender, sendResponse) => {
    try {
      const {currentGroup, urlDetail} = request;

      const {tenantList, CidMap} = libBasicLibConfig;
      const {token, project, ToolKeys} = tenantList.find(
        item => item.name === currentGroup
      );
      const {env, cid, origin} = urlDetail;
      updatePageActionStatus(origin);
      const proList = Object.values(project);
      const currentCid = (Object.entries(CidMap).find(
        item => item[1] === cid
      ) || [])[0];
      const reg = /^(Tool-Tool-)(test|uat|staging)(-default)$/;
      if (proList.length && currentCid) {
        fetchData({
          projectList: project,
          group: currentGroup,
          env,
          token,
        }).then(
          result => {
            const target = {};
            const dataList =
              (result &&
                result.length &&
                result.map(item => item.data || {})) ||
              [];
            if (!dataList.some(item => !item)) {
              ToolKeys.forEach(ToolKey => {
                const targetGroup =
                  dataList[proList.findIndex(ele => ele === ToolKey.project)];
                target[ToolKey.key] = Object.values(targetGroup)
                  .filter(ele => ele.cids.includes(currentCid))
                  .map(i => i.name)
                  .sort(name => (reg.test(name) ? -1 : 1));
              });
            }
            sendResponse({
              data: target,
              origin,
            });
          },
          error => {
            sendResponse({
              error,
            });
          }
        );
      } else {
        sendResponse({
          data: {},
          origin: '',
        });
      }
    } catch (error) {
      sendResponse({
        error,
      });
    }
  },
});
