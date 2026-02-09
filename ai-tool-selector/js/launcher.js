/**
 * App Launcher - iOS/PC環境に応じてアプリまたはWebブラウザで起動
 */
var Launcher = (function () {

  var TOOL_URLS = {
    claude: {
      web: 'https://claude.ai',
      ios: 'claude://'
    },
    gemini: {
      web: 'https://gemini.google.com',
      ios: 'googlegemini://'
    },
    chatgpt: {
      web: 'https://chatgpt.com',
      ios: 'chatgpt://'
    },
    perplexity: {
      web: 'https://www.perplexity.ai',
      ios: 'perplexity://'
    },
    copilot: {
      web: 'https://copilot.microsoft.com',
      ios: 'mscopilot://'
    },
    grok: {
      web: 'https://grok.com',
      ios: 'grok://'
    }
  };

  /**
   * iOSデバイスかどうかを判定
   */
  function isIOS() {
    var ua = navigator.userAgent;
    return /iPhone|iPad|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  /**
   * 指定ツールを開く
   * iOSの場合はネイティブアプリを試行し、失敗したらWebにフォールバック
   */
  function openTool(toolId) {
    var urls = TOOL_URLS[toolId];
    if (!urls) return false;

    if (isIOS()) {
      return openIOSApp(urls.ios, urls.web);
    } else {
      window.open(urls.web, '_blank');
      return true;
    }
  }

  /**
   * iOSアプリを起動（フォールバック付き）
   *
   * 方式:
   * 1. カスタムURLスキームでアプリ起動を試みる
   * 2. visibilitychangeイベントでアプリが開いたか検知
   * 3. 一定時間内にアプリが開かなければWebにフォールバック
   */
  function openIOSApp(appUrl, webUrl) {
    var appOpened = false;

    // アプリが開いたらフラグを立てる
    function onVisibilityChange() {
      if (document.hidden) {
        appOpened = true;
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);

    // アプリURLスキームで起動試行
    window.location.href = appUrl;

    // 500ms後にアプリが開かなかった場合、Webにフォールバック
    setTimeout(function () {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (!appOpened) {
        window.open(webUrl, '_blank');
      }
    }, 500);

    return true;
  }

  /**
   * ツールのWeb URLを取得
   */
  function getWebUrl(toolId) {
    var urls = TOOL_URLS[toolId];
    return urls ? urls.web : null;
  }

  return {
    openTool: openTool,
    isIOS: isIOS,
    getWebUrl: getWebUrl
  };
})();
