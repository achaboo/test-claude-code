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

  // ============================================================
  // モード推奨ロジック
  // ============================================================

  /**
   * ツール別の利用可能モード（UIに表示される正式名称）
   */
  var TOOL_MODES = {
    claude: {
      modes: ['Opus 4.6', 'Sonnet 4.5', 'Haiku 4.5', '拡張思考'],
      selectMode: function (text) {
        // 複雑な推論・段階的思考 → 拡張思考
        if (/(ステップバイステップ|段階的|論理的に|証明|数学|推論の過程)/.test(text)) {
          return { mode: '拡張思考' };
        }
        // コーディング・長文分析 → Opus 4.6
        if (hasCodeContext(text) || text.length > 500) {
          return { mode: 'Opus 4.6' };
        }
        // 軽量タスク → Sonnet 4.5
        if (text.length < 100) {
          return { mode: 'Sonnet 4.5' };
        }
        return { mode: 'Opus 4.6' };
      }
    },
    gemini: {
      modes: ['Pro', '思考モード', '高速モード'],
      selectMode: function (text) {
        var needsNormalChat = /(続き|会話を続|履歴|さっきの|前回|ファイルを(アップロード|添付)|複数回)/.test(text);
        var chatType = needsNormalChat ? 'normal' : 'temporary';

        // 複雑な分析・推論 → 思考モード
        if (/(分析|推論|考察|批判的|比較検討|深く|詳細に)/.test(text) || text.length > 500) {
          return { mode: '思考モード', chatType: chatType };
        }
        // 短い質問・素早い回答 → 高速モード
        if (text.length < 100 && !/(画像|写真|動画|YouTube)/.test(text)) {
          return { mode: '高速モード', chatType: chatType };
        }
        // デフォルト → Pro
        return { mode: 'Pro', chatType: chatType };
      }
    },
    chatgpt: {
      modes: ['GPT-5.2 Instant', 'GPT-5.2 Thinking'],
      selectMode: function (text) {
        // 複雑な質問 → Thinking
        if (/(分析|推論|ステップバイステップ|詳細に|比較)/.test(text) || text.length > 300) {
          return { mode: 'GPT-5.2 Thinking' };
        }
        return { mode: 'GPT-5.2 Instant' };
      }
    },
    perplexity: {
      modes: ['クイック検索', 'Pro検索'],
      focusModes: ['Web', 'Academic', 'Writing', 'Wolfram|Alpha', 'YouTube', 'Reddit'],
      selectMode: function (text) {
        var result = {};

        // 深い調査 → Pro検索
        if (/(詳しく|徹底的|網羅的|比較検討|深く調べ)/.test(text)) {
          result.mode = 'Pro検索';
        } else {
          result.mode = 'クイック検索';
        }

        // フォーカスモード判定
        if (/(論文|学術|研究|ジャーナル|査読)/.test(text)) {
          result.focus = 'Academic';
        } else if (/(YouTube|動画|ビデオ)/.test(text)) {
          result.focus = 'YouTube';
        } else if (/(Reddit|掲示板|フォーラム)/.test(text)) {
          result.focus = 'Reddit';
        } else if (/(数学|計算|方程式|積分|微分)/.test(text)) {
          result.focus = 'Wolfram|Alpha';
        } else if (/(作文|文章|執筆|ライティング)/.test(text)) {
          result.focus = 'Writing';
        }

        return result;
      }
    },
    copilot: {
      modes: ['標準', 'Think Deeper'],
      selectMode: function (text) {
        if (/(分析|詳しく|比較|複雑|設計)/.test(text) || text.length > 300) {
          return { mode: 'Think Deeper' };
        }
        return { mode: '標準' };
      }
    },
    grok: {
      modes: ['標準', 'Think', 'DeepSearch'],
      selectMode: function (text) {
        // 網羅的な調査 → DeepSearch
        if (/(調べて|検索|最新|ニュース|まとめて|網羅)/.test(text)) {
          return { mode: 'DeepSearch' };
        }
        // 推論・分析 → Think
        if (/(分析|推論|なぜ|理由|考えて|ステップ)/.test(text)) {
          return { mode: 'Think' };
        }
        return { mode: '標準' };
      }
    }
  };

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

  /**
   * 入力内容に基づく推奨ヒントを取得
   * 戻り値: { hints: string[] } - 表示すべきヒント行の配列
   */
  function getRecommendedHints(toolId, userInput) {
    var toolMode = TOOL_MODES[toolId];
    if (!toolMode) return { hints: [] };

    var result = toolMode.selectMode(userInput);
    var hints = [];

    // モード名
    if (result.mode) {
      hints.push('モード: ' + result.mode);
    }

    // Gemini のチャットタイプ
    if (result.chatType === 'normal') {
      hints.push('通常のチャットを使用してください');
    } else if (result.chatType === 'temporary') {
      hints.push('一時的なチャットを使用してください');
    }

    // Perplexity のフォーカスモード
    if (result.focus) {
      hints.push('フォーカス: ' + result.focus);
    }

    return { hints: hints };
  }

  return {
    generate: generate,
    getRecommendedHints: getRecommendedHints
  };
})();
