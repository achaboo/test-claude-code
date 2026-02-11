/**
 * App Launcher - iOS/PC環境に応じてアプリまたはWebブラウザで起動
 *
 * iOS戦略:
 *   Universal Links を使用。各AIサービスのHTTPS URLをそのまま開く。
 *   iOSはアプリがインストール済みなら自動的にアプリで開き、
 *   未インストールならSafariで表示する。
 *
 *   重要: Universal Linksが機能するには window.open() または
 *   <a> タグで別ドメインのURLを開く必要がある。
 *   同一ページ内の window.location.href では機能しない。
 */
var Launcher = (function () {

  /**
   * ツール別URL定義
   *
   * ios: Universal Links対応のURL（アプリインストール済みならアプリで開く）
   * web: PC/Macで開くURL
   *
   * 調査結果に基づくUniversal Links / カスタムURLスキーム:
   * - Claude:     claude.ai のAASAファイル確認済み → Universal Links対応
   * - ChatGPT:    chatgpt.com → Universal Links対応
   * - Gemini:     gemini.google.com → Googleアプリ経由（googleapp://robin）
   * - Perplexity: perplexity.ai → Universal Links対応
   * - Copilot:    copilot.microsoft.com → Universal Links対応
   * - Grok:       grok.com → Universal Links対応
   */
  var TOOL_URLS = {
    claude: {
      web: 'https://claude.ai/new',
      // AASA確認済み: com.anthropic.claude がUniversal Links登録済み
      ios: 'https://claude.ai/new'
    },
    gemini: {
      web: 'https://gemini.google.com/app',
      // Googleアプリ内のGeminiタブを直接開くスキーム
      ios: 'googlegemini://'
    },
    chatgpt: {
      web: 'https://chatgpt.com',
      // ChatGPTアプリのUniversal Links
      ios: 'https://chatgpt.com'
    },
    perplexity: {
      web: 'https://www.perplexity.ai',
      // PerplexityのUniversal Links
      ios: 'https://www.perplexity.ai'
    },
    copilot: {
      web: 'https://copilot.microsoft.com',
      // CopilotのUniversal Links
      ios: 'https://copilot.microsoft.com'
    },
    grok: {
      web: 'https://grok.com',
      // GrokのUniversal Links
      ios: 'https://grok.com'
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
   */
  function openTool(toolId) {
    var urls = TOOL_URLS[toolId];
    if (!urls) return false;

    if (isIOS()) {
      return openIOSApp(toolId, urls);
    } else {
      window.open(urls.web, '_blank');
      return true;
    }
  }

  /**
   * iOSでアプリを起動
   *
   * 方式1（Universal Links対応アプリ）:
   *   HTTPS URLを <a> タグクリックで開く。
   *   iOSがアプリを検出すればアプリで開き、なければSafariで開く。
   *
   * 方式2（Geminiのみ - カスタムURLスキーム）:
   *   googlegemini:// スキームでアプリ起動を試み、
   *   失敗時はUniversal Link (HTTPS) にフォールバック。
   */
  function openIOSApp(toolId, urls) {
    if (toolId === 'gemini') {
      // Geminiはカスタムスキームを試行 → フォールバック
      return openWithSchemeAndFallback(urls.ios, urls.web);
    }

    // その他: Universal Linksで開く
    // <a> タグを動的生成してクリックすることで
    // Universal Links のアプリ遷移を確実にトリガーする
    triggerUniversalLink(urls.ios);
    return true;
  }

  /**
   * Universal Links を <a> タグ経由で開く
   *
   * window.open() だとiOS Safariでポップアップブロックされる場合があるため、
   * <a target="_blank"> をプログラム的にクリックする方式を使用。
   */
  function triggerUniversalLink(url) {
    var a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // クリーンアップ（少し遅延させる）
    setTimeout(function () {
      document.body.removeChild(a);
    }, 100);
  }

  /**
   * カスタムURLスキーム + フォールバック（Gemini用）
   *
   * 1. hidden <iframe> でスキームURLを読み込み試行
   *    → アプリがあればアプリが起動し、ページは離脱しない
   *    → アプリがなければ何も起きない
   * 2. visibilitychange でアプリ起動を検知
   * 3. 一定時間後にアプリが開かなければWeb URLにフォールバック
   */
  function openWithSchemeAndFallback(schemeUrl, webUrl) {
    var appOpened = false;
    var startTime = Date.now();

    function onVisibilityChange() {
      if (document.hidden) {
        appOpened = true;
      }
    }

    function onPageFocus() {
      // アプリから戻ってきた場合の検知
      if (Date.now() - startTime > 1500) {
        appOpened = true;
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onPageFocus);

    // iframeでスキーム起動を試行（ページ遷移を防ぐ）
    var iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = schemeUrl;
    document.body.appendChild(iframe);

    // 1秒後にアプリが開かなかった場合、Webにフォールバック
    setTimeout(function () {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onPageFocus);
      document.body.removeChild(iframe);

      if (!appOpened) {
        triggerUniversalLink(webUrl);
      }
    }, 1000);

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
