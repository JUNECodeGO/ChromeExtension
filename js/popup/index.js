/** @format */

// 当前group
let currentGroup = libBasicLibConfig.defaultGroup;
// 当前Tool list
let ToolData = {};
// 已选择的Tool value
let selectData = {};
// 更新类型
const UpdateType = {
  CLEAN: 'clean',
  ADD: 'add',
};
// 当前url
let currentUrlDetail = null;

// 初始化
$(document).ready(function () {
  renderPage();
});

// 监听用户选择Tool value
$(document).on('click', '.Tool-select-item', function (e) {
  e.preventDefault();
  // value
  var selText = $(this).text();
  // name
  var name = $(this).attr('data-name');
  const list = getAllToolValuesByName(ToolData, name);
  // 更新视图
  updateSingleSelect(name, selText);
  // 重新渲染下拉列表
  renderToolMenuList(name, list);
});

// 监听用户切换group
$(document).on('click', '.group-select-item', function (e) {
  e.preventDefault();
  const group = $(this).attr('data-name');
  // 如果选择当前值，不发送请求
  if (currentGroup !== group) {
    $('.group-button>div').text(group);
    currentGroup = group;
    // 重新拉去列表
    getToolList({currentGroup: group, urlDetail: currentUrlDetail});
  }
});

// 监听用户输入过滤条件
$('.input-search').on(
  'input',
  throttle(function () {
    const keyword = $('.input-search').val();
    // 如果搜索条件为空，重置列表
    if (!keyword || !keyword.trim()) {
      renderList(ToolData);
    } else {
      renderList(ToolData, keyword);
    }
  })
);

// 监听用户点击刷新
$('.button-refresh').click(function () {
  getToolList({currentGroup, urlDetail: currentUrlDetail});
});

// 监听用户删除某个Tool value
$(document).on('click', '.remove-Tool', function () {
  const name = $(this).attr('data-name');
  updateSingleSelect(name, '');
});

// 监听用户搜索框
$(document).on('input', '.Tool-select-input', function () {
  const keyword = $(this).val();
  const name = $(this).attr('data-name');

  throttle(function () {
    const list = getAllToolValuesByName(ToolData, name);
    if (!keyword || !keyword.trim()) {
      renderToolMenuList(name, list);
    } else {
      renderToolMenuList(name, list, keyword);
    }
  })();
});

// 监听用户点击清空全部Tool value
$('.button-clean-all').click(function () {
  $('.Tool-select-input').val('');
  updateAllSelect(UpdateType.CLEAN);
  selectData = {};
});

// 监听用户提交
$('.submit-button').click(function () {
  const origin = (currentUrlDetail && currentUrlDetail.origin) || '';
  if (origin) {
    chrome.tabs.getSelected(null, function (tab) {
      const allToolName = getAllToolName();
      Promise.all(
        allToolName.map(key => {
          const itemVal = selectData[key];
          if (itemVal) {
            return chrome.cookies.set({
              name: key,
              url: origin,
              value: itemVal,
              secure: true,
            });
          } else {
            return chrome.cookies.remove({
              name: key,
              url: origin,
            });
          }
        })
      ).then(() => {
        // 重新刷新页面
        if (tab && tab.id) {
          chrome.tabs.reload(tab.id);
        }
        window.close();
      });
    });
  }
});

// 渲染group menu
function renderGroupMenu() {
  const groupMenu = libBasicLibConfig.tenantList
    .map(
      item =>
        `<li><a href='#' class="group-select-item" data-name='${item.name}'>${item.name}</a></li>`
    )
    .join('');
  $('.group-menu').append(groupMenu);
}

