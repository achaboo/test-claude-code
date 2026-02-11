/**
 * App Launcher - 指定ツールのWebページを新規タブで開く
 */
var Launcher = (function () {

  var TOOL_URLS = {
    claude:     'https://claude.ai',
    gemini:     'https://gemini.google.com',
    chatgpt:    'https://chatgpt.com',
    perplexity: 'https://www.perplexity.ai',
    copilot:    'https://copilot.microsoft.com',
    grok:       'https://grok.com'
  };

  /**
   * 指定ツールのWebページを新規タブで開く
   */
  function openTool(toolId) {
    var url = TOOL_URLS[toolId];
    if (!url) return false;
    window.open(url, '_blank');
    return true;
  }

  return {
    openTool: openTool
  };
})();
