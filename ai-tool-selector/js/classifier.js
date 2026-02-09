/**
 * AI Tool Classifier - 入力内容から最適なAIツールを判定するエンジン
 */
var Classifier = (function () {
  // ツール定義
  var TOOLS = {
    claude: {
      id: 'claude',
      name: 'Claude Pro',
      plan: '課金',
      color: '#D97706',
      keywords: [
        'コード', 'コーディング', 'プログラム', 'プログラミング',
        'バグ', '実装', 'リファクタ', 'リファクタリング',
        'デバッグ', '設計', 'アーキテクチャ', 'API',
        '関数', 'クラス', 'モジュール', 'ライブラリ',
        'フレームワーク', 'テスト', 'ユニットテスト',
        'HTML', 'CSS', 'JavaScript', 'Python', 'Java', 'TypeScript',
        'React', 'Vue', 'Node', 'SQL', 'データベース', 'DB',
        'Git', 'GitHub', 'Docker', 'AWS', 'Azure',
        'アルゴリズム', '計算量', 'O(n)', 'ソート',
        'エラー', 'スタックトレース', 'ログ',
        '型', '変数', '配列', 'オブジェクト',
        'コンパイル', 'ビルド', 'デプロイ'
      ],
      conditions: [
        { type: 'length', min: 500, score: 15 }
      ]
    },
    gemini: {
      id: 'gemini',
      name: 'Gemini Pro',
      plan: '課金',
      color: '#4285F4',
      keywords: [
        '画像', '写真', '動画', 'YouTube',
        'Gmail', 'スプレッドシート', 'Google', 'ドライブ',
        'Googleドキュメント', 'Googleスライド',
        'マップ', 'Google Maps', 'カレンダー',
        'Android', 'Pixel', 'Chrome拡張',
        'OCR', '図', 'グラフ', 'チャート', 'スクリーンショット',
        'PDF', 'ファイル分析'
      ],
      conditions: [
        { type: 'url', score: 10 },
        { type: 'image_mention', score: 20 }
      ]
    },
    perplexity: {
      id: 'perplexity',
      name: 'Perplexity',
      plan: '無料',
      color: '#20B8CD',
      keywords: [
        '最新', 'ニュース', '調べて', '検索',
        'ソース', '出典', '論文', '統計',
        '比較検討', 'ファクトチェック', '事実確認',
        'いつ', '何年', '現在', '今',
        'データ', '数値', '根拠', '情報源',
        'リサーチ', '調査', '市場', '業界',
        '引用', '参考文献', 'エビデンス'
      ],
      conditions: [
        { type: 'question_latest', score: 15 }
      ]
    },
    copilot: {
      id: 'copilot',
      name: 'Copilot',
      plan: '無料',
      color: '#7F5AF0',
      keywords: [
        'Excel', 'Word', 'PowerPoint', 'Outlook',
        'Teams', 'Windows', 'Office', 'Microsoft',
        'メール作成', 'ビジネス文書', '議事録',
        'スライド', 'プレゼン', 'プレゼンテーション',
        '表計算', 'マクロ', 'VBA',
        'OneDrive', 'SharePoint', 'Bing',
        '報告書', '企画書', '提案書', '見積書'
      ],
      conditions: []
    },
    grok: {
      id: 'grok',
      name: 'Grok',
      plan: '無料',
      color: '#000000',
      keywords: [
        'X', 'Twitter', 'トレンド', 'バズ', 'SNS',
        'ミーム', '炎上', '話題', 'ネタ',
        'ツイート', 'ポスト', 'リポスト',
        'フォロワー', 'インプレッション',
        'イーロン', 'Elon', 'Musk'
      ],
      conditions: [
        { type: 'sns_context', score: 10 }
      ]
    },
    chatgpt: {
      id: 'chatgpt',
      name: 'ChatGPT',
      plan: '無料',
      color: '#10A37F',
      keywords: [
        '教えて', 'とは', '意味', 'おすすめ', '雑談',
        '相談', 'アイデア', 'ブレスト',
        '物語', '小説', '詩', '歌詞', '作文',
        '翻訳', '英語', '日本語',
        '料理', 'レシピ', '旅行', '健康',
        '簡単に', 'わかりやすく'
      ],
      conditions: []
    }
  };

  // 優先順位（同点時）
  var PRIORITY = ['claude', 'gemini', 'perplexity', 'copilot', 'grok', 'chatgpt'];

  // Claude vs Gemini 棲み分け用のコーディングキーワード
  var CODE_KEYWORDS = [
    'コード', 'コーディング', 'プログラム', 'プログラミング',
    'バグ', '実装', 'リファクタ', 'デバッグ', '関数', 'クラス',
    'HTML', 'CSS', 'JavaScript', 'Python', 'Java', 'TypeScript',
    'React', 'Vue', 'Node', 'SQL', 'Git', 'Docker', 'API',
    'アルゴリズム', 'コンパイル', 'ビルド', 'デプロイ'
  ];

  /**
   * 入力テキストを分類し、各ツールのスコアを返す
   */
  function classify(input) {
    if (!input || !input.trim()) {
      return null;
    }

    var text = input.trim();
    var scores = {};

    // 各ツールのスコアを計算
    PRIORITY.forEach(function (toolId) {
      scores[toolId] = calculateScore(text, TOOLS[toolId]);
    });

    // Claude vs Gemini 棲み分け調整
    adjustClaudeGemini(text, scores);

    // スコア順にソート
    var ranked = PRIORITY.slice().sort(function (a, b) {
      if (scores[b] === scores[a]) {
        return PRIORITY.indexOf(a) - PRIORITY.indexOf(b);
      }
      return scores[b] - scores[a];
    });

    // すべてのスコアが低い場合はChatGPTをデフォルトに
    var maxScore = scores[ranked[0]];
    if (maxScore < 5) {
      scores.chatgpt = Math.max(scores.chatgpt, 20);
      ranked = PRIORITY.slice().sort(function (a, b) {
        if (scores[b] === scores[a]) {
          return PRIORITY.indexOf(a) - PRIORITY.indexOf(b);
        }
        return scores[b] - scores[a];
      });
    }

    // 信頼度を計算（0〜100%）
    var totalScore = 0;
    PRIORITY.forEach(function (id) { totalScore += scores[id]; });

    var results = ranked.map(function (toolId) {
      var confidence = totalScore > 0
        ? Math.round((scores[toolId] / totalScore) * 100)
        : 0;
      return {
        tool: TOOLS[toolId],
        score: scores[toolId],
        confidence: confidence,
        reason: generateReason(toolId, text)
      };
    });

    return {
      recommended: results[0],
      alternatives: results.slice(1, 3),
      all: results
    };
  }

  /**
   * ツールごとのスコアを計算
   */
  function calculateScore(text, tool) {
    var score = 0;
    var lowerText = text.toLowerCase();

    // キーワードマッチング
    tool.keywords.forEach(function (keyword) {
      var lowerKeyword = keyword.toLowerCase();
      // 単語の出現回数に応じてスコア加算（最大3回まで）
      var regex = new RegExp(escapeRegex(lowerKeyword), 'gi');
      var matches = text.match(regex);
      if (matches) {
        score += Math.min(matches.length, 3) * 5;
      }
    });

    // 追加条件チェック
    (tool.conditions || []).forEach(function (cond) {
      switch (cond.type) {
        case 'length':
          if (text.length >= cond.min) score += cond.score;
          break;
        case 'url':
          if (/https?:\/\/\S+/.test(text)) score += cond.score;
          break;
        case 'image_mention':
          if (/この(画像|写真|図|グラフ|スクリーンショット|スクショ)/.test(text)) {
            score += cond.score;
          }
          break;
        case 'question_latest':
          if (/最新|今年|2025|2026|現在の|いま/.test(text)) {
            score += cond.score;
          }
          break;
        case 'sns_context':
          if (/(ツイッター|twitter|X(で|の|が))/i.test(text)) {
            score += cond.score;
          }
          break;
      }
    });

    return score;
  }

  /**
   * Claude vs Gemini の棲み分け調整
   */
  function adjustClaudeGemini(text, scores) {
    if (scores.claude < 10 && scores.gemini < 10) return;

    var hasCodeContext = CODE_KEYWORDS.some(function (kw) {
      return text.indexOf(kw) !== -1;
    });

    var hasImageContext = /この(画像|写真|図|グラフ|スクリーンショット|スクショ)/.test(text);
    var hasGoogleContext = /(Google|Gmail|YouTube|スプレッドシート|ドライブ)/i.test(text);

    // 画像・Google系が絡む場合 → Gemini優先
    if (hasImageContext || hasGoogleContext) {
      scores.gemini += 15;
    }

    // コードが絡む場合 → Claude優先
    if (hasCodeContext) {
      scores.claude += 15;
    }

    // コード以外の推論・分析 → Gemini寄せ
    if (!hasCodeContext && /(分析|推論|考察|評価|批判的)/.test(text)) {
      scores.gemini += 10;
    }
  }

  /**
   * 判定理由の生成
   */
  function generateReason(toolId, text) {
    var reasons = {
      claude: 'コーディング・技術的な分析に最適',
      gemini: 'マルチモーダル処理・Google連携に最適',
      perplexity: 'リアルタイム検索・出典付き回答に最適',
      copilot: 'Microsoft連携・ビジネス文書に最適',
      grok: 'SNSトレンド・カジュアルな対話に最適',
      chatgpt: '汎用的な質問・一般会話に最適'
    };

    // より具体的な理由を追加
    if (toolId === 'claude' && text.length > 500) {
      return reasons[toolId] + '（長文の分析も得意）';
    }
    if (toolId === 'gemini' && /この(画像|写真|図)/.test(text)) {
      return reasons[toolId] + '（画像解析が可能）';
    }
    if (toolId === 'perplexity' && /(最新|ニュース|今)/.test(text)) {
      return reasons[toolId] + '（最新情報をソース付きで提供）';
    }

    return reasons[toolId];
  }

  /**
   * 正規表現のエスケープ
   */
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * ツール情報を取得
   */
  function getToolInfo(toolId) {
    return TOOLS[toolId] || null;
  }

  function getAllTools() {
    return TOOLS;
  }

  return {
    classify: classify,
    getToolInfo: getToolInfo,
    getAllTools: getAllTools,
    PRIORITY: PRIORITY
  };
})();