// 渲染Tool 列表
function renderList(list, keywords = '') {
  const currentList = Object.keys(list);
  let str;
  if (!keywords && !currentList.length) {
    // 如果列表为空，提示用户刷新列表
    str = `<li class="empty">Sorry, No Data</li>`;
  } else {
    str = (
      keywords
        ? currentList.filter(
            item =>
              item.toLocaleLowerCase().indexOf(keywords.toLocaleLowerCase()) !==
              -1
          )
        : currentList
    )
      .map((name, index) => {
        return `
      <li class="Tool-item" data-name=${name}>
        <div class="title">${name}</div>
        <div class="dropdown Tool-select">
          <div class="Tool-select-left">
            <input id="dropdownMenu${index}" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true"
              class="Tool-select-input" placeholder="Please Choose Tool Env" data-name=${name} />
            <ul class="dropdown-menu" aria-labelledby="dropdownMenu${index}">
              ${list[name]
                .map(
                  value =>
                    `<li><a href='#' class="Tool-select-item" data-name='${name}'>${value}</a></li>`
                )
                .join('')}
            </ul>
           </div>
           <button class="glyphicon glyphicon-remove remove-Tool" data-name=${name}  title="Delete" />
        </div>
      </li>`;
      })
      .join('');
  }

  $('.Tool-container').html(str);

  // 重置用户上次的选择
  setTimeout(() => {
    updateAllSelect();
  });
}

function handleErrorSendMessage() {
  const ErrorHtml = `<li class="empty">Data Error. Please refresh the page.</li>`;
  $('.Tool-container').html(ErrorHtml);
}

function getToolList(params) {
  renderLoading();
  try {
    chrome.runtime.sendMessage(
      {
        type: LIB_ACTION.FETCH_Tool_LIST,
        data: params,
      },
      function (response) {
        const {data = {}, origin, error} = response || {};
        if (error) {
          handleErrorSendMessage();
        } else {
          ToolData = data;
          renderList(data);
          if (data) {
            // 初始化当前域名下的cookie 初始值
            setInitVal(origin);
          }
        }
      }
    );
  } catch (error) {
    handleErrorSendMessage();
  } finally {
    setTimeout(() => {
      removeLoading();
    }, 500);
  }
}

function renderLoading() {
  $('#Tool-container').aToolr(`
      <div class="mask">
        <div class="spinner">
          <div class="rect1"></div>
          <div class="rect2"></div>
          <div class="rect3"></div>
          <div class="rect4"></div>
          <div class="rect5"></div>
        </div>
      </div>`);
}

function removeLoading() {
  const maskElement = $('.mask');
  if (maskElement) {
    $('.mask').remove();
  }
}

function updateSingleSelect(name, value) {
  $(`input[data-name=${name}]`).val(value);
  selectData[name] = value;
  if (value) {
    $(`li[data-name=${name}]`).addClass('active');
  } else {
    $(`li[data-name=${name}]`).removeClass('active');
  }
}

// 更新当前的选择
function updateAllSelect(type = UpdateType.ADD) {
  Object.keys(selectData).forEach(key => {
    updateSingleSelect(key, type === UpdateType.ADD ? selectData[key] : '');
  });
}

// 读取cookie 数据回填
function setInitVal(origin) {
  if (!origin) return;
  chrome.cookies.getAll(
    {
      url: origin,
    },
    function (cookieLists) {
      if (cookieLists && cookieLists.length) {
        const Tools = getAllToolName();
        cookieLists.forEach(({name, value}) => {
          if (Tools.includes(name)) {
            selectData[name] = value;
          }
        });
        if (Object.keys(selectData).length) updateAllSelect();
      }
    }
  );
}

// 渲染Tool下拉框
function renderToolMenuList(name, list, keywords = '') {
  let str = '';
  str = (
    keywords
      ? list.filter(
          item =>
            item.toLocaleLowerCase().indexOf(keywords.toLocaleLowerCase()) !==
            -1
        )
      : list
  )
    .map(value => {
      return `<li><a href='#' class="Tool-select-item" data-name='${name}'>${value}</a></li>`;
    })
    .join('');
  $(`input[data-name = ${name}] ~ ul`).html(str);
}

// 初始化渲染页面
function renderPage() {
  try {
    chrome.tabs.getSelected(null, function (tab) {
      currentUrlDetail = testCurrentTabUrl((tab && tab.url) || '');
      if (currentUrlDetail) {
        $('#Tool-container').addClass('active');
        renderGroupMenu();
        getToolList({
          currentGroup,
          urlDetail: currentUrlDetail,
        });
      } else {
        chrome.browserAction.setIcon({
          path: '../../img/inActiveIcon.png',
        });
        $('#Tool-container').removeClass('active');
      }
    });
  } catch (error) {}
}
