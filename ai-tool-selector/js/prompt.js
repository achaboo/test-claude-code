/**
 * Prompt Optimizer - ツール別に最適化されたプロンプトを生成
 */
var PromptOptimizer = (function () {

  /**
   * ツール別のプロンプトテンプレート
   */
  var TEMPLATES = {
    claude: {
      prefix: '',
      structure: function (input) {
        // Claude向け: 構造化された明確な指示
        var parts = [];
        parts.push('## タスク');
        parts.push(input);
        parts.push('');
        parts.push('## 要件');
        parts.push('- 正確で実用的な回答をお願いします');
        if (hasCodeContext(input)) {
          parts.push('- コードを含む場合は、言語を指定したコードブロックで記述してください');
          parts.push('- エラーハンドリングも考慮してください');
        }
        if (input.length > 300) {
          parts.push('- 段階的に整理して回答してください');
        }
        return parts.join('\n');
      }
    },
    gemini: {
      prefix: '',
      structure: function (input) {
        // Gemini向け: コンテキスト補足付き
        var parts = [];
        parts.push(input);

        if (/この(画像|写真|図|グラフ|スクリーンショット|スクショ)/.test(input)) {
          parts.push('');
          parts.push('※画像を添付しています。画像の内容を踏まえて回答してください。');
        }
        if (/(YouTube|動画)/.test(input)) {
          parts.push('');
          parts.push('※該当の動画/URLの内容を分析してください。');
        }
        if (input.length > 300) {
          parts.push('');
          parts.push('詳細に分析し、構造化して回答してください。');
        }
        return parts.join('\n');
      }
    },
    perplexity: {
      prefix: '',
      structure: function (input) {
        // Perplexity向け: 検索クエリとして最適化
        var parts = [];
        parts.push(input);
        parts.push('');
        parts.push('信頼できるソースを引用して回答してください。');
        if (/(比較|違い|どちら)/.test(input)) {
          parts.push('比較表があると助かります。');
        }
        return parts.join('\n');
      }
    },
    copilot: {
      prefix: '',
      structure: function (input) {
        // Copilot向け: Microsoft製品文脈を補足
        var parts = [];
        parts.push(input);
        if (/(Excel|表計算|マクロ|VBA)/.test(input)) {
          parts.push('');
          parts.push('具体的な数式や手順をステップバイステップで教えてください。');
        }
        if (/(Word|文書|報告書|企画書)/.test(input)) {
          parts.push('');
          parts.push('文書のフォーマットや構成案も含めてください。');
        }
        if (/(PowerPoint|スライド|プレゼン)/.test(input)) {
          parts.push('');
          parts.push('スライド構成案を箇条書きで提案してください。');
        }
        return parts.join('\n');
      }
    },
    grok: {
      prefix: '',
      structure: function (input) {
        // Grok向け: シンプルかつカジュアル
        var parts = [];
        parts.push(input);
        if (/(トレンド|話題|バズ)/.test(input)) {
          parts.push('');
          parts.push('最新のX/Twitterでのトレンドも踏まえて教えて。');
        }
        return parts.join('\n');
      }
    },
    chatgpt: {
      prefix: '',
      structure: function (input) {
        // ChatGPT向け: 自然な会話形式
        var parts = [];
        parts.push(input);
        if (input.length > 200) {
          parts.push('');
          parts.push('わかりやすく簡潔に説明してください。');
        }
        return parts.join('\n');
      }
    }
  };

  /**
   * コードに関連するコンテキストがあるか判定
   */
  function hasCodeContext(text) {
    var codeKeywords = [
      'コード', 'プログラム', '実装', '関数', 'クラス',
      'HTML', 'CSS', 'JavaScript', 'Python', 'Java',
      'バグ', 'エラー', 'デバッグ'
    ];
    return codeKeywords.some(function (kw) {
      return text.indexOf(kw) !== -1;
    });
  }

  /**
   * 最適化されたプロンプトを生成
   */
  function generate(toolId, userInput) {
    var template = TEMPLATES[toolId];
    if (!template) {
      return userInput;
    }
    return template.structure(userInput.trim());
  }

  return {
    generate: generate
  };
})();
