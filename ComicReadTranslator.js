// ==UserScript==
// @name         漫译助手
// @namespace    https://github.com/liuzhijie443/comic-read-translator
// @version      2.1.3-2026-06-20
// @description  图片漫画一键翻译，适配 ComicRead 阅读模式支持自动翻译与翻译缓存。
// @author       k452b
// @match        *://*/*
// @require      https://cdn.jsdelivr.net/gh/Tampermonkey/utils@d8a4543a5f828dfa8eefb0a3360859b6fe9c3c34/requires/gh_2215_make_GM_xhr_more_parallel_again.js
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @connect      *
// @license      GPL-3.0
// @run-at       document-start
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIiByb2xlPSJpbWciIGFyaWEtbGFiZWxsZWRieT0idGl0bGUgZGVzYyI+CiAgPHRpdGxlIGlkPSJ0aXRsZSI+Q29taWMgUmVhZCBUcmFuc2xhdG9yIEljb248L3RpdGxlPgogIDxkZXNjIGlkPSJkZXNjIj5QaW5rIGNpcmN1bGFyIHRyYW5zbGF0aW9uIGljb24gd2l0aCB0aGUgQ2hpbmVzZSBjaGFyYWN0ZXIgeWkgaW4gdGhlIGNlbnRlci48L2Rlc2M+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9Imljb25HcmFkaWVudCIgeDE9IjUiIHkxPSI0IiB4Mj0iMjciIHkyPSIyOCIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSJyZ2JhKDI1NSwgMTgyLCAxOTMsIDAuOCkiIC8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0icmdiYSgyNTUsIDEwNSwgMTgwLCAwLjgpIiAvPgogICAgPC9saW5lYXJHcmFkaWVudD4KICAgIDxmaWx0ZXIgaWQ9Imljb25TaGFkb3ciIHg9Ii01MCUiIHk9Ii01MCUiIHdpZHRoPSIyMDAlIiBoZWlnaHQ9IjIwMCUiPgogICAgICA8ZmVEcm9wU2hhZG93IGR4PSIwIiBkeT0iNCIgc3RkRGV2aWF0aW9uPSI2IiBmbG9vZC1jb2xvcj0icmdiYSgyNTUsIDEwNSwgMTgwLCAwLjIpIiAvPgogICAgPC9maWx0ZXI+CiAgPC9kZWZzPgogIDxnIGZpbHRlcj0idXJsKCNpY29uU2hhZG93KSI+CiAgICA8Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNS4yNSIgZmlsbD0idXJsKCNpY29uR3JhZGllbnQpIiBzdHJva2U9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC40KSIgc3Ryb2tlLXdpZHRoPSIxLjUiIC8+CiAgPC9nPgogIDx0ZXh0CiAgICB4PSIxNiIKICAgIHk9IjE2IgogICAgZmlsbD0iI2ZmZmZmZiIKICAgIGZvbnQtZmFtaWx5PSJNaWNyb3NvZnQgWWFIZWksIFBpbmdGYW5nIFNDLCBOb3RvIFNhbnMgQ0pLIFNDLCBzYW5zLXNlcmlmIgogICAgZm9udC1zaXplPSIxNSIKICAgIGZvbnQtd2VpZ2h0PSI3MDAiCiAgICB0ZXh0LWFuY2hvcj0ibWlkZGxlIgogICAgZG9taW5hbnQtYmFzZWxpbmU9ImNlbnRyYWwiCiAgPuivkTwvdGV4dD4KPC9zdmc+Cg==
// ==/UserScript==

(function () {
  "use strict";

  // ================= [1. 配置参数] =================
  const CONFIG = {
    // API 服务地址，可改为你自己的 OpenAI 兼容接口
    get apiBaseUrl() {
      return GM_getValue("apiBaseUrl", "http://127.0.0.1:8000/v1");
    },
    // API 密钥
    get apiKey() {
      return GM_getValue("apiKey", "sk-1234");
    },
    // 当前启用的模型 ID
    get model() {
      return getActiveModelProfile()?.model || getLegacyDefaultModel();
    },
    // 额外请求参数，需为 JSON 字符串
    get extraBody() {
      return GM_getValue("extraBody", "");
    },
    // 自动翻译失败后的最大重试次数
    get maxAutoRetryCount() {
      return Math.max(0, Number(GM_getValue("maxAutoRetryCount", 3)) || 3);
    },
    // ComicRead 自动翻译并发数
    get autoTranslateConcurrency() {
      return Math.max(
        1,
        Number(GM_getValue("autoTranslateConcurrency", 5)) || 5,
      );
    },
    // 最多缓存多少本漫画页面集合，超出后会自动删除最旧缓存
    get maxTranslationPageNum() {
      return Math.max(
        1,
        Number(
          GM_getValue("maxTranslationPageNum", MAX_TRANSLATION_PAGE_NUM),
        ) || MAX_TRANSLATION_PAGE_NUM,
      );
    },
    // 基础字号，想让漫画文字整体变大可优先改这里
    fontSize: 18,
    // 黑色描边粗细
    strokeWidth: 4,
    // 文字填充颜色
    textColor: "#FFFFFF",
    // 文字描边颜色
    strokeColor: "#000000",
    // 文字底板颜色，用于提升复杂背景上的可读性
    textBackgroundColor: "rgba(238, 238, 238, 0.72)",
    // 文字底板内边距比例，值越大底板越宽松
    textBackgroundPaddingRatio: 0.12,
    // 文字底板圆角比例，值越大圆角越接近胶囊
    textBackgroundRadiusRatio: 0.15,
    // 每行文本的最小高度，避免过矮导致字号和排版过小
    textMinBoxHeight: 22,
    // 自动合并后的多行文本行距倍率
    mergedTextLineHeightRatio: 1.35,
    // 不同字号档位的最大字体大小，避免超大文本框把字号放得过大
    maxFontSizeBySize: { small: 24, medium: 30, large: 36 },
    // 渲染字体，可替换为自己喜欢的字体栈
    fontFamily:
      '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif',
    // 输出图片格式，默认 PNG 以减少文字边缘损失
    outputMimeType: "image/png",
    // 允许处理的最小图片边长，过小的图会被跳过
    minImageSize: 150, // 提高最小图片尺寸，避免小图片显示图标
    // 允许处理的最小图片面积，过小的图会被跳过
    minImageArea: 15000, // 添加最小面积检测（宽*高）
    // small / medium / large 三类文本的缩放系数
    sizeMapping: { small: 1.0, medium: 1.1, large: 1.2 },
    // 按钮主色渐变
    primaryGradient:
      "linear-gradient(135deg, rgba(255, 182, 193, 0.8) 0%, rgba(255, 105, 180, 0.8) 100%)",
  };

  // 获取当前网站是否开启"一律文字翻译"
  const isAlwaysTextMode = () =>
    GM_getValue("always_text_" + location.hostname, false);

  // 获取当前网站是否隐藏图标
  const isHideIcon = () => GM_getValue("hide_icon_" + location.hostname, false);

  const LOG_PREFIX = "[image-translator]";

  function logConsole(level, message, ...args) {
    const fn = console[level] || console.log;
    fn(`${LOG_PREFIX} ${message}`, ...args);
  }

  const logInfo = (message, ...args) => logConsole("log", message, ...args);
  const logWarn = (message, ...args) => logConsole("warn", message, ...args);
  const logError = (message, ...args) => logConsole("error", message, ...args);

  function getImageDebugInfo(img) {
    if (!img)
      return {
        pageLabel: "无",
        source: "",
        sourcePreview: "",
        loadType: "unknown",
      };

    const meta = isComicReadImage(img)
      ? getComicReadImageMeta(img)
      : {
          pageLabel: "无",
          source: getSourceKey(img),
          loadType: img.complete ? "loaded" : "unknown",
        };

    return {
      pageLabel: meta.pageLabel || "无",
      source: meta.source || "",
      sourcePreview: meta.source
        ? `${meta.source.slice(0, 120)}${meta.source.length > 120 ? "..." : ""}`
        : "",
      loadType: meta.loadType || "unknown",
    };
  }

  function createModelProfileId() {
    return `model_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeModelProfile(profile, fallbackId) {
    if (!profile || typeof profile !== "object") return null;

    const model = String(profile.model || "").trim();
    if (!model) return null;

    const name = String(profile.name || model).trim() || model;
    const id = String(
      profile.id || fallbackId || createModelProfileId(),
    ).trim();
    const apiBaseUrl = String(
      profile.apiBaseUrl ||
        GM_getValue("apiBaseUrl", "http://127.0.0.1:8000/v1"),
    ).trim();
    const apiKey = String(profile.apiKey || GM_getValue("apiKey", "")).trim();
    const extraBody = String(profile.extraBody || "").trim();
    return { id, name, apiBaseUrl, apiKey, model, extraBody };
  }

  function getLegacyDefaultModel() {
    return GM_getValue("model", "");
  }

  function getModelProfiles() {
    const legacyModel = getLegacyDefaultModel();
    const fallbackProfiles = [
      {
        id: "default",
        name: legacyModel,
        apiBaseUrl: GM_getValue("apiBaseUrl", "http://127.0.0.1:8000/v1"),
        apiKey: GM_getValue("apiKey", "sk-1234"),
        model: legacyModel,
        extraBody: GM_getValue("extraBody", ""),
      },
    ];

    try {
      const rawValue = GM_getValue("modelProfiles", "");
      if (!rawValue) return fallbackProfiles;

      const parsed = JSON.parse(rawValue);
      if (!Array.isArray(parsed)) return fallbackProfiles;

      const profiles = parsed
        .map((profile, index) =>
          normalizeModelProfile(profile, `model_${index}`),
        )
        .filter(Boolean);

      return profiles.length > 0 ? profiles : fallbackProfiles;
    } catch (error) {
      logWarn("模型列表解析失败，回退到默认模型配置", error);
      return fallbackProfiles;
    }
  }

  function saveModelProfiles(profiles) {
    const normalizedProfiles = profiles
      .map((profile, index) => normalizeModelProfile(profile, `model_${index}`))
      .filter(Boolean);

    if (normalizedProfiles.length === 0) return;
    GM_setValue("modelProfiles", JSON.stringify(normalizedProfiles));
  }

  function getActiveModelProfileId() {
    return GM_getValue("activeModelProfileId", "");
  }

  function setActiveModelProfileId(profileId) {
    GM_setValue("activeModelProfileId", String(profileId || ""));
  }

  function getActiveModelProfile() {
    const profiles = getModelProfiles();
    const activeProfileId = getActiveModelProfileId();
    return (
      profiles.find((profile) => profile.id === activeProfileId) || profiles[0]
    );
  }

  function setActiveModelProfile(profile) {
    if (!profile) return;
    const normalizedProfile = normalizeModelProfile(profile, profile.id);
    if (!normalizedProfile) return;
    setActiveModelProfileId(profile.id);
    GM_setValue("apiBaseUrl", normalizedProfile.apiBaseUrl);
    GM_setValue("apiKey", normalizedProfile.apiKey);
    GM_setValue("model", normalizedProfile.model);
    GM_setValue("extraBody", normalizedProfile.extraBody);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ================= [2. UI 样式] =================
  GM_addStyle(`
        .it-wrapper { position: fixed; z-index: 2147483647; display: none; align-items: center; justify-content: center; padding: 15px; margin: -15px; pointer-events: auto; }
        .it-btn { width: 32px; height: 32px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 15px; font-weight: bold; box-shadow: 0 4px 12px rgba(255, 105, 180, 0.2); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); border: 1.5px solid rgba(255, 255, 255, 0.4); user-select: none; background: ${CONFIG.primaryGradient}; }
        .it-comicread-auto-layer { position: fixed; inset: 0; z-index: 2147483647; display: none; pointer-events: none; }
        .it-comicread-auto-panel { position: absolute; right: 20px; bottom: 20px; z-index: 1; display: none; flex-direction: column; gap: 10px; width: 220px; padding: 12px; border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 14px; background: rgba(18, 18, 18, 0.82); color: #fff; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); pointer-events: auto; overflow: visible; transition: left 0.18s ease, top 0.18s ease, right 0.18s ease, transform 0.18s ease, opacity 0.18s ease, box-shadow 0.18s ease; }
        .it-comicread-auto-panel[data-collapsed="true"] { gap: 8px; }
        .it-comicread-auto-panel[data-hidden-side="left"] { transform: translateX(calc(-100% + 18px)); box-shadow: 6px 10px 24px rgba(0, 0, 0, 0.2); }
        .it-comicread-auto-panel[data-hidden-side="right"] { transform: translateX(calc(100% - 18px)); box-shadow: -6px 10px 24px rgba(0, 0, 0, 0.2); }
        .it-comicread-auto-panel[data-hidden="false"] { transform: translateX(0); }
        .it-comicread-auto-panel[data-hidden="true"]::before { content: ""; position: absolute; top: 12px; bottom: 12px; width: 2px; border-radius: 999px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.68) 0%, rgba(255, 255, 255, 0.18) 100%); opacity: 0.9; pointer-events: none; }
        .it-comicread-auto-panel[data-hidden-side="left"]::before { right: 6px; }
        .it-comicread-auto-panel[data-hidden-side="right"]::before { left: 6px; }
        .it-comicread-auto-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: grab; user-select: none; padding: 0px 6px 0px;}
        .it-comicread-auto-header:active { cursor: grabbing; }
        .it-comicread-auto-header-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
        .it-comicread-auto-header-actions { display: flex; align-items: center; gap: 8px; }
        .it-comicread-auto-title { font-size: 13px; font-weight: 800; letter-spacing: 0.02em; }
        .it-comicread-auto-hint { font-size: 11px; color: rgba(255, 255, 255, 0.58); }
        .it-comicread-auto-pin { width: 28px; height: 28px; border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 999px; background: rgba(255, 255, 255, 0.06); color: rgba(255, 255, 255, 0.76); cursor: pointer; font-size: 14px; line-height: 1; transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease, transform 0.18s ease; }
        .it-comicread-auto-pin:hover { transform: translateY(-1px); }
        .it-comicread-auto-pin[data-pinned="true"] { background: rgba(255, 255, 255, 0.14); border-color: rgba(255, 255, 255, 0.22); color: #fff; }
        .it-comicread-auto-toggle { width: 28px; height: 28px; border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 999px; background: rgba(255, 255, 255, 0.06); color: #fff; cursor: pointer; font-size: 16px; line-height: 1; }
        .it-comicread-auto-summary { display: none; justify-content: space-between; gap: 10px; font-size: 12px;padding: 0px 6px 0px; color: rgba(255, 255, 255, 0.72); }
        .it-comicread-auto-summary strong { color: #fff; font-variant-numeric: tabular-nums; }
        .it-comicread-auto-grid { display: grid; grid-template-columns: auto 1fr; gap: 6px 10px;padding: 0px 6px 0;font-size: 12px; line-height: 1.45; }
        .it-comicread-auto-label { color: rgba(255, 255, 255, 0.58); }
        .it-comicread-auto-value { text-align: right; font-variant-numeric: tabular-nums; }
        .it-comicread-auto-value[data-tone="running"] { color: #ffd7eb; }
        .it-comicread-auto-value[data-tone="waiting"] { color: #ffe7a6; }
        .it-comicread-auto-value[data-tone="done"] { color: #c8ffd9; }
        .it-comicread-auto-actions { display: flex; justify-content: center; align-items: center; gap: 8px; }
        .it-comicread-auto-panel[data-collapsed="true"] .it-comicread-auto-grid,
        .it-comicread-auto-panel[data-collapsed="true"] .it-comicread-auto-hint { display: none; }
        .it-comicread-auto-panel[data-collapsed="true"] .it-comicread-auto-summary { display: flex; }
        .it-comicread-auto-btn { display: none; align-items: center; justify-content: center; min-width: 92px; height: 36px; padding: 0 14px; border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 999px; background: rgba(20, 20, 20, 0.78); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); pointer-events: auto; transition: opacity 0.18s ease, transform 0.18s ease, background 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease; }
        .it-comicread-auto-btn[data-enabled="true"] { background: ${CONFIG.primaryGradient}; color: #fff; }
        .it-comicread-auto-btn:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(0, 0, 0, 0.34); }
        .it-comicread-auto-btn:disabled { opacity: 0.48; cursor: not-allowed; color: rgba(255, 255, 255, 0.54); background: rgba(80, 80, 80, 0.32); border-color: rgba(255, 255, 255, 0.1); box-shadow: none; }
        .it-comicread-auto-btn[data-role="retry-btn"][data-enabled="true"] { background: linear-gradient(135deg, rgba(255, 224, 130, 0.92) 0%, rgba(255, 167, 38, 0.9) 100%); border-color: rgba(255, 224, 130, 0.42); color: #2f1900; }
        .it-comicread-auto-btn[data-role="retry-btn"][data-enabled="true"]:hover { box-shadow: 0 10px 28px rgba(255, 167, 38, 0.24); }
        .it-comicread-auto-btn[data-role="retry-btn"]:disabled { background: rgba(85, 85, 85, 0.28); color: rgba(255, 255, 255, 0.46); border-color: rgba(255, 255, 255, 0.1); }
        .it-loading { animation: it-pulse 1s infinite ease-in-out; pointer-events: none; }
        @keyframes it-pulse { 0%, 100% { opacity: 0.6; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.05); } }
        .it-popup { position: absolute; top: 40px; right: 0; width: max-content; max-width: 280px; max-height: 350px; overflow-y: auto; background: rgba(30, 30, 30, 0.7); color: #E0E0E0; padding: 12px 15px; padding-top: 20px; border-radius: 8px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 105, 180, 0.5); backdrop-filter: blur(8px); text-align: left; cursor: text; user-select: text; position: relative; }
        .it-popup-close { position: absolute; top: 5px; right: 5px; width: 20px; height: 20px; border: none; background: rgba(255, 105, 180, 0.3); color: #fff; border-radius: 50%; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
        .it-popup-close:hover { background: rgba(255, 105, 180, 0.6); }
        .it-popup::-webkit-scrollbar { width: 6px; }
        .it-popup::-webkit-scrollbar-thumb { background: rgba(255,105,180,0.6); border-radius: 3px; }

        /* 追加：右键菜单样式 */
        .it-context-menu { position: absolute; top: 35px; right: 0; background: rgba(25, 25, 25, 0.95); border: 1px solid rgba(255, 105, 180, 0.5); border-radius: 8px; padding: 6px 0; min-width: 160px; display: none; flex-direction: column; box-shadow: 0 4px 20px rgba(0,0,0,0.6); z-index: 2147483647; }
        .it-menu-item { padding: 8px 15px; color: #fff; cursor: pointer; font-size: 13px; transition: background 0.2s; white-space: nowrap; }
        .it-menu-item:hover { background: rgba(255, 105, 180, 0.4); }
        .it-menu-desc { font-size: 10px; color: rgba(255, 255, 255, 0.5); display: block; margin-top: 2px; }
        .it-menu-sep { height: 1px; background: rgba(255, 255, 255, 0.1); margin: 4px 0; }

        /* 追加：设置面板面板 */
        .it-set-mask { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:2147483647; backdrop-filter: blur(2px); }
        .it-set-box { background:#1e1e1e; border:1px solid #ff69b4; padding:20px; border-radius:12px; width:min(420px, calc(100vw - 24px)); max-height:min(80vh, 720px); overflow:auto; color:#eee; font-family: sans-serif; }
        .it-set-box h3 { margin: 0 0 15px 0; color:#ff69b4; font-size:16px; border-bottom: 1px solid #333; padding-bottom: 10px; position: relative; padding-right: 30px; }
        .it-set-close { position: absolute; top: 0; right: 0; width: 24px; height: 24px; border: none; background: transparent; color: #ff69b4; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
        .it-set-close:hover { transform: scale(1.1); }
        .it-set-box label { display:block; margin: 10px 0 5px; font-size:12px; color:#bbb; }
        .it-set-box input[type="text"], .it-set-box input[type="password"], .it-set-box input[type="number"] { width:100%; background: transparent !important; background-color: transparent !important; border:1px solid #444; color:#fff; padding:8px; border-radius:4px; box-sizing:border-box; outline:none; }
        .it-set-box input[type="text"]:enabled:hover, .it-set-box input[type="password"]:enabled:hover, .it-set-box input[type="number"]:enabled:hover, .it-set-box input[type="text"]:enabled:focus, .it-set-box input[type="password"]:enabled:focus, .it-set-box input[type="number"]:enabled:focus { background: transparent !important; background-color: transparent !important; }
        .it-set-btn { background:#ff69b4; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer; width:100%; margin-top:20px; font-weight:bold; }
        .it-set-btn-sm { background:#3c3c3c; color:#fff; border:1px solid #555; padding:8px 10px; border-radius:4px; cursor:pointer; min-height:34px; font-size:12px; font-weight:600; }

        /* 全局加载提示 */
        .it-global-loading { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(30, 30, 30, 0.95); border: 2px solid #ff69b4; border-radius: 12px; padding: 30px 40px; color: #fff; font-size: 16px; z-index: 2147483647; display: flex; flex-direction: column; align-items: center; gap: 15px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5); backdrop-filter: blur(8px); }
        .it-loading-spinner { width: 40px; height: 40px; border: 4px solid rgba(255, 105, 180, 0.3); border-top-color: #ff69b4; border-radius: 50%; animation: it-spin 1s linear infinite; }
        @keyframes it-spin { to { transform: rotate(360deg); } }
    `);

  const processedImages = new WeakSet();
  const trackedImages = new Set();
  const imageUiEntries = new Set();
  const observedRoots = new WeakSet();
  const trackedImageLoadHooks = new WeakSet();
  const comicReadObservedSourceMap = new WeakMap();
  const comicReadTriggeredSourceMap = new WeakMap();
  const translationCacheLookupMap = new WeakMap();
  const translatedSourceMap = new WeakMap();
  const translatingSourceMap = new WeakMap();
  const failedSourceMap = new WeakMap();
  const failedRetryCountMap = new WeakMap();
  let lastRightClickedImage = null; // 记录最后右键点击的图片
  let globalLoadingEl = null; // 全局加载提示元素
  let comicReadAutoButton = null;
  let comicReadAutoLayer = null;
  let comicReadAutoPanel = null;
  let comicReadRetryButton = null;
  let comicReadAutoSummaryValue = null;
  let comicReadAutoStatusValue = null;
  let comicReadAutoQueueValue = null;
  let comicReadAutoRetryValue = null;
  let comicReadAutoSuccessValue = null;
  let comicReadAutoCurrentValue = null;
  let comicReadCurrentImage = null;
  let comicReadAutoPanelFrame = null;
  let comicReadAutoPanelState = null;
  let autoTranslatePending = false;
  let autoTranslateScheduleTimer = null;
  let autoTranslateDormant = false;
  const autoTranslateInFlight = new Set();
  let hideWrappersFrame = null;
  let comicReadNode = null;
  let comicReadAttributeObserver = null;
  let comicReadImageObserver = null;
  const pendingObservedImages = new Set();
  let observeImageFrame = null;
  const pendingComicReadStateChanges = new Map();
  let comicReadStateChangeFrame = null;
  let translationCachePageUrlsCache = null;
  let translationCacheStoreCache = null;

  const COMICREAD_AUTO_TRANSLATE_KEY = "comicread_auto_translate_enabled";
  const COMICREAD_AUTO_TRANSLATE_DEFAULT_KEY =
    "comicread_auto_translate_default_enabled";
  const COMICREAD_AUTO_COLLAPSED_KEY = "comicread_auto_panel_collapsed";
  const COMICREAD_AUTO_PANEL_POSITION_KEY = "comicread_auto_panel_position";
  const TRANSLATED_SOURCE_ATTR = "data-it-original-source";
  const TRANSLATION_CACHE_ATTR = "data-it-cache-key";
  const TRANSLATION_CACHE_PAGE_URL_KEY = "translation_cache_page_url";
  const TRANSLATION_CACHE_KEY = "translation_cache";
  const MAX_TRANSLATION_PAGE_NUM = 10;
  const MAX_COMICREAD_AUTO_TRANSLATE_SITES = 100;
  const MAX_BATCHED_IMAGE_OPERATIONS = 24;
  const IMAGE_SOURCE_ATTRIBUTES = [
    "src",
    "srcset",
    "data-src",
    "data-original",
    "data-srcset",
  ];
  const TRANSLATION_PROMPT = `请识别图片文字并翻译成简体中文。
要求：
** 请避免字面直译。请根据中文母语者的表达习惯进行意译，确保译文自然、地道、流畅，就像是母语者直接说出来的一样。 **
1. 使用归一化坐标(0-1000)。
2. **严禁保留英文或空格**。将"HAH"等拟声词翻译为"哈"。
3. 翻译长度应与原文视觉长度匹配，用\n换行。换行必须尽量模仿原图气泡或文本框的排版结构，不要照搬原英文的换行位置，必须根据中文的“词语边界”或“语意停顿（如标点符号处）”进行换行。
4. 不要为了塞进文本框而把一句话机械拆成很多很短的行；优先输出更自然、更接近原图的断句和分行。
5. 如果原图本身是多行文本，译文也应尽量保持多行结构；如果原图是一行或两行短句，不要无故拆成更多行。
6. 智能判断字号(small/medium/large)。
7. **坐标格式要求**：每个文本必须包含 x, y, width, height 四个数值，不要使用数组格式。
8. **文本合并要求**：同一行或相邻的文本片段应合并为一个整体，避免过度拆分。
9. **只输出纯JSON**，格式：{"texts":[{"x":100,"y":100,"width":50,"height":20,"text":"中文","size":"medium"}]}。`;

  function getComicReadAutoTranslateSiteUrl() {
    return [location.origin, location.pathname].join("");
  }

  function getCurrentTranslationCachePageUrl() {
    return [location.origin, location.pathname, location.search].join("");
  }

  function getTextLineCount(text) {
    return Math.max(1, String(text || "").split("\n").length);
  }

  function getMinTextBoxHeight(text) {
    return CONFIG.textMinBoxHeight * getTextLineCount(text);
  }

  function sanitizeTranslationTexts(texts) {
    if (!Array.isArray(texts)) return [];
    return texts
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const width = Number(item.width) || 0;
        const text = String(item.text || "");
        const height = Math.max(
          getMinTextBoxHeight(text),
          Number(item.height) || 0,
        );
        return {
          x: item.x,
          y: item.y,
          width,
          height,
          text,
          size: String(item.size || "medium"),
        };
      })
      .filter((item) => item && item.text);
  }

  function fillRoundRect(ctx, x, y, width, height, radius) {
    const nextRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
    ctx.beginPath();
    ctx.moveTo(x + nextRadius, y);
    ctx.arcTo(x + width, y, x + width, y + height, nextRadius);
    ctx.arcTo(x + width, y + height, x, y + height, nextRadius);
    ctx.arcTo(x, y + height, x, y, nextRadius);
    ctx.arcTo(x, y, x + width, y, nextRadius);
    ctx.closePath();
    ctx.fill();
  }

  function isSameTextColumn(a, b) {
    if (!a || !b) return false;
    const ax = Number(Array.isArray(a.x) ? a.x[0] : a.x) || 0;
    const ay = Number(Array.isArray(a.y) ? a.y[0] : a.y) || 0;
    const bx = Number(Array.isArray(b.x) ? b.x[0] : b.x) || 0;
    const by = Number(Array.isArray(b.y) ? b.y[0] : b.y) || 0;
    const aCenterX = ax + a.width / 2;
    const bCenterX = bx + b.width / 2;
    const centerDiff = Math.abs(aCenterX - bCenterX);
    const widthDiff = Math.abs(a.width - b.width);
    const horizontalOverlap =
      Math.min(ax + a.width, bx + b.width) - Math.max(ax, bx);
    const minWidth = Math.min(a.width, b.width);
    if (horizontalOverlap > Math.max(18, minWidth * 0.25)) return true;
    return (
      centerDiff <= Math.max(24, minWidth * 0.18) &&
      widthDiff <= Math.max(36, minWidth * 0.22) &&
      Math.abs(ay - by) <= Math.max(a.height, b.height) * 8
    );
  }

  function shouldMergeTranslationTexts(previousItem, nextItem, previousBottom) {
    if (!previousItem || !nextItem) return false;

    const ax =
      Number(
        Array.isArray(previousItem.x) ? previousItem.x[0] : previousItem.x,
      ) || 0;
    const ay =
      Number(
        Array.isArray(previousItem.y) ? previousItem.y[0] : previousItem.y,
      ) || 0;
    const bx =
      Number(Array.isArray(nextItem.x) ? nextItem.x[0] : nextItem.x) || 0;
    const by =
      Number(Array.isArray(nextItem.y) ? nextItem.y[0] : nextItem.y) || 0;
    const aRight = ax + previousItem.width;
    const bRight = bx + nextItem.width;
    const minWidth = Math.min(previousItem.width, nextItem.width);
    const minHeight = Math.min(previousItem.height, nextItem.height);
    const horizontalOverlap = Math.min(aRight, bRight) - Math.max(ax, bx);
    const centerDiff = Math.abs(
      ax + previousItem.width / 2 - (bx + nextItem.width / 2),
    );
    const widthDiff = Math.abs(previousItem.width - nextItem.width);
    const leftDiff = Math.abs(ax - bx);
    const rightDiff = Math.abs(aRight - bRight);
    const verticalGap =
      by -
      (Number.isFinite(previousBottom)
        ? previousBottom
        : ay + previousItem.height);

    return (
      horizontalOverlap >= Math.max(36, minWidth * 0.45) &&
      centerDiff <= Math.max(20, minWidth * 0.14) &&
      widthDiff <= Math.max(28, minWidth * 0.18) &&
      leftDiff <= Math.max(24, minWidth * 0.12) &&
      rightDiff <= Math.max(24, minWidth * 0.12) &&
      verticalGap <= Math.max(12, minHeight * 0.45)
    );
  }

  function mergeNearbyTranslationTexts(texts) {
    if (!Array.isArray(texts) || texts.length <= 1) return texts || [];

    const sortedTexts = texts
      .map((item) => ({ item }))
      .sort((a, b) => {
        const ay =
          Number(Array.isArray(a.item.y) ? a.item.y[0] : a.item.y) || 0;
        const by =
          Number(Array.isArray(b.item.y) ? b.item.y[0] : b.item.y) || 0;
        if (ay !== by) return ay - by;
        const ax =
          Number(Array.isArray(a.item.x) ? a.item.x[0] : a.item.x) || 0;
        const bx =
          Number(Array.isArray(b.item.x) ? b.item.x[0] : b.item.x) || 0;
        return ax - bx;
      });
    const merged = [];

    for (const { item } of sortedTexts) {
      const rawX = Number(Array.isArray(item.x) ? item.x[0] : item.x) || 0;
      const rawY = Number(Array.isArray(item.y) ? item.y[0] : item.y) || 0;
      const last = merged[merged.length - 1];

      if (!last) {
        merged.push({
          ...item,
          x: rawX,
          y: rawY,
          _isMergedText: false,
          _bottom: rawY + item.height,
          _mergedLineCount: 1,
          _mergedHeightSum: item.height,
        });
        continue;
      }

      if (shouldMergeTranslationTexts(last, item, last._bottom)) {
        last.text = `${last.text}\n${item.text}`;
        last.x = Math.min(last.x, rawX);
        last.y = Math.min(last.y, rawY);
        last.width = Math.max(last.width, item.width);
        last._isMergedText = true;
        last._bottom = Math.max(last._bottom, rawY + item.height);
        last._mergedLineCount += 1;
        last._mergedHeightSum += item.height;
        last.height = Math.max(
          getMinTextBoxHeight(last.text),
          last._bottom - last.y,
          last._mergedHeightSum,
        );
        continue;
      }

      merged.push({
        ...item,
        x: rawX,
        y: rawY,
        _isMergedText: false,
        _bottom: rawY + item.height,
        _mergedLineCount: 1,
        _mergedHeightSum: item.height,
      });
    }

    return merged.map(
      ({
        _bottom,
        _mergedLineCount,
        _mergedHeightSum,
        _isMergedText,
        ...item
      }) => ({ ...item, isMergedText: Boolean(_isMergedText) }),
    );
  }

  function readTranslationCachePageUrlList() {
    if (Array.isArray(translationCachePageUrlsCache)) {
      return translationCachePageUrlsCache.slice();
    }
    try {
      const rawValue = GM_getValue(TRANSLATION_CACHE_PAGE_URL_KEY, "");
      if (!rawValue) return [];
      const parsed = JSON.parse(rawValue);
      translationCachePageUrlsCache = Array.isArray(parsed) ? parsed : [];
      return translationCachePageUrlsCache.slice();
    } catch (error) {
      logWarn("翻译缓存页面列表解析失败", error);
      return [];
    }
  }

  function writeTranslationCachePageUrlList(pageUrls) {
    try {
      translationCachePageUrlsCache = Array.isArray(pageUrls)
        ? pageUrls.slice()
        : [];
      GM_setValue(TRANSLATION_CACHE_PAGE_URL_KEY, JSON.stringify(pageUrls));
    } catch (error) {
      logWarn("翻译缓存页面列表写入失败", error);
    }
  }

  function readTranslationCacheStore() {
    if (
      translationCacheStoreCache &&
      typeof translationCacheStoreCache === "object"
    ) {
      return translationCacheStoreCache;
    }
    try {
      const rawValue = GM_getValue(TRANSLATION_CACHE_KEY, "");
      if (!rawValue) {
        logInfo("翻译缓存为空", {
          storageKey: TRANSLATION_CACHE_KEY,
        });
        translationCacheStoreCache = {};
        return translationCacheStoreCache;
      }
      const parsed = JSON.parse(rawValue);
      const store = parsed && typeof parsed === "object" ? parsed : {};
      translationCacheStoreCache = store;
      logInfo("读取翻译缓存", {
        storageKey: TRANSLATION_CACHE_KEY,
        pageCount: Object.keys(store).length,
      });
      return store;
    } catch (error) {
      logWarn("翻译缓存解析失败", error);
      return {};
    }
  }

  function writeTranslationCacheStore(store) {
    try {
      translationCacheStoreCache =
        store && typeof store === "object" ? store : {};
      GM_setValue(TRANSLATION_CACHE_KEY, JSON.stringify(store));
    } catch (error) {
      logWarn("翻译缓存写入失败", error);
    }
  }

  function cleanupTranslationCachePages(
    pageUrls,
    store,
    maxPageCount = CONFIG.maxTranslationPageNum,
  ) {
    if (pageUrls.length <= maxPageCount) {
      return { pageUrls, store };
    }

    const nextPageUrls = pageUrls.slice(0, maxPageCount);
    const nextStore = {};
    nextPageUrls.forEach((pageUrl) => {
      if (store[pageUrl]) nextStore[pageUrl] = store[pageUrl];
    });
    logInfo("裁剪翻译缓存页面", {
      beforeCount: pageUrls.length,
      afterCount: nextPageUrls.length,
      maxCount: maxPageCount,
    });
    return { pageUrls: nextPageUrls, store: nextStore };
  }

  function trimTranslationCachePages(
    maxPageCount = CONFIG.maxTranslationPageNum,
  ) {
    const pageUrls = readTranslationCachePageUrlList();
    const store = readTranslationCacheStore();
    const cleaned = cleanupTranslationCachePages(pageUrls, store, maxPageCount);
    writeTranslationCachePageUrlList(cleaned.pageUrls);
    writeTranslationCacheStore(cleaned.store);
    return cleaned;
  }

  function buildTranslationCacheLookupFingerprint(img, info, pageIndex, keys) {
    return JSON.stringify({
      pageUrl: getCurrentTranslationCachePageUrl(),
      pageLabel: info?.pageLabel || "",
      pageIndex: Number.isInteger(pageIndex) ? pageIndex : null,
      source: info?.source || "",
      keys,
      translated: isTranslatedSource(img),
      translating: isTranslatingSource(img),
      failed: isFailedSource(img),
      cacheState: img?.getAttribute?.(TRANSLATION_CACHE_ATTR) || "",
    });
  }

  function clearTranslationCache() {
    writeTranslationCachePageUrlList([]);
    writeTranslationCacheStore({});
    for (const img of getTrackedImages()) {
      img?.removeAttribute?.(TRANSLATION_CACHE_ATTR);
      translationCacheLookupMap.delete(img);
    }
    logInfo("已清空翻译缓存", {
      pageUrlCount: 0,
      storageKey: TRANSLATION_CACHE_KEY,
    });
  }

  function getStableSourceFingerprint(source) {
    const normalizedSource = String(source || "").trim();
    if (!normalizedSource) return "";

    try {
      const url = new URL(normalizedSource, location.href);
      const pathParts = url.pathname.split("/").filter(Boolean);
      const tail = pathParts.slice(-3).join("/");
      return `${url.hostname}/${tail}`;
    } catch (error) {
      return normalizedSource;
    }
  }

  function buildTranslationCacheKeys(source, pageLabel, pageIndex) {
    const keys = [];
    const normalizedPageLabel = String(pageLabel || "").trim();
    if (Number.isInteger(pageIndex) && pageIndex >= 0) {
      keys.push(`index::${pageIndex}`);
    }
    if (normalizedPageLabel) keys.push(`page::${normalizedPageLabel}`);
    const sourceFingerprint = getStableSourceFingerprint(source);
    if (sourceFingerprint) keys.push(`source_fp::${sourceFingerprint}`);
    return keys;
  }

  function getPrimaryTranslationCacheKey(source, pageLabel, pageIndex) {
    const keys = buildTranslationCacheKeys(source, pageLabel, pageIndex);
    return keys[0] || "";
  }

  function getComicReadPageIndex(img) {
    const rawIndex = Number.parseInt(img?.getAttribute?.("alt") || "", 10);
    if (Number.isFinite(rawIndex) && rawIndex >= 0) return rawIndex;

    const comicReadImages = getTrackedImages().filter((item) =>
      isComicReadImage(item),
    );
    const fallbackIndex = comicReadImages.indexOf(img);
    return fallbackIndex >= 0 ? fallbackIndex : null;
  }

  function saveTranslationCacheEntry(img, source, texts) {
    const sanitizedTexts = sanitizeTranslationTexts(texts);
    if (!source || sanitizedTexts.length === 0) {
      logWarn("跳过写入翻译缓存", {
        hasSource: Boolean(source),
        textCount: sanitizedTexts.length,
      });
      return;
    }

    const info = getImageDebugInfo(img);
    const pageIndex = getComicReadPageIndex(img);
    const keys = buildTranslationCacheKeys(source, info.pageLabel, pageIndex);
    const primaryKey = getPrimaryTranslationCacheKey(
      source,
      info.pageLabel,
      pageIndex,
    );
    if (!primaryKey) {
      logWarn("翻译缓存没有可用键，跳过写入", {
        page: info.pageLabel,
        pageIndex,
        source: info.sourcePreview,
      });
      return;
    }

    const cacheEntry = {
      source,
      pageLabel: info.pageLabel,
      pageIndex,
      texts: sanitizedTexts,
      updatedAt: Date.now(),
    };

    const pageUrl = getCurrentTranslationCachePageUrl();
    const pageUrls = readTranslationCachePageUrlList();
    const store = readTranslationCacheStore();
    const pageStore =
      store[pageUrl] && typeof store[pageUrl] === "object"
        ? store[pageUrl]
        : {};

    keys.forEach((key) => {
      if (key !== primaryKey && pageStore[key]) {
        delete pageStore[key];
      }
    });
    pageStore[primaryKey] = cacheEntry;
    store[pageUrl] = pageStore;

    const nextPageUrls = [
      pageUrl,
      ...pageUrls.filter((item) => item !== pageUrl),
    ];
    const cleaned = cleanupTranslationCachePages(nextPageUrls, store);
    writeTranslationCachePageUrlList(cleaned.pageUrls);
    writeTranslationCacheStore(cleaned.store);
    translationCacheLookupMap.set(img, {
      fingerprint: buildTranslationCacheLookupFingerprint(
        img,
        { pageLabel: info.pageLabel, source },
        pageIndex,
        keys,
      ),
      result: { key: primaryKey, entry: cacheEntry },
    });
    logInfo("已写入翻译缓存", {
      pageUrl,
      page: info.pageLabel,
      pageIndex,
      primaryKey,
      keys,
      keyCount: 1,
      textCount: sanitizedTexts.length,
      source: info.sourcePreview,
    });
  }

  function findTranslationCacheEntry(img) {
    const info = getImageDebugInfo(img);
    const pageIndex = getComicReadPageIndex(img);
    const keys = buildTranslationCacheKeys(
      info.source,
      info.pageLabel,
      pageIndex,
    );
    const cacheFingerprint = buildTranslationCacheLookupFingerprint(
      img,
      info,
      pageIndex,
      keys,
    );
    const pageUrl = getCurrentTranslationCachePageUrl();
    if (keys.length === 0) {
      logInfo("翻译缓存查找跳过，无可用键", {
        pageUrl,
        page: info.pageLabel,
        pageIndex,
        source: info.sourcePreview,
      });
      translationCacheLookupMap.set(img, {
        fingerprint: cacheFingerprint,
        result: null,
      });
      return null;
    }

    const cachedLookup = translationCacheLookupMap.get(img);
    if (cachedLookup?.fingerprint === cacheFingerprint) {
      return cachedLookup.result;
    }

    const store = readTranslationCacheStore();
    const pageStore =
      store[pageUrl] && typeof store[pageUrl] === "object"
        ? store[pageUrl]
        : {};
    // logInfo("开始查找翻译缓存", {
    //   pageUrl,
    //   page: info.pageLabel,
    //   pageIndex,
    //   keys,
    //   source: info.sourcePreview,
    // });
    for (const key of keys) {
      const entry = pageStore[key];
      if (!entry || !Array.isArray(entry.texts) || entry.texts.length === 0) {
        continue;
      }
      if (key !== keys[0]) {
        logInfo("命中旧缓存别名键", {
          page: info.pageLabel,
          pageIndex,
          key,
          primaryCandidate: keys[0] || "",
        });
      }
      // logInfo("命中翻译缓存记录", {
      //   page: info.pageLabel,
      //   pageIndex,
      //   key,
      //   textCount: entry.texts.length,
      // });
      const matched = { key, entry };
      translationCacheLookupMap.set(img, {
        fingerprint: cacheFingerprint,
        result: matched,
      });
      return matched;
    }
    // logInfo("未命中翻译缓存", {
    //   page: info.pageLabel,
    //   pageIndex,
    //   keys,
    // });
    translationCacheLookupMap.set(img, {
      fingerprint: cacheFingerprint,
      result: null,
    });
    return null;
  }

  async function renderTranslatedImage(img, blob, texts) {
    const sanitizedTexts = sanitizeTranslationTexts(texts);
    const mergedTexts = mergeNearbyTranslationTexts(sanitizedTexts);
    if (mergedTexts.length === 0) {
      throw new Error("翻译结果中没有可渲染的文本");
    }

    const offImg = new Image();
    await new Promise((resolve, reject) => {
      offImg.onload = resolve;
      offImg.onerror = reject;
      offImg.src = blob;
    });
    const cvs = document.createElement("canvas");
    cvs.width = offImg.naturalWidth;
    cvs.height = offImg.naturalHeight;
    const ctx = cvs.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
    ctx.drawImage(offImg, 0, 0);

    const layoutItems = mergedTexts
      .map((item) => ({ item }))
      .sort((a, b) => {
        const ay =
          Number(Array.isArray(a.item.y) ? a.item.y[0] : a.item.y) || 0;
        const by =
          Number(Array.isArray(b.item.y) ? b.item.y[0] : b.item.y) || 0;
        if (ay !== by) return ay - by;
        const ax =
          Number(Array.isArray(a.item.x) ? a.item.x[0] : a.item.x) || 0;
        const bx =
          Number(Array.isArray(b.item.x) ? b.item.x[0] : b.item.x) || 0;
        return ax - bx;
      });

    layoutItems.forEach(({ item }, itemIndex) => {
      const w = (item.width * cvs.width) / 1000;
      const h = (item.height * cvs.height) / 1000;
      const rawX = Array.isArray(item.x) ? item.x[0] : item.x;
      const rawY = Array.isArray(item.y) ? item.y[0] : item.y;
      const x = (rawX * cvs.width) / 1000;
      const y = (rawY * cvs.height) / 1000;
      let previousLayoutItem = null;
      for (let i = itemIndex - 1; i >= 0; i -= 1) {
        if (isSameTextColumn(layoutItems[i]?.item, item)) {
          previousLayoutItem = layoutItems[i].item;
          break;
        }
      }
      let nextLayoutItem = null;
      for (let i = itemIndex + 1; i < layoutItems.length; i += 1) {
        if (isSameTextColumn(layoutItems[i]?.item, item)) {
          nextLayoutItem = layoutItems[i].item;
          break;
        }
      }
      const previousY = Number(
        Array.isArray(previousLayoutItem?.y)
          ? previousLayoutItem.y[0]
          : previousLayoutItem?.y,
      );
      const nextY = Number(
        Array.isArray(nextLayoutItem?.y)
          ? nextLayoutItem.y[0]
          : nextLayoutItem?.y,
      );
      const minVerticalGap = Math.max(10, item.height * 0.3);
      const maxTop = Number.isFinite(previousY)
        ? Math.max(0, rawY - previousY - minVerticalGap)
        : null;
      const maxBottom = Number.isFinite(nextY)
        ? Math.max(0, nextY - rawY - minVerticalGap)
        : null;
      const availableHeightUnits = [maxTop, maxBottom]
        .filter((value) => Number.isFinite(value) && value > 0)
        .reduce((minValue, value) => Math.min(minValue, value), item.height);
      const mergedLineCount = Math.max(
        1,
        String(item.text || "").split("\n").length,
      );
      const isNaturalMultiLineText = mergedLineCount > 1 && !item.isMergedText;
      const baseLineHeightRatio = item.isMergedText
        ? CONFIG.mergedTextLineHeightRatio
        : isNaturalMultiLineText
          ? 1.08
          : 1.18;
      const textHeightBoostRatio = isNaturalMultiLineText ? 1.18 : 1;
      const mergedMinBlockHeight = item.isMergedText
        ? (CONFIG.textMinBoxHeight *
            CONFIG.mergedTextLineHeightRatio *
            mergedLineCount *
            cvs.height) /
          1000
        : 0;
      const maxBlockHeight = Math.max(
        (availableHeightUnits * cvs.height) / 1000,
        mergedMinBlockHeight,
        h * textHeightBoostRatio,
        Math.min(h, 24),
      );
      const widthBasedFontSize =
        (cvs.width / 800) *
        CONFIG.fontSize *
        (CONFIG.sizeMapping[item.size] || 1.0);
      const heightBasedFontSize =
        (h * textHeightBoostRatio) /
        Math.max(1, mergedLineCount * baseLineHeightRatio);
      const maxFontSizeForItem =
        CONFIG.maxFontSizeBySize[item.size] ||
        CONFIG.maxFontSizeBySize.medium ||
        30;
      let fs = Math.max(
        10,
        Math.floor(
          Math.min(
            Math.max(widthBasedFontSize, heightBasedFontSize),
            maxFontSizeForItem,
            h * 0.9,
          ),
        ),
      );
      let strokeWidth = 0;
      let lineHeight = 0;
      let lines = [];
      let textBlockHeight = 0;
      let textBlockWidth = 0;

      for (; fs >= 10; fs -= 1) {
        strokeWidth = Math.max(CONFIG.strokeWidth, Math.round(fs * 0.16));
        lineHeight = Math.max(fs * baseLineHeightRatio, fs + strokeWidth * 0.7);
        ctx.font = `900 ${fs}px ${CONFIG.fontFamily}`;
        if ("fontKerning" in ctx) ctx.fontKerning = "normal";
        if ("textRendering" in ctx) ctx.textRendering = "geometricPrecision";
        lines = smartWrapText(ctx, item.text, w);
        const lineWidths = lines.map((line) => ctx.measureText(line).width);
        const maxLineWidth = Math.max(...lineWidths, 0);
        textBlockWidth = Math.min(w, maxLineWidth);
        textBlockHeight = Math.max(lineHeight, lines.length * lineHeight);
        if (textBlockHeight <= maxBlockHeight || fs === 10) {
          break;
        }
      }

      ctx.font = `900 ${fs}px ${CONFIG.fontFamily}`;
      if ("fontKerning" in ctx) ctx.fontKerning = "normal";
      if ("textRendering" in ctx) ctx.textRendering = "geometricPrecision";
      lines = smartWrapText(ctx, item.text, w);
      const lineWidths = lines.map((line) => ctx.measureText(line).width);
      const maxLineWidth = Math.max(...lineWidths, 0);
      textBlockWidth = Math.min(w, maxLineWidth);
      textBlockHeight = Math.max(lineHeight, lines.length * lineHeight);
      const backgroundPadding = Math.max(
        4,
        Math.round(
          Math.min(textBlockWidth || w, textBlockHeight || h) *
            CONFIG.textBackgroundPaddingRatio,
        ),
      );
      const backgroundX = x + w / 2 - textBlockWidth / 2 - backgroundPadding;
      const backgroundY = y + h / 2 - textBlockHeight / 2 - backgroundPadding;
      const backgroundWidth = textBlockWidth + backgroundPadding * 2;
      const backgroundHeight = textBlockHeight + backgroundPadding * 2;
      const backgroundRadius = Math.max(
        10,
        Math.round(
          Math.min(backgroundWidth, backgroundHeight) *
            CONFIG.textBackgroundRadiusRatio,
        ),
      );
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.miterLimit = 2;
      ctx.save();
      ctx.fillStyle = CONFIG.textBackgroundColor;
      fillRoundRect(
        ctx,
        backgroundX,
        backgroundY,
        backgroundWidth,
        backgroundHeight,
        backgroundRadius,
      );
      ctx.restore();
      lines.forEach((line, index) => {
        const lineY =
          y +
          h / 2 -
          ((lines.length - 1) * lineHeight) / 2 +
          index * lineHeight;
        ctx.strokeStyle = CONFIG.strokeColor;
        ctx.lineWidth = strokeWidth + 2;
        ctx.strokeText(line, x + w / 2, lineY);
        ctx.lineWidth = strokeWidth + 1;
        ctx.strokeText(line, x + w / 2, lineY);
        ctx.lineWidth = strokeWidth;
        ctx.strokeText(line, x + w / 2, lineY);
        ctx.fillStyle = CONFIG.textColor;
        ctx.fillText(line, x + w / 2, lineY);
      });
    });

    return cvs.toDataURL(CONFIG.outputMimeType);
  }

  function isRestoringTranslationFromCache(img) {
    return img?.getAttribute?.(TRANSLATION_CACHE_ATTR) === "restoring";
  }

  function canUseTranslationCache(img, options = {}) {
    const { allowWhileTranslating = false } = options;
    if (
      !img?.isConnected ||
      isRestoringTranslationFromCache(img) ||
      img.getAttribute(TRANSLATION_CACHE_ATTR) === "done"
    ) {
      // logInfo("跳过缓存读取：图片未连接或已恢复", {
      //   connected: Boolean(img?.isConnected),
      //   cacheState: img?.getAttribute?.(TRANSLATION_CACHE_ATTR) || "",
      // });
      return false;
    }

    if (
      isTranslatedSource(img) ||
      (!allowWhileTranslating && isTranslatingSource(img)) ||
      isFailedSource(img)
    ) {
      logInfo("跳过缓存读取：图片已有状态", {
        page: getImageDebugInfo(img).pageLabel,
        translated: isTranslatedSource(img),
        translating: isTranslatingSource(img),
        allowWhileTranslating,
        failed: isFailedSource(img),
      });
      return false;
    }

    return true;
  }

  function getTranslationCacheCandidate(img, options = {}) {
    if (!canUseTranslationCache(img, options)) return null;
    return findTranslationCacheEntry(img);
  }

  async function restoreTranslationFromCache(img, matchedCache) {
    if (!matchedCache) return false;

    const { key, entry } = matchedCache;
    if (!hasLoadedImageData(img)) {
      // logInfo("缓存已命中，等待图片数据可用后再恢复", {
      //   cacheKey: key,
      //   page: entry.pageLabel || "无",
      // });
      return false;
    }

    const currentSource = getSourceKey(img);
    if (!currentSource) {
      logInfo("跳过缓存恢复：当前图片无可用 source", {
        cacheKey: key,
        page: entry.pageLabel || "无",
      });
      return false;
    }

    img.setAttribute(TRANSLATION_CACHE_ATTR, "restoring");
    // logInfo("开始从缓存恢复译图", {
    //   cacheKey: key,
    //   page: entry.pageLabel || "无",
    //   pageIndex: entry.pageIndex,
    //   textCount: entry.texts.length,
    // });
    try {
      const blob = await getImageDataUrl(img);
      const dataUrl = await renderTranslatedImage(img, blob, entry.texts);
      img.src = dataUrl;
      markTranslatedSource(img, currentSource);
      img.setAttribute(TRANSLATION_CACHE_ATTR, "done");
      logInfo("命中翻译缓存并恢复译图", {
        page: entry.pageLabel || "无",
        cacheKey: key,
        textCount: entry.texts.length,
        source: `${currentSource.slice(0, 120)}${currentSource.length > 120 ? "..." : ""}`,
      });
      return true;
    } catch (error) {
      img.removeAttribute(TRANSLATION_CACHE_ATTR);
      logWarn("恢复翻译缓存失败", {
        page: entry.pageLabel || "无",
        cacheKey: key,
        error,
      });
      return false;
    }
  }

  function readComicReadAutoTranslateSites() {
    try {
      const rawValue = GM_getValue(COMICREAD_AUTO_TRANSLATE_KEY, []);
      if (!Array.isArray(rawValue)) return [];
      return rawValue
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const url = String(item.url || "").trim();
          if (!url) return null;
          return {
            url,
            enabled: Boolean(item.enabled),
            updatedAt: Number(item.updatedAt) || 0,
          };
        })
        .filter(Boolean);
    } catch (error) {
      logWarn("读取 ComicRead 自动翻译网站配置失败", { error });
      return [];
    }
  }

  function writeComicReadAutoTranslateSites(entries) {
    try {
      GM_setValue(COMICREAD_AUTO_TRANSLATE_KEY, entries);
    } catch (error) {
      logWarn("写入 ComicRead 自动翻译网站配置失败", {
        count: entries?.length || 0,
        error,
      });
    }
  }

  function getComicReadAutoTranslateSiteEntry() {
    const siteUrl = getComicReadAutoTranslateSiteUrl();
    return readComicReadAutoTranslateSites().find(
      (item) => item.url === siteUrl,
    );
  }

  function parseSrcsetCandidate(value) {
    if (!value) return "";
    const firstItem = String(value)
      .split(",")
      .map((item) => item.trim())
      .find(Boolean);
    if (!firstItem) return "";
    return firstItem.split(/\s+/)[0] || "";
  }

  function isSupportedImageSource(source) {
    if (!source) return false;
    const normalized = String(source).trim();
    if (!normalized) return false;
    if (normalized.startsWith("blob:")) return true;
    if (normalized.startsWith("data:image/")) return true;
    if (normalized.startsWith("data:")) return false;

    try {
      const url = new URL(normalized, location.href);
      return ["http:", "https:"].includes(url.protocol);
    } catch (error) {
      return false;
    }
  }

  function pickImageSource(candidates) {
    for (const candidate of candidates) {
      const normalized = String(candidate || "").trim();
      if (!normalized) continue;
      const parsedCandidate = normalized.includes(",")
        ? parseSrcsetCandidate(normalized)
        : normalized;
      if (isSupportedImageSource(parsedCandidate)) return parsedCandidate;
    }
    return "";
  }

  function getImageSource(img) {
    return pickImageSource([
      img?.getAttribute?.("data-src"),
      img?.getAttribute?.("data-original"),
      img?.getAttribute?.("data-srcset"),
      img?.getAttribute?.("srcset"),
      img?.currentSrc,
      img?.src,
      img?.getAttribute?.("src"),
    ]);
  }

  function parseComicReadPageLabel(img) {
    const rawIndex = Number.parseInt(img?.getAttribute?.("alt") || "", 10);
    if (!Number.isFinite(rawIndex) || rawIndex < 0) return "无";
    return `第 ${rawIndex + 1} 页`;
  }

  function getComicReadRenderedSource(img) {
    const loadType =
      img?.closest?.("[data-load-type]")?.getAttribute("data-load-type") ||
      "loaded";
    const renderedSource = pickImageSource([
      img?.currentSrc,
      img?.src,
      img?.getAttribute?.("src"),
    ]);
    const stableRenderedSource =
      renderedSource && !renderedSource.startsWith("data:image/")
        ? renderedSource
        : "";

    return pickImageSource([
      loadType === "loaded" ? stableRenderedSource : "",
      img?.getAttribute?.("data-srcset"),
      img?.getAttribute?.("srcset"),
      img?.getAttribute?.("data-src"),
      img?.getAttribute?.("data-original"),
      stableRenderedSource,
    ]);
  }

  function getComicReadImageMeta(img) {
    const loadContainer = img?.closest?.("[data-load-type]");
    const loadType = loadContainer?.getAttribute("data-load-type") || "loaded";
    const pageLabel = parseComicReadPageLabel(img);
    const translatedSource = pickImageSource([
      img?.getAttribute?.(TRANSLATED_SOURCE_ATTR),
    ]);
    const renderedSource = getComicReadRenderedSource(img);
    const source = pickImageSource([translatedSource, renderedSource]);

    return {
      loadType,
      pageLabel,
      source,
    };
  }

  function getSourceKey(img) {
    if (isComicReadImage(img)) {
      return getComicReadImageMeta(img).source;
    }
    return getImageSource(img);
  }

  function isVisibleImage(img) {
    if (!img || !img.isConnected) return false;
    const rect = img.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function getImageDimensions(img) {
    if (!img) return { width: 0, height: 0 };
    return {
      width: img.naturalWidth > 0 ? img.naturalWidth : img.width,
      height: img.naturalHeight > 0 ? img.naturalHeight : img.height,
    };
  }

  function hasLoadedImageData(img) {
    if (!img?.isConnected) return false;
    const source = getSourceKey(img);
    if (!source) return false;

    const { width, height } = getImageDimensions(img);
    if (width < CONFIG.minImageSize || height < CONFIG.minImageSize)
      return false;
    if (width * height < CONFIG.minImageArea) return false;

    return img.complete || width > 0 || height > 0;
  }

  function isQualifiedImage(img) {
    if (!isVisibleImage(img)) return false;
    return hasLoadedImageData(img);
  }

  function cleanupImageUiEntries() {
    for (const entry of imageUiEntries) {
      if (entry.img?.isConnected && entry.wrapper?.isConnected) continue;
      clearTimeout(entry.hideTimer);
      entry.wrapper?.remove();
      imageUiEntries.delete(entry);
    }
  }

  function cleanupTrackedImages() {
    for (const img of trackedImages) {
      if (!img?.isConnected) trackedImages.delete(img);
    }
    cleanupImageUiEntries();
  }

  function getTrackedImages() {
    cleanupTrackedImages();
    return Array.from(trackedImages);
  }

  function getComicReadNode() {
    if (comicReadNode?.isConnected) return comicReadNode;
    return document.getElementById("comicRead");
  }

  function isComicReadModeActive() {
    const node = getComicReadNode();
    if (!node) return false;

    // ComicRead uses the `show` attribute as the canonical read-mode flag.
    // Once it is removed, the container can still retain a large layout box
    // briefly, which would otherwise keep the status panel visible and block
    // the entry button.
    return node.hasAttribute("show");
  }

  function mountComicReadAutoLayer() {
    if (!comicReadAutoLayer) return;

    const comicReadDom = getComicReadNode();
    if (comicReadDom?.parentNode) {
      comicReadDom.insertAdjacentElement("afterend", comicReadAutoLayer);
    } else if (
      document.body &&
      comicReadAutoLayer.parentNode !== document.body
    ) {
      document.body.appendChild(comicReadAutoLayer);
    }
  }

  function ensureComicReadAutoLayer() {
    if (comicReadAutoLayer?.isConnected) {
      mountComicReadAutoLayer();
      return comicReadAutoLayer;
    }
    if (!document.body) return null;

    const layer = document.createElement("div");
    layer.className = "it-comicread-auto-layer comicread-ignore";
    comicReadAutoLayer = layer;
    mountComicReadAutoLayer();
    if (!layer.isConnected) document.body.appendChild(layer);
    return layer;
  }

  function isNearViewportImage(img) {
    const rect = img.getBoundingClientRect();
    return (
      rect.bottom > -120 &&
      rect.top < window.innerHeight + 120 &&
      rect.right > -120 &&
      rect.left < window.innerWidth + 120
    );
  }

  function isComicReadImage(img) {
    if (!img?.isConnected) return false;

    if (img.closest?.("#comicRead")) return true;

    let root = img.getRootNode?.();
    while (root?.host) {
      if (root.host.id === "comicRead") return true;
      if (root.host.closest?.("#comicRead")) return true;
      root = root.host.getRootNode?.();
    }

    return false;
  }

  function getComicReadAutoTranslateEnabled() {
    const entry = getComicReadAutoTranslateSiteEntry();
    if (entry) return entry.enabled;
    return getComicReadAutoTranslateDefaultEnabled();
  }

  function setComicReadAutoTranslateEnabled(value) {
    const siteUrl = getComicReadAutoTranslateSiteUrl();
    const nextEnabled = Boolean(value);
    const now = Date.now();
    const entries = readComicReadAutoTranslateSites().filter(
      (item) => item.url !== siteUrl,
    );
    entries.push({
      url: siteUrl,
      enabled: nextEnabled,
      updatedAt: now,
    });
    entries.sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
    const trimmedEntries =
      entries.length > MAX_COMICREAD_AUTO_TRANSLATE_SITES
        ? entries.slice(entries.length - MAX_COMICREAD_AUTO_TRANSLATE_SITES)
        : entries;
    writeComicReadAutoTranslateSites(trimmedEntries);
  }

  function getComicReadAutoTranslateDefaultEnabled() {
    const defaultValue = GM_getValue(
      COMICREAD_AUTO_TRANSLATE_DEFAULT_KEY,
      null,
    );
    if (defaultValue !== null) return Boolean(defaultValue);

    const legacyValue = GM_getValue(COMICREAD_AUTO_TRANSLATE_KEY, null);
    return typeof legacyValue === "boolean" ? legacyValue : false;
  }

  function setComicReadAutoTranslateDefaultEnabled(value) {
    GM_setValue(COMICREAD_AUTO_TRANSLATE_DEFAULT_KEY, Boolean(value));
  }

  function getDefaultComicReadAutoPanelPosition() {
    return {
      side: "left",
      top: null,
      pinned: false,
      hidden: true,
    };
  }

  function readComicReadAutoPanelPosition() {
    try {
      const rawValue = GM_getValue(
        COMICREAD_AUTO_PANEL_POSITION_KEY,
        getDefaultComicReadAutoPanelPosition(),
      );
      const value =
        rawValue && typeof rawValue === "object"
          ? rawValue
          : getDefaultComicReadAutoPanelPosition();
      return {
        side: value.side === "left" ? "left" : "right",
        top: Number.isFinite(Number(value.top)) ? Number(value.top) : null,
        pinned: Boolean(value.pinned),
        hidden: value.hidden !== false,
      };
    } catch (error) {
      logWarn("读取 ComicRead 状态卡片位置失败", error);
      return getDefaultComicReadAutoPanelPosition();
    }
  }

  function writeComicReadAutoPanelPosition(position) {
    const nextPosition = {
      side: position?.side === "left" ? "left" : "right",
      top: Number.isFinite(Number(position?.top)) ? Number(position.top) : null,
      pinned: Boolean(position?.pinned),
      hidden: position?.hidden !== false,
    };
    comicReadAutoPanelState = nextPosition;
    try {
      GM_setValue(COMICREAD_AUTO_PANEL_POSITION_KEY, nextPosition);
    } catch (error) {
      logWarn("写入 ComicRead 状态卡片位置失败", error);
    }
    return nextPosition;
  }

  function getComicReadAutoPanelPosition() {
    if (comicReadAutoPanelState) return comicReadAutoPanelState;
    comicReadAutoPanelState = readComicReadAutoPanelPosition();
    return comicReadAutoPanelState;
  }

  function getComicReadAutoPanelMetrics(panel = comicReadAutoPanel) {
    if (!panel) {
      return {
        width: 220,
        height: 0,
      };
    }
    const rect = panel.getBoundingClientRect();
    return {
      width: rect.width || panel.offsetWidth || 220,
      height: rect.height || panel.offsetHeight || 0,
    };
  }

  function clampComicReadAutoPanelTop(top, panel = comicReadAutoPanel) {
    const { height } = getComicReadAutoPanelMetrics(panel);
    const maxTop = Math.max(16, window.innerHeight - height - 16);
    return Math.min(Math.max(16, Number(top) || 16), maxTop);
  }

  function getComicReadAutoPanelCurrentLeft(panel = comicReadAutoPanel) {
    if (!panel) return 0;
    const parsedLeft = Number.parseFloat(panel.style.left);
    if (Number.isFinite(parsedLeft)) return parsedLeft;
    const rect = panel.getBoundingClientRect();
    return Number.isFinite(rect.left) ? rect.left : 0;
  }

  function applyComicReadAutoPanelPosition(
    panel = comicReadAutoPanel,
    position = getComicReadAutoPanelPosition(),
  ) {
    if (!panel || !position) return;
    const nextTop =
      position.top === null
        ? clampComicReadAutoPanelTop(window.innerHeight - 200, panel)
        : clampComicReadAutoPanelTop(position.top, panel);
    panel.style.bottom = "auto";
    panel.style.left = position.side === "left" ? "0px" : "auto";
    panel.style.right = position.side === "right" ? "0px" : "auto";
    panel.style.top = `${nextTop}px`;
    panel.setAttribute("data-hidden-side", position.side);
    panel.setAttribute(
      "data-hidden",
      position.pinned ? "false" : position.hidden ? "true" : "false",
    );
    panel.setAttribute("data-pinned", position.pinned ? "true" : "false");
    if (position.top !== nextTop) {
      writeComicReadAutoPanelPosition({ ...position, top: nextTop });
    }
  }

  function setComicReadAutoPanelHidden(hidden) {
    const currentPosition = getComicReadAutoPanelPosition();
    if (currentPosition.pinned) {
      applyComicReadAutoPanelPosition(comicReadAutoPanel, {
        ...currentPosition,
        hidden: false,
      });
      return;
    }
    const nextPosition = writeComicReadAutoPanelPosition({
      ...currentPosition,
      hidden,
    });
    applyComicReadAutoPanelPosition(comicReadAutoPanel, nextPosition);
  }

  function attachComicReadAutoPanelInteractions(panel) {
    if (!panel || panel.dataset.dragReady === "true") return;
    panel.dataset.dragReady = "true";
    const header = panel.querySelector(".it-comicread-auto-header");
    if (!header) return;

    let dragState = null;

    const stopDragging = (event) => {
      if (!dragState) return;
      const panelWidth = dragState.panelWidth || panel.offsetWidth || 220;
      const currentLeft = getComicReadAutoPanelCurrentLeft(panel);
      const currentTop =
        Number.parseFloat(panel.style.top) ||
        panel.getBoundingClientRect().top ||
        16;
      const distanceToLeft = currentLeft;
      const distanceToRight = Math.abs(
        window.innerWidth - (currentLeft + panelWidth),
      );
      const snapThreshold = Math.min(96, Math.max(56, panelWidth * 0.35));
      const shouldSnap =
        Math.min(distanceToLeft, distanceToRight) <= snapThreshold;
      const side = distanceToLeft <= distanceToRight ? "left" : "right";
      writeComicReadAutoPanelPosition({
        side,
        top: clampComicReadAutoPanelTop(currentTop, panel),
        pinned: !shouldSnap,
        hidden: shouldSnap,
      });
      dragState = null;
      panel.removeAttribute("data-dragging");
      header.style.cursor = "grab";
      document.removeEventListener("pointermove", dragStateMove, true);
      document.removeEventListener("pointerup", stopDragging, true);
      document.removeEventListener("pointercancel", stopDragging, true);
      applyComicReadAutoPanelPosition(panel);
      if (event) event.preventDefault();
    };

    const dragStateMove = (event) => {
      if (!dragState) return;
      const panelWidth = dragState.panelWidth || panel.offsetWidth || 220;
      const nextLeft = Math.min(
        Math.max(0, event.clientX - dragState.offsetX),
        Math.max(0, window.innerWidth - panelWidth),
      );
      const nextTop = clampComicReadAutoPanelTop(
        event.clientY - dragState.offsetY,
        panel,
      );
      panel.style.left = `${nextLeft}px`;
      panel.style.right = "auto";
      panel.style.top = `${nextTop}px`;
      panel.style.bottom = "auto";
      panel.setAttribute("data-hidden", "false");
      panel.removeAttribute("data-hidden-side");
      event.preventDefault();
    };

    header.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      if (event.target.closest("button")) return;
      const rect = panel.getBoundingClientRect();
      dragState = {
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        panelWidth: rect.width || panel.offsetWidth || 220,
      };
      panel.setAttribute("data-dragging", "true");
      header.style.cursor = "grabbing";
      panel.setPointerCapture?.(event.pointerId);
      setComicReadAutoPanelHidden(false);
      document.addEventListener("pointermove", dragStateMove, true);
      document.addEventListener("pointerup", stopDragging, true);
      document.addEventListener("pointercancel", stopDragging, true);
      event.preventDefault();
    });

    panel.addEventListener("mouseenter", () => {
      if (dragState) return;
      setComicReadAutoPanelHidden(false);
    });
    panel.addEventListener("mouseleave", () => {
      if (dragState) return;
      if (getComicReadAutoPanelPosition().pinned) return;
      setComicReadAutoPanelHidden(true);
    });
  }

  function toggleComicReadAutoPanelPinned() {
    const currentPosition = getComicReadAutoPanelPosition();
    const panel = comicReadAutoPanel;
    const panelWidth = panel?.offsetWidth || 220;
    const currentLeft = getComicReadAutoPanelCurrentLeft(panel);
    const leftSpace = currentLeft;
    const rightSpace = Math.max(
      0,
      window.innerWidth - (currentLeft + panelWidth),
    );
    const nextPosition = writeComicReadAutoPanelPosition({
      ...currentPosition,
      side: leftSpace <= rightSpace ? "left" : "right",
      pinned: !currentPosition.pinned,
      hidden: currentPosition.pinned ? true : false,
    });
    applyComicReadAutoPanelPosition(comicReadAutoPanel, nextPosition);
    updateComicReadAutoPanel();
  }

  function getComicReadAutoPanelCollapsed() {
    return GM_getValue(COMICREAD_AUTO_COLLAPSED_KEY, false);
  }

  function setComicReadAutoPanelCollapsed(value) {
    GM_setValue(COMICREAD_AUTO_COLLAPSED_KEY, Boolean(value));
    updateComicReadAutoPanel();
  }

  function isComicReadLoadReady(img) {
    if (!isComicReadImage(img) || !img?.isConnected) return false;

    const { source, loadType } = getComicReadImageMeta(img);
    if (!source) return false;
    if (loadType === "wait" || loadType === "error") return false;
    return hasLoadedImageData(img);
  }

  function getComicReadAutoStats() {
    let pendingCount = 0;
    let retryCount = 0;
    let successCount = 0;
    let currentLabel = "无";
    let runningCount = 0;
    const comicReadImages = [];

    for (const img of getTrackedImages()) {
      if (!isComicReadImage(img)) continue;
      comicReadImages.push(img);

      if (isFailedSource(img)) {
        retryCount += 1;
        continue;
      }

      if (isTranslatingSource(img)) {
        runningCount += 1;
      }

      if (isTranslatedSource(img)) {
        successCount += 1;
        continue;
      }

      if (
        isComicReadTranslationCandidate(img) ||
        (isComicReadAutoTranslateActive(img) && !isTranslatedSource(img))
      ) {
        pendingCount += 1;
      }
    }

    if (comicReadCurrentImage?.isConnected) {
      currentLabel = parseComicReadPageLabel(comicReadCurrentImage);
      if (currentLabel === "无") {
        const currentIndex = comicReadImages.indexOf(comicReadCurrentImage);
        if (currentIndex >= 0) currentLabel = `第 ${currentIndex + 1} 页`;
      }
    }

    return {
      pendingCount,
      retryCount,
      successCount,
      currentLabel,
      runningCount,
    };
  }

  function getComicReadAutoStatusText(
    enabled,
    active,
    pendingCount,
    retryCount,
    runningCount,
  ) {
    if (!active) return { text: "等待 ComicRead", tone: "waiting" };
    if (!enabled) return { text: "已关闭", tone: "waiting" };
    if (runningCount > 0)
      return { text: `翻译中 x${runningCount}`, tone: "running" };
    if (autoTranslatePending) return { text: "待调度", tone: "waiting" };
    if (pendingCount > 0) return { text: "排队中", tone: "waiting" };
    if (retryCount > 0) return { text: "等待重试", tone: "waiting" };
    return { text: "已完成", tone: "done" };
  }

  function renderComicReadAutoPanel() {
    const panel = comicReadAutoPanel;
    if (!panel) return;

    const enabled = getComicReadAutoTranslateEnabled();
    const active = isComicReadModeActive();
    const collapsed = getComicReadAutoPanelCollapsed();
    const {
      pendingCount,
      retryCount,
      successCount,
      currentLabel,
      runningCount,
    } = getComicReadAutoStats();
    const status = getComicReadAutoStatusText(
      enabled,
      active,
      pendingCount,
      retryCount,
      runningCount,
    );

    panel.setAttribute("data-collapsed", collapsed ? "true" : "false");
    const panelPosition = getComicReadAutoPanelPosition();
    panel
      .querySelector('[data-role="toggle"]')
      ?.replaceChildren(document.createTextNode(collapsed ? "+" : "−"));
    panel
      .querySelector('[data-role="pin"]')
      ?.setAttribute("data-pinned", panelPosition.pinned ? "true" : "false");
    panel
      .querySelector('[data-role="pin"]')
      ?.setAttribute("title", panelPosition.pinned ? "取消固定" : "固定卡片");
    panel
      .querySelector('[data-role="pin"]')
      ?.replaceChildren(
        document.createTextNode(panelPosition.pinned ? "●" : "○"),
      );

    if (comicReadAutoStatusValue) {
      comicReadAutoStatusValue.textContent = status.text;
      comicReadAutoStatusValue.setAttribute("data-tone", status.tone);
    }
    if (comicReadAutoQueueValue)
      comicReadAutoQueueValue.textContent = String(pendingCount);
    if (comicReadAutoRetryValue)
      comicReadAutoRetryValue.textContent = String(retryCount);
    if (comicReadAutoSuccessValue)
      comicReadAutoSuccessValue.textContent = String(successCount);
    if (comicReadAutoCurrentValue)
      comicReadAutoCurrentValue.textContent = currentLabel;
    if (comicReadAutoSummaryValue) {
      comicReadAutoSummaryValue.innerHTML = `
        <span>状态 <strong>${status.text}</strong></span>
        <span>成功 <strong>${successCount}</strong></span>
      `;
    }
    applyComicReadAutoPanelPosition(panel);
  }

  function updateComicReadAutoPanel() {
    if (comicReadAutoPanelFrame) return;
    comicReadAutoPanelFrame = window.requestAnimationFrame(() => {
      comicReadAutoPanelFrame = null;
      renderComicReadAutoPanel();
    });
  }

  function isTranslatedSource(img) {
    return translatedSourceMap.get(img) === getSourceKey(img);
  }

  function isTranslatingSource(img) {
    return translatingSourceMap.get(img) === getSourceKey(img);
  }

  function isFailedSource(img) {
    return failedSourceMap.get(img) === getSourceKey(img);
  }

  function clearFailedSource(img, source = getSourceKey(img)) {
    const cleared =
      failedSourceMap.get(img) === source ||
      failedRetryCountMap.get(img)?.source === source;
    if (failedSourceMap.get(img) === source) failedSourceMap.delete(img);
    if (failedRetryCountMap.get(img)?.source === source) {
      failedRetryCountMap.delete(img);
    }
    if (cleared) {
      const info = getImageDebugInfo(img);
      logInfo("清除失败状态", {
        page: info.pageLabel,
        loadType: info.loadType,
        source: info.sourcePreview,
      });
    }
    updateComicReadAutoPanel();
  }

  function clearObsoleteImageState(img) {
    if (!isComicReadImage(img) || !img?.isConnected) return;

    const renderedSource = pickImageSource([
      img?.currentSrc,
      img?.src,
      img?.getAttribute?.("src"),
    ]);
    if (renderedSource && !renderedSource.startsWith("data:image/")) {
      img.removeAttribute(TRANSLATED_SOURCE_ATTR);
      img.removeAttribute(TRANSLATION_CACHE_ATTR);
    }

    const source = getSourceKey(img);
    if (!source) return;

    const failedSource = failedSourceMap.get(img);
    if (failedSource && failedSource !== source) {
      failedSourceMap.delete(img);
    }

    const retryInfo = failedRetryCountMap.get(img);
    if (retryInfo?.source && retryInfo.source !== source) {
      failedRetryCountMap.delete(img);
    }

    if (
      translatedSourceMap.get(img) &&
      translatedSourceMap.get(img) !== source
    ) {
      translatedSourceMap.delete(img);
    }

    if (
      translatingSourceMap.get(img) &&
      translatingSourceMap.get(img) !== source
    ) {
      translatingSourceMap.delete(img);
    }

    if (comicReadTriggeredSourceMap.get(img) !== source) {
      comicReadTriggeredSourceMap.delete(img);
    }
  }

  function getComicReadObservedSourceState(img) {
    return (
      comicReadObservedSourceMap.get(img) || {
        source: "",
        ready: false,
      }
    );
  }

  function syncComicReadObservedSourceState(img) {
    if (!isComicReadImage(img) || !img?.isConnected) return null;

    const nextState = {
      source: getComicReadRenderedSource(img) || "",
      ready: isComicReadLoadReady(img),
    };
    const prevState = getComicReadObservedSourceState(img);
    const sourceChanged =
      Boolean(nextState.source) && prevState.source !== nextState.source;
    const becameReady = !prevState.ready && nextState.ready;
    comicReadObservedSourceMap.set(img, nextState);
    return {
      prevState,
      nextState,
      changed: sourceChanged || becameReady,
      sourceChanged,
      becameReady,
    };
  }

  function markFailedSource(img, source, error = null) {
    failedSourceMap.set(img, source);
    const isRateLimited = Number(error?.status) === 429;
    const retryInfo = failedRetryCountMap.get(img);
    const retryCount = isRateLimited
      ? retryInfo?.source === source
        ? retryInfo.count
        : 0
      : retryInfo?.source === source
        ? retryInfo.count + 1
        : 1;
    failedRetryCountMap.set(img, { source, count: retryCount });
    const info = getImageDebugInfo(img);
    logWarn("图片翻译失败，标记为待重试", {
      page: info.pageLabel,
      loadType: info.loadType,
      retryCount,
      maxRetryCount: CONFIG.maxAutoRetryCount,
      isRateLimited,
      source: info.sourcePreview,
    });
    updateComicReadAutoPanel();

    if (!isRateLimited && retryCount >= CONFIG.maxAutoRetryCount) {
      logWarn("达到最大自动重试次数，停止继续重试", {
        page: info.pageLabel,
        retryCount,
        source: info.sourcePreview,
      });
      return;
    }

    const retryDelay = isRateLimited
      ? 15000
      : Math.min(1500 * 2 ** (Math.max(retryCount, 1) - 1), 15000);
    logInfo("安排自动重试", {
      page: info.pageLabel,
      retryCount,
      retryDelay,
      isRateLimited,
      source: info.sourcePreview,
    });
    window.setTimeout(() => {
      if (failedSourceMap.get(img) !== source) return;
      failedSourceMap.delete(img);
      comicReadTriggeredSourceMap.delete(img);
      logInfo("执行自动重试", {
        page: info.pageLabel,
        retryCount,
        source: info.sourcePreview,
      });
      updateComicReadAutoPanel();
      requestComicReadAutoTranslate(0);
    }, retryDelay);
  }

  function markTranslatedSource(img, source) {
    img?.setAttribute?.(TRANSLATED_SOURCE_ATTR, source);
    translatedSourceMap.set(img, source);
    const info = getImageDebugInfo(img);
    logInfo("图片翻译结果已应用", {
      page: info.pageLabel,
      loadType: info.loadType,
      source: info.sourcePreview,
    });
    clearFailedSource(img, source);
  }

  function retryComicReadFailedTranslations() {
    const retryTargets = [];

    for (const img of getTrackedImages()) {
      if (!isComicReadImage(img) || !img?.isConnected) continue;

      const previousSource = failedSourceMap.get(img);
      const currentSource = getSourceKey(img);
      const retryInfo = failedRetryCountMap.get(img);

      if (!previousSource && !retryInfo) continue;
      if (!currentSource) continue;
      if (!isComicReadLoadReady(img)) continue;
      if (isComicReadAutoTranslateActive(img)) continue;

      failedSourceMap.delete(img);
      failedRetryCountMap.delete(img);
      comicReadTriggeredSourceMap.delete(img);
      retryTargets.push({
        img,
        previousSource,
        currentSource,
      });
    }

    if (retryTargets.length === 0) {
      logInfo("手动重试未找到可重试图片", {
        trackedImages: getTrackedImages().length,
      });
      updateComicReadAutoButton();
      updateComicReadAutoPanel();
      return;
    }

    logInfo("手动重试失败图片", {
      count: retryTargets.length,
      changedSourceCount: retryTargets.filter(
        (item) =>
          item.previousSource && item.previousSource !== item.currentSource,
      ).length,
      targets: retryTargets.map((item) => {
        const info = getImageDebugInfo(item.img);
        return {
          page: info.pageLabel,
          previousSource: item.previousSource
            ? `${item.previousSource.slice(0, 120)}${item.previousSource.length > 120 ? "..." : ""}`
            : "",
          currentSource: info.sourcePreview,
        };
      }),
    });

    wakeComicReadAutoTranslate("manual-retry");
    updateComicReadAutoButton();
    updateComicReadAutoPanel();
    requestComicReadAutoTranslate(0);
  }

  function hasRetryableComicReadFailures() {
    for (const img of getTrackedImages()) {
      if (!isComicReadImage(img) || !img?.isConnected) continue;
      if (!failedSourceMap.get(img) && !failedRetryCountMap.get(img)) continue;
      if (!getSourceKey(img)) continue;
      if (!isComicReadLoadReady(img)) continue;
      if (isComicReadAutoTranslateActive(img)) continue;
      return true;
    }
    return false;
  }

  function hasComicReadTranslationWork() {
    if (autoTranslateInFlight.size > 0) return true;

    for (const img of getTrackedImages()) {
      if (!isComicReadImage(img) || !img?.isConnected) continue;
      if (isComicReadTranslationCandidate(img)) return true;
      if (isFailedSource(img) && isComicReadLoadReady(img)) return true;
      if (isRestoringTranslationFromCache(img)) return true;
      if (isTranslatingSource(img)) return true;
    }

    return false;
  }

  function wakeComicReadAutoTranslate(reason = "") {
    if (autoTranslateDormant) {
      logInfo("唤醒 ComicRead 自动翻译调度", { reason });
    }
    autoTranslateDormant = false;
  }

  function isComicReadAutoTranslateActive(img) {
    return (
      autoTranslateInFlight.has(img) ||
      isTranslatingSource(img) ||
      isRestoringTranslationFromCache(img)
    );
  }

  function isComicReadTranslationCandidate(img) {
    return (
      isComicReadImage(img) &&
      isComicReadLoadReady(img) &&
      !isTranslatedSource(img) &&
      !isComicReadAutoTranslateActive(img) &&
      !isFailedSource(img)
    );
  }

  function getNextComicReadCandidate() {
    let bestVisibleImg = null;
    let bestVisibleRect = null;
    let firstBackgroundImg = null;
    let firstLoadedImg = null;

    for (const img of getTrackedImages()) {
      if (!isComicReadTranslationCandidate(img)) continue;
      if (!firstLoadedImg) firstLoadedImg = img;

      const rect = img.getBoundingClientRect();
      if (!isNearViewportImage(img)) {
        if (!firstBackgroundImg) firstBackgroundImg = img;
        continue;
      }

      if (
        !bestVisibleRect ||
        rect.top < bestVisibleRect.top ||
        (rect.top === bestVisibleRect.top && rect.left < bestVisibleRect.left)
      ) {
        bestVisibleImg = img;
        bestVisibleRect = rect;
      }
    }

    return bestVisibleImg || firstBackgroundImg || firstLoadedImg;
  }

  function isIntersectingComicReadCandidate(img) {
    return (
      isComicReadModeActive() &&
      getComicReadAutoTranslateEnabled() &&
      isQualifiedImage(img) &&
      isNearViewportImage(img) &&
      !isTranslatedSource(img) &&
      !isTranslatingSource(img) &&
      !isFailedSource(img)
    );
  }

  function ensureComicReadAutoButton() {
    if (comicReadAutoButton?.isConnected) return comicReadAutoButton;
    const layer = ensureComicReadAutoLayer();
    if (!layer) return null;

    if (!comicReadAutoPanel?.isConnected) {
      const panel = document.createElement("div");
      panel.className = "it-comicread-auto-panel comicread-ignore";
      panel.innerHTML = `
        <div class="it-comicread-auto-header">
          <div class="it-comicread-auto-header-main">
            <div class="it-comicread-auto-title">ComicRead 自动译</div>
            <div class="it-comicread-auto-hint">左键开关，右键设置</div>
          </div>
          <div class="it-comicread-auto-header-actions">
            <button type="button" class="it-comicread-auto-pin" data-role="pin" title="固定卡片">○</button>
            <button type="button" class="it-comicread-auto-toggle" data-role="toggle">−</button>
          </div>
        </div>
        <div class="it-comicread-auto-summary" data-role="summary"></div>
        <div class="it-comicread-auto-grid">
          <div class="it-comicread-auto-label">状态</div>
          <div class="it-comicread-auto-value" data-role="status">等待 ComicRead</div>
          <div class="it-comicread-auto-label">未完成</div>
          <div class="it-comicread-auto-value" data-role="queue">0</div>
          <div class="it-comicread-auto-label">待重试</div>
          <div class="it-comicread-auto-value" data-role="retry">0</div>
          <div class="it-comicread-auto-label">已成功</div>
          <div class="it-comicread-auto-value" data-role="success">0</div>
          <div class="it-comicread-auto-label">处理中</div>
          <div class="it-comicread-auto-value" data-role="current">无</div>
        </div>
        <div class="it-comicread-auto-actions">
          <button type="button" class="it-comicread-auto-btn comicread-ignore" data-role="retry-btn">重试失败</button>
        </div>
      `;
      comicReadAutoPanel = panel;
      comicReadRetryButton = panel.querySelector('[data-role="retry-btn"]');
      comicReadAutoSummaryValue = panel.querySelector('[data-role="summary"]');
      comicReadAutoStatusValue = panel.querySelector('[data-role="status"]');
      comicReadAutoQueueValue = panel.querySelector('[data-role="queue"]');
      comicReadAutoRetryValue = panel.querySelector('[data-role="retry"]');
      comicReadAutoSuccessValue = panel.querySelector('[data-role="success"]');
      comicReadAutoCurrentValue = panel.querySelector('[data-role="current"]');
      panel
        .querySelector('[data-role="pin"]')
        ?.addEventListener("click", () => {
          toggleComicReadAutoPanelPinned();
        });
      panel
        .querySelector('[data-role="toggle"]')
        ?.addEventListener("click", () => {
          setComicReadAutoPanelCollapsed(!getComicReadAutoPanelCollapsed());
        });
      comicReadRetryButton?.addEventListener("click", () => {
        retryComicReadFailedTranslations();
      });
      attachComicReadAutoPanelInteractions(panel);
      applyComicReadAutoPanelPosition(panel);
      layer.appendChild(panel);
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "it-comicread-auto-btn comicread-ignore";
    btn.title = "点击切换 ComicRead 自动翻译，右键打开设置";
    btn.onclick = () => {
      const nextEnabled = !getComicReadAutoTranslateEnabled();
      setComicReadAutoTranslateEnabled(nextEnabled);
      wakeComicReadAutoTranslate("toggle-auto-translate");
      logInfo("切换 ComicRead 自动翻译", {
        enabled: nextEnabled,
        page: location.href,
      });
      updateComicReadAutoButton();
      syncComicReadAutoTranslate();
    };
    btn.oncontextmenu = (e) => {
      e.preventDefault();
      openSettings();
    };
    comicReadAutoPanel
      ?.querySelector(".it-comicread-auto-actions")
      ?.appendChild(btn);
    comicReadAutoButton = btn;
    updateComicReadAutoPanel();
    return btn;
  }

  function updateComicReadAutoButton() {
    const layer = ensureComicReadAutoLayer();
    const btn = ensureComicReadAutoButton();
    if (!layer || !btn) return;

    const enabled = getComicReadAutoTranslateEnabled();
    const active = isComicReadModeActive();
    layer.style.display = active ? "block" : "none";
    if (comicReadAutoPanel) {
      comicReadAutoPanel.style.display = active ? "flex" : "none";
      if (active) applyComicReadAutoPanelPosition(comicReadAutoPanel);
    }
    btn.style.display = active ? "flex" : "none";
    btn.textContent = enabled ? "自动译 ON" : "自动译 OFF";
    btn.setAttribute("data-enabled", enabled ? "true" : "false");
    if (comicReadRetryButton) {
      const canRetry = hasRetryableComicReadFailures();
      comicReadRetryButton.style.display = active ? "inline-flex" : "none";
      comicReadRetryButton.disabled = !canRetry;
      comicReadRetryButton.setAttribute(
        "data-enabled",
        canRetry ? "true" : "false",
      );
      comicReadRetryButton.title = canRetry
        ? "清除失败状态并按最新地址重新调度翻译"
        : "当前没有可重试的失败图片";
    }
    updateComicReadAutoPanel();
  }

  function syncComicReadAutoTranslate() {
    updateComicReadAutoButton();

    const shouldRun =
      getComicReadAutoTranslateEnabled() && isComicReadModeActive();
    logInfo("同步 ComicRead 自动翻译状态", {
      enabled: getComicReadAutoTranslateEnabled(),
      comicReadActive: isComicReadModeActive(),
      shouldRun,
      inFlight: autoTranslateInFlight.size,
      pending: autoTranslatePending,
    });
    if (shouldRun) {
      wakeComicReadAutoTranslate("sync");
      requestComicReadAutoTranslate();
    } else {
      autoTranslatePending = false;
      autoTranslateDormant = false;
      if (autoTranslateScheduleTimer) {
        window.clearTimeout(autoTranslateScheduleTimer);
        autoTranslateScheduleTimer = null;
      }
      updateComicReadAutoPanel();
    }
  }

  function requestComicReadAutoTranslate(delay = 120) {
    if (!getComicReadAutoTranslateEnabled() || !isComicReadModeActive()) return;
    if (autoTranslateDormant && !hasComicReadTranslationWork()) {
      logInfo("自动翻译处于静默态，跳过调度请求", { delay });
      return;
    }
    if (!hasComicReadTranslationWork()) {
      autoTranslatePending = false;
      autoTranslateDormant = true;
      updateComicReadAutoPanel();
      logInfo("没有待处理的自动翻译任务，进入静默态", {
        delay,
        inFlight: autoTranslateInFlight.size,
      });
      return;
    }

    autoTranslatePending = true;
    autoTranslateDormant = false;
    updateComicReadAutoPanel();
    if (autoTranslateScheduleTimer) {
      // logInfo("自动翻译调度已存在，跳过重复请求", { delay });
      return;
    }

    // logInfo("请求自动翻译调度", {
    //   delay,
    //   inFlight: autoTranslateInFlight.size,
    // });

    autoTranslateScheduleTimer = window.setTimeout(() => {
      autoTranslateScheduleTimer = null;
      if (!autoTranslatePending) return;
      autoTranslatePending = false;
      // logInfo("执行自动翻译调度", {
      //   inFlight: autoTranslateInFlight.size,
      // });
      updateComicReadAutoPanel();
      triggerComicReadAutoTranslate();
    }, delay);
  }

  function triggerComicReadAutoTranslate() {
    if (!getComicReadAutoTranslateEnabled() || !isComicReadModeActive()) return;
    if (!hasComicReadTranslationWork()) {
      autoTranslateDormant = true;
      logInfo("没有可翻译候选，保持静默态", {
        inFlight: autoTranslateInFlight.size,
      });
      updateComicReadAutoPanel();
      return;
    }

    let launched = 0;
    const availableSlots =
      CONFIG.autoTranslateConcurrency - autoTranslateInFlight.size;
    // logInfo("尝试触发自动翻译", {
    //   availableSlots,
    //   inFlight: autoTranslateInFlight.size,
    //   concurrency: CONFIG.autoTranslateConcurrency,
    // });
    if (availableSlots <= 0) {
      autoTranslatePending = true;
      // logInfo("没有空闲并发槽位，保留待调度状态", {
      //   inFlight: autoTranslateInFlight.size,
      // });
      updateComicReadAutoPanel();
      return;
    }

    for (let i = 0; i < availableSlots; i += 1) {
      const img = getNextComicReadCandidate();
      if (!img) {
        logWarn("候选图片不足，提前结束本轮自动翻译分发", {
          remainingSlots: availableSlots - i,
        });
        break;
      }

      const source = getSourceKey(img);
      if (!source) continue;
      const info = getImageDebugInfo(img);
      logInfo("启动自动翻译任务", {
        slot: i + 1,
        page: info.pageLabel,
        loadType: info.loadType,
        source: info.sourcePreview,
      });
      launched += 1;
      comicReadCurrentImage = img;
      autoTranslateInFlight.add(img);
      translatingSourceMap.set(img, source);
      updateComicReadAutoPanel();

      doTranslate(img, null, null, "auto", false, {
        silent: true,
        forceImageMode: true,
        onApplied(translatedImg) {
          markTranslatedSource(translatedImg, source);
        },
        onFinally(success, error, meta = {}) {
          autoTranslateInFlight.delete(img);
          if (comicReadCurrentImage === img) comicReadCurrentImage = null;
          if (translatingSourceMap.get(img) === source) {
            translatingSourceMap.delete(img);
          }
          const isRateLimited = Number(error?.status) === 429;
          const skipped = Boolean(meta?.skipped);
          // logInfo("自动翻译任务结束", {
          //   success,
          //   skipped,
          //   page: info.pageLabel,
          //   source: info.sourcePreview,
          //   isRateLimited,
          //   inFlight: autoTranslateInFlight.size,
          // });
          if (!success && !skipped) markFailedSource(img, source, error);
          updateComicReadAutoButton();
          updateComicReadAutoPanel();
          if (!isRateLimited || skipped) {
            requestComicReadAutoTranslate(0);
          }
        },
      });
    }

    if (launched === 0) {
      if (!hasComicReadTranslationWork()) autoTranslateDormant = true;
      logInfo("本轮没有启动新的自动翻译任务");
      updateComicReadAutoPanel();
    }
  }

  function handleComicReadImageStateChange(img, reason = "") {
    if (!img || !trackedImages.has(img) || !isComicReadImage(img)) return false;

    const stateChange = syncComicReadObservedSourceState(img);
    if (!stateChange?.changed) return false;

    if (stateChange.sourceChanged) clearObsoleteImageState(img);
    const source = getSourceKey(img);
    if (!source) return false;

    void restoreComicReadTranslationFromCacheIfNeeded(img);
    if (!stateChange.nextState.ready) return false;
    if (comicReadTriggeredSourceMap.get(img) === source) return false;

    comicReadTriggeredSourceMap.set(img, source);
    wakeComicReadAutoTranslate(reason || "comicread-image-change");
    updateComicReadAutoPanel();
    requestComicReadAutoTranslate(0);
    return true;
  }

  function pickTargetImage() {
    if (isQualifiedImage(lastRightClickedImage)) return lastRightClickedImage;

    return (
      getTrackedImages()
        .filter(isQualifiedImage)
        .sort((a, b) => {
          const rectA = a.getBoundingClientRect();
          const rectB = b.getBoundingClientRect();
          return rectB.width * rectB.height - rectA.width * rectA.height;
        })[0] || null
    );
  }

  function observeImage(img) {
    if (!img || trackedImages.has(img)) return;
    trackedImages.add(img);
    if (!trackedImageLoadHooks.has(img)) {
      trackedImageLoadHooks.add(img);
      img.addEventListener(
        "load",
        () => {
          if (!trackedImages.has(img)) return;
          if (!isComicReadImage(img)) {
            clearObsoleteImageState(img);
            void restoreTranslationFromCache(
              img,
              getTranslationCacheCandidate(img),
            );
            wakeComicReadAutoTranslate("image-load");
            updateComicReadAutoPanel();
            requestComicReadAutoTranslate(0);
            return;
          }
          enqueueComicReadImageStateChange(img, "image-load");
        },
        { passive: true },
      );
    }
    io.observe(img);
    if (isComicReadImage(img)) {
      enqueueComicReadImageStateChange(img, "observe-image");
      return;
    }
    void restoreTranslationFromCache(img, getTranslationCacheCandidate(img));
    requestComicReadAutoTranslate();
  }

  function scanRoot(root) {
    if (!root?.querySelectorAll) return;
    root.querySelectorAll("img").forEach(enqueueObserveImage);
  }

  function observeRoot(root) {
    if (!root || observedRoots.has(root)) return;
    observedRoots.add(root);
    scanRoot(root);

    const rootObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          if (node.tagName === "IMG") enqueueObserveImage(node);
          scanRoot(node);
          if (node.shadowRoot) observeRoot(node.shadowRoot);
        });
      });
    });

    rootObserver.observe(root, {
      childList: true,
      subtree: true,
    });
  }

  const nativeAttachShadow = Element.prototype.attachShadow;
  if (!nativeAttachShadow.__itPatched) {
    const patchedAttachShadow = function (init) {
      const shadowRoot = nativeAttachShadow.call(this, init);
      observeRoot(shadowRoot);
      return shadowRoot;
    };
    patchedAttachShadow.__itPatched = true;
    Element.prototype.attachShadow = patchedAttachShadow;
  }

  // 显示全局加载提示
  function showGlobalLoading(text = "正在翻译中，请稍候...") {
    if (globalLoadingEl) return;
    globalLoadingEl = document.createElement("div");
    globalLoadingEl.className = "it-global-loading comicread-ignore";
    globalLoadingEl.innerHTML = `<div class="it-loading-spinner"></div><div>${text}</div>`;
    document.body.appendChild(globalLoadingEl);
  }

  // 隐藏全局加载提示
  function hideGlobalLoading() {
    if (globalLoadingEl) {
      globalLoadingEl.remove();
      globalLoadingEl = null;
    }
  }

  async function blobToDataUrl(blob) {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function getImageDataUrl(img) {
    const src = getSourceKey(img);
    if (!src) throw new Error("图片地址为空");
    if (!isSupportedImageSource(src)) {
      throw new Error("图片地址不是受支持的图片源");
    }
    const info = getImageDebugInfo(img);
    // logInfo("开始读取图片数据", {
    //   page: info.pageLabel,
    //   loadType: info.loadType,
    //   source: info.sourcePreview,
    //   scheme: src.split(":")[0] || "unknown",
    // });
    if (src.startsWith("data:image/")) return src;
    if (src.startsWith("data:")) {
      throw new Error("检测到非图片 data URL");
    }

    if (src.startsWith("blob:")) {
      const response = await fetch(src);
      if (!response.ok) throw new Error("读取 blob 图片失败");
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) {
        throw new Error(`blob 资源不是图片类型: ${blob.type || "unknown"}`);
      }
      return blobToDataUrl(blob);
    }

    const response = await new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url: src,
        responseType: "blob",
        onload: resolve,
        onerror: reject,
      });
    });

    const blob = response.response;
    if (!(blob instanceof Blob)) {
      throw new Error("远程响应未返回图片 blob");
    }
    if (!blob.type.startsWith("image/")) {
      logWarn("远程图片响应类型异常", {
        page: info.pageLabel,
        source: info.sourcePreview,
        contentType: blob.type || "unknown",
        status: response.status,
      });
      throw new Error(`远程响应不是图片类型: ${blob.type || "unknown"}`);
    }

    return blobToDataUrl(blob);
  }

  // ================= [3. 强力 JSON 修复引擎] =================

  /**
   * 修复并解析 LLM 输出的 JSON
   * 使用多阶段修复策略
   */
  function normalizeTranslationPayload(data) {
    if (!data) return null;

    const getEmptyPlaceholderText = () => ({
      x: 1,
      y: 1,
      width: 0,
      height: 0,
      text: " ",
      size: "small",
    });

    const normalizeTextItem = (item) => {
      if (!item || typeof item !== "object") return null;

      const text = String(item.text ?? "").trim();
      if (!text) return null;

      return {
        x: Number(item.x) || 0,
        y: Number(item.y) || 0,
        width: Number(item.width) || 0,
        height: Number(item.height) || 0,
        text,
        size: String(item.size || "medium"),
      };
    };

    if (Array.isArray(data)) {
      const texts = data.map(normalizeTextItem).filter(Boolean);
      if (texts.length === 0) texts.push(getEmptyPlaceholderText());
      return { texts };
    }

    if (Array.isArray(data.texts)) {
      const texts = data.texts.map(normalizeTextItem).filter(Boolean);
      if (texts.length === 0) texts.push(getEmptyPlaceholderText());
      return { ...data, texts };
    }

    return null;
  }

  function repairAndParse(text) {
    logInfo("API 原始输出", text);
    try {
      const raw = JSON.parse(text);
      let content = raw.choices[0].message.content;
      logInfo("提取的 content", content);

      // 阶段1: 预处理 - 清理 markdown 代码块和常见问题
      content = content.replace(/```json\s*/gi, "").replace(/```\s*$/g, "");

      // 移除字段值中间插入的非法字符串
      content = content.replace(/,\s*"[^"]{10,}",?\s*\n/g, ",\n");
      content = content.replace(
        /("[\w\s]+"\s*:\s*"[^"]*")\s*,\s*"[^"]{10,}"\s*,/g,
        "$1,",
      );

      logInfo("预处理后的 JSON", content);

      // 阶段2: 尝试直接解析
      try {
        const data = JSON.parse(content);
        const normalizedData = normalizeTranslationPayload(data);
        if (normalizedData) {
          logInfo("直接解析成功", normalizedData);
          return normalizedData;
        }
      } catch (e) {
        logWarn("直接解析失败，尝试增强修复", e.message);
      }

      // 阶段3: 使用增强的修复引擎（作为后备）
      const result = enhancedJsonRepair(content);
      const normalizedResult = normalizeTranslationPayload(result);
      if (normalizedResult) {
        logInfo("增强修复成功", normalizedResult);
        return normalizedResult;
      }

      logError("所有 JSON 修复方法均失败");
      return null;
    } catch (e) {
      logError("解析彻底失败", e);
      return null;
    }
  }

  /**
   * 增强的 JSON 修复引擎
   * 参考 json-repair-js 实现，使用递归下降解析器
   */
  function enhancedJsonRepair(jsonStr) {
    const WHITESPACE = new Set([0x20, 0x09, 0x0a, 0x0d]); // space, tab, newline, return
    let index = 0;
    const contextStack = [];

    function skipWhitespace() {
      while (index < jsonStr.length) {
        const code = jsonStr.charCodeAt(index);
        if (!WHITESPACE.has(code)) break;
        index++;
      }
    }

    function peek() {
      return jsonStr[index];
    }

    // 查找 JSON 开始位置，跳过 markdown 代码块
    let foundJson = false;

    while (index < jsonStr.length) {
      const char = peek();

      // 处理 markdown 代码块
      if (char === "`") {
        if (jsonStr.slice(index, index + 3) === "```") {
          // 跳过整个 ``` 代码块标记
          index += 3;
          // 继续跳过直到换行
          while (index < jsonStr.length && jsonStr[index] !== "\n") {
            index++;
          }
          continue;
        }
        // 跳过单个反引号
        index++;
        continue;
      }

      // 查找 JSON 开始
      if (char === "{" || char === "[") {
        foundJson = true;
        break;
      }

      index++;
    }

    if (!foundJson) {
      logError("JSON 修复未找到有效的开始标记");
      return null;
    }

    function parseValue() {
      skipWhitespace();
      const char = peek();

      if (!char) return null;
      if (char === "{") return parseObject();
      if (char === "[") return parseArray();
      if (char === '"' || char === "'") return parseString();
      if (/[-0-9]/.test(char)) return parseNumber();
      if (/[a-zA-Z]/.test(char)) return parseUnquotedString();

      index++;
      return null;
    }

    function parseObject() {
      const obj = {};
      index++; // skip {

      while (index < jsonStr.length) {
        skipWhitespace();

        if (peek() === "}") {
          index++;
          break;
        }

        // 解析键
        contextStack.push("OBJECT_KEY");
        const key = parseString() || parseUnquotedString();
        contextStack.pop();

        if (!key) break;

        skipWhitespace();

        // 处理缺失的冒号
        if (peek() !== ":") {
          logWarn("JSON 修复自动补全缺失的冒号");
        } else {
          index++; // skip :
        }

        skipWhitespace();

        // 解析值
        contextStack.push("OBJECT_VALUE");
        const value = parseValue();
        contextStack.pop();

        if (key && value !== undefined) {
          obj[key] = value;
        }

        skipWhitespace();

        // 处理逗号
        if (peek() === ",") {
          index++;
        }
      }

      return obj;
    }

    function parseArray() {
      const arr = [];
      index++; // skip [
      contextStack.push("ARRAY");

      while (index < jsonStr.length) {
        skipWhitespace();

        if (peek() === "]") {
          index++;
          break;
        }

        const value = parseValue();
        if (value !== undefined) {
          arr.push(value);
        }

        skipWhitespace();

        // 处理逗号
        if (peek() === ",") {
          index++;
        }
      }

      contextStack.pop();
      return arr;
    }

    function parseString() {
      let char = peek();
      const isQuoted = char === '"' || char === "'";
      let stringAcc = "";

      // 跳过前导空白
      while (char && /\s/.test(char)) {
        index++;
        char = peek();
      }

      if (isQuoted) {
        const quote = char;
        index++; // skip opening quote

        while (index < jsonStr.length) {
          char = peek();

          if (char === quote) {
            index++; // skip closing quote
            break;
          }

          // 处理转义字符
          if (char === "\\" && index < jsonStr.length - 1) {
            const nextChar = jsonStr[index + 1];
            if (nextChar === quote) {
              stringAcc += quote;
              index += 2;
              continue;
            }
          }

          stringAcc += char;
          index++;
        }
      } else {
        // 对于无引号字符串，收集直到遇到分隔符
        while (index < jsonStr.length) {
          char = peek();

          if ([",", "}", "]", ":"].includes(char)) {
            break;
          } else if (/\s/.test(char)) {
            // 处理单词之间的空白
            if (stringAcc && index < jsonStr.length - 1) {
              const nextChar = jsonStr[index + 1];
              if (!/[,}\]:]/.test(nextChar)) {
                stringAcc += " ";
              }
            }
          } else {
            stringAcc += char;
          }

          index++;
        }
      }

      const trimmed = stringAcc.trim();

      // 为对象值和数组元素转换类型
      const currentContext = contextStack[contextStack.length - 1];
      if (
        !isQuoted &&
        (currentContext === "OBJECT_VALUE" || currentContext === "ARRAY")
      ) {
        return convertStringToType(trimmed);
      }

      return trimmed;
    }

    function parseNumber() {
      let numStr = "";

      while (index < jsonStr.length) {
        const char = peek();
        if (!/[-0-9.eE]/.test(char)) break;
        numStr += char;
        index++;
      }

      const num = Number(numStr);
      return isNaN(num) ? numStr : num;
    }

    function parseUnquotedString() {
      let str = "";

      while (index < jsonStr.length) {
        const char = peek();
        if ([",", "}", "]", ":"].includes(char) || /\s/.test(char)) break;
        str += char;
        index++;
      }

      // 转换类型
      return convertStringToType(str.trim());
    }

    function convertStringToType(str) {
      if (!str || str === "") return null;

      // 尝试数字
      const num = Number(str);
      if (!isNaN(num)) return num;

      // 尝试布尔值/null
      const lower = str.toLowerCase();
      if (lower === "true") return true;
      if (lower === "false") return false;
      if (lower === "null") return null;

      return str;
    }

    try {
      const result = parseValue();
      logInfo("JSON 修复成功", result);
      return result;
    } catch (e) {
      logError("JSON 修复失败", e);
      return null;
    }
  }

  function smartWrapText(ctx, text, maxWidth) {
    const lines = [];
    text.split("\n").forEach((para) => {
      if (!para) {
        lines.push("");
        return;
      }
      let curr = "";
      para.split("").forEach((char) => {
        if (ctx.measureText(curr + char).width > maxWidth) {
          lines.push(curr);
          curr = char;
        } else {
          curr += char;
        }
      });
      if (curr) lines.push(curr);
    });
    return lines;
  }

  function buildParallelRequestUrl(url) {
    const requestUrl = new URL(url, location.href);
    requestUrl.searchParams.set("_it_ts", String(Date.now()));
    requestUrl.searchParams.set(
      "_it_rnd",
      Math.random().toString(36).slice(2, 10),
    );
    return requestUrl.toString();
  }

  async function requestTranslationCompletion(requestBody, requestMeta = {}) {
    const requestUrl = `${CONFIG.apiBaseUrl}/chat/completions`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CONFIG.apiKey}`,
    };
    const body = JSON.stringify(requestBody);

    try {
      logInfo("尝试使用 fetch 发送翻译请求", {
        ...requestMeta,
        requestUrl,
      });
      const response = await fetch(requestUrl, {
        method: "POST",
        headers,
        body,
      });
      const responseText = await response.text();
      if (!response.ok) {
        const error = new Error(
          `fetch 请求失败: ${response.status} ${response.statusText}`,
        );
        error.status = response.status;
        error.responseText = responseText;
        throw error;
      }
      logInfo("fetch 翻译请求成功", {
        ...requestMeta,
        status: response.status,
      });
      return {
        responseText,
        transport: "fetch",
        status: response.status,
      };
    } catch (fetchError) {
      const fallbackUrl = buildParallelRequestUrl(requestUrl);
      logWarn("fetch 翻译请求失败，回退 GM_xmlhttpRequest", {
        ...requestMeta,
        requestUrl,
        fallbackUrl,
        error: fetchError,
      });
      const response = await new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "POST",
          url: fallbackUrl,
          headers,
          data: body,
          onload: resolve,
          onerror: reject,
        });
      });
      if (response.status >= 400) {
        const error = new Error(
          `GM_xmlhttpRequest 请求失败: ${response.status}`,
        );
        error.status = response.status;
        error.responseText = response.responseText;
        throw error;
      }
      logInfo("GM_xmlhttpRequest 翻译请求成功", {
        ...requestMeta,
        status: response.status,
        fallbackUrl,
      });
      return {
        responseText: response.responseText,
        transport: "gm_xhr",
        status: response.status,
      };
    }
  }

  // ================= [4. 翻译引擎] (追加 mode) =================

  async function doTranslate(
    img,
    btn,
    wrapper,
    mode = "auto",
    useGlobalLoading = false,
    options = {},
  ) {
    const {
      silent = false,
      forceImageMode = false,
      onApplied,
      onFinally,
    } = options;
    let success = false;
    let lastError = null;
    let skipped = false;
    const imageInfo = getImageDebugInfo(img);

    if (btn && btn.classList.contains("it-loading")) return;

    // 如果是自动模式且全局开启了文字翻译，则强制切换到文字翻译
    if (mode === "auto" && isAlwaysTextMode() && !forceImageMode) {
      mode = "text_only";
    }

    // logInfo("开始翻译图片", {
    //   mode,
    //   silent,
    //   forceImageMode,
    //   useGlobalLoading,
    //   page: imageInfo.pageLabel,
    //   loadType: imageInfo.loadType,
    //   source: imageInfo.sourcePreview,
    //   model: CONFIG.model,
    // });

    if (btn) {
      btn.classList.add("it-loading");
      btn.innerHTML = "❤";
    }

    // 显示全局 loading
    if (useGlobalLoading) {
      showGlobalLoading();
    }

    try {
      if (mode !== "text_only") {
        const matchedCache = getTranslationCacheCandidate(img, {
          allowWhileTranslating: true,
        });
        if (matchedCache) {
          if (!hasLoadedImageData(img) || !getSourceKey(img)) {
            skipped = true;
            if (useGlobalLoading) hideGlobalLoading();
            if (btn) {
              btn.classList.remove("it-loading");
              btn.innerHTML = "译";
            }
            // logInfo("命中缓存但暂不发起翻译请求，等待图片数据就绪", {
            //   page: imageInfo.pageLabel,
            //   source: imageInfo.sourcePreview,
            //   mode,
            // });
            return;
          }

          const restoredFromCache = await restoreTranslationFromCache(
            img,
            matchedCache,
          );
          if (restoredFromCache) {
            if (useGlobalLoading) hideGlobalLoading();
            if (btn) {
              btn.classList.remove("it-loading");
              btn.innerHTML = "译";
            }
            wrapper?.remove();
            logInfo("命中缓存，跳过翻译请求", {
              page: imageInfo.pageLabel,
              source: imageInfo.sourcePreview,
              mode,
            });
            success = true;
            return;
          }

          if (useGlobalLoading) hideGlobalLoading();
          logWarn("缓存恢复失败，回退到网络翻译请求", {
            page: imageInfo.pageLabel,
            source: imageInfo.sourcePreview,
            mode,
          });
          if (useGlobalLoading) {
            showGlobalLoading();
          }
        }
      }

      const blob = await getImageDataUrl(img);

      let requestBody = {
        model: CONFIG.model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: TRANSLATION_PROMPT },
              { type: "image_url", image_url: { url: blob } },
            ],
          },
        ],
        temperature: 0.1,
      };

      if (CONFIG.extraBody) {
        try {
          const extraParams = JSON.parse(CONFIG.extraBody);
          requestBody = { ...requestBody, ...extraParams };
        } catch (e) {
          logError("额外参数解析失败", e);
        }
      }

      logInfo("发送翻译请求", {
        mode,
        page: imageInfo.pageLabel,
        apiBaseUrl: CONFIG.apiBaseUrl,
        model: requestBody.model,
        hasExtraBody: Boolean(CONFIG.extraBody),
      });

      const res = await requestTranslationCompletion(requestBody, {
        mode,
        page: imageInfo.pageLabel,
        model: requestBody.model,
      });

      const data = repairAndParse(res.responseText);
      if (!data) throw new Error("JSON 解析及修复均失败");
      logInfo("翻译结果解析完成", {
        page: imageInfo.pageLabel,
        textCount: Array.isArray(data.texts) ? data.texts.length : 0,
        mode,
        transport: res.transport,
      });

      if (mode === "text_only") {
        if (useGlobalLoading) {
          hideGlobalLoading();
          showTextOnlyResult(data.texts.map((t) => t.text).join("\n\n"));
        } else {
          renderTextPopup(
            wrapper,
            data.texts.map((t) => t.text).join("\n\n"),
            btn,
          );
        }
        logInfo("以文字模式展示翻译结果", {
          page: imageInfo.pageLabel,
          textCount: data.texts.length,
        });
        success = true;
        return;
      }

      const dataUrl = await renderTranslatedImage(img, blob, data.texts);
      saveTranslationCacheEntry(img, imageInfo.source, data.texts);

      if (useGlobalLoading) {
        hideGlobalLoading();
        img.src = dataUrl;
        onApplied?.(img, dataUrl);
      } else if (!wrapper && !btn) {
        img.src = dataUrl;
        onApplied?.(img, dataUrl);
      } else {
        const testImg = new Image();
        testImg.onload = () => {
          img.src = dataUrl;
          onApplied?.(img, dataUrl);
          wrapper?.remove();
        };
        testImg.onerror = () =>
          renderTextPopup(
            wrapper,
            data.texts.map((t) => t.text).join("\n\n"),
            btn,
          );
        testImg.src = dataUrl;
      }
      logInfo("图片模式翻译结果已生成", {
        page: imageInfo.pageLabel,
        outputMimeType: CONFIG.outputMimeType,
        textCount: data.texts.length,
      });
      success = true;
    } catch (e) {
      lastError = e;
      logError("翻译图片失败", {
        mode,
        page: imageInfo.pageLabel,
        source: imageInfo.sourcePreview,
        error: e,
      });
      if (useGlobalLoading) {
        hideGlobalLoading();
        if (!silent) {
          alert("翻译失败：" + (e.message || "未知错误"));
        }
      } else if (btn) {
        btn.innerHTML = "✕";
        btn.classList.remove("it-loading");
        setTimeout(() => {
          btn.innerHTML = "译";
        }, 2000);
      }
    } finally {
      // logInfo("翻译流程结束", {
      //   success,
      //   skipped,
      //   mode,
      //   page: imageInfo.pageLabel,
      //   source: imageInfo.sourcePreview,
      // });
      onFinally?.(success, lastError, { skipped });
    }
  }

  function hideAllWrappers() {
    cleanupImageUiEntries();
    for (const entry of imageUiEntries) {
      entry.wrapper.style.display = "none";
      entry.menu.style.display = "none";
    }
  }

  function scheduleHideAllWrappers() {
    if (hideWrappersFrame) return;
    hideWrappersFrame = window.requestAnimationFrame(() => {
      hideWrappersFrame = null;
      hideAllWrappers();
    });
  }

  function handleComicReadVisibilityChange(img) {
    if (isComicReadImage(img)) {
      void restoreComicReadTranslationFromCacheIfNeeded(img);
    }
    if (!isIntersectingComicReadCandidate(img)) return;
    wakeComicReadAutoTranslate("visibility-change");
    requestComicReadAutoTranslate(0);
  }

  function restoreComicReadTranslationFromCacheIfNeeded(img) {
    if (!isComicReadImage(img) || !isNearViewportImage(img)) return false;
    return restoreTranslationFromCache(img, getTranslationCacheCandidate(img));
  }

  function drainBatchedQueue(queue, handleItem) {
    let handledCount = 0;

    for (const item of queue) {
      handleItem(item);
      handledCount += 1;
      if (handledCount >= MAX_BATCHED_IMAGE_OPERATIONS) break;
    }

    return queue.size > 0;
  }

  function flushObservedImages() {
    observeImageFrame = null;

    const hasPending = drainBatchedQueue(pendingObservedImages, (img) => {
      pendingObservedImages.delete(img);
      observeImage(img);
    });

    if (hasPending) {
      observeImageFrame = window.requestAnimationFrame(flushObservedImages);
      return;
    }

    updateComicReadAutoPanel();
  }

  function enqueueObserveImage(img) {
    if (!img || trackedImages.has(img)) return;
    pendingObservedImages.add(img);
    if (observeImageFrame) return;
    observeImageFrame = window.requestAnimationFrame(flushObservedImages);
  }

  function flushComicReadStateChanges() {
    comicReadStateChangeFrame = null;

    const hasPending = drainBatchedQueue(
      pendingComicReadStateChanges,
      ([img, reason]) => {
        pendingComicReadStateChanges.delete(img);
        handleComicReadImageStateChange(img, reason);
      },
    );

    if (hasPending) {
      comicReadStateChangeFrame = window.requestAnimationFrame(
        flushComicReadStateChanges,
      );
    }
  }

  function enqueueComicReadImageStateChange(img, reason = "") {
    if (!img?.isConnected || !isComicReadImage(img)) return;
    pendingComicReadStateChanges.set(img, reason);
    if (comicReadStateChangeFrame) return;
    comicReadStateChangeFrame = window.requestAnimationFrame(
      flushComicReadStateChanges,
    );
  }

  function attachComicReadAttributeObserver() {
    const nextComicReadNode = document.getElementById("comicRead");
    if (nextComicReadNode === comicReadNode) {
      mountComicReadAutoLayer();
      updateComicReadAutoButton();
      return;
    }

    comicReadAttributeObserver?.disconnect();
    comicReadImageObserver?.disconnect();
    comicReadNode = nextComicReadNode;
    if (!comicReadNode) {
      updateComicReadAutoButton();
      syncComicReadAutoTranslate();
      return;
    }

    comicReadAttributeObserver = new MutationObserver(() => {
      updateComicReadAutoButton();
      syncComicReadAutoTranslate();
    });
    comicReadAttributeObserver.observe(comicReadNode, {
      attributes: true,
      attributeFilter: ["show"],
    });

    comicReadImageObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.target instanceof HTMLImageElement
        ) {
          enqueueObserveImage(mutation.target);
          enqueueComicReadImageStateChange(
            mutation.target,
            "comicread-image-attribute-change",
          );
          return;
        }

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          if (node.tagName === "IMG") enqueueObserveImage(node);
          node.querySelectorAll?.("img").forEach(enqueueObserveImage);
        });
      });
    });
    comicReadImageObserver.observe(comicReadNode, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: IMAGE_SOURCE_ATTRIBUTES,
    });

    mountComicReadAutoLayer();

    updateComicReadAutoButton();
    syncComicReadAutoTranslate();
  }

  // 显示纯文字翻译结果
  function showTextOnlyResult(content) {
    const mask = document.createElement("div");
    mask.className = "it-set-mask comicread-ignore";
    mask.innerHTML = `<div class="it-set-box" style="width: 500px; max-height: 80vh; overflow: auto;"><h3>翻译结果<button class="it-set-close" onclick="this.closest('.it-set-mask').remove()">✕</button></h3><div style="white-space: pre-wrap; line-height: 1.8; font-size: 14px;">${content}</div></div>`;
    document.body.appendChild(mask);
    mask.onclick = (e) => {
      if (e.target === mask) mask.remove();
    };
  }

  function renderTextPopup(wrapper, content, btn) {
    btn.innerHTML = "文";
    btn.classList.remove("it-loading");
    if (!wrapper.querySelector(".it-popup")) {
      const popup = document.createElement("div");
      popup.className = "it-popup";

      const contentDiv = document.createElement("div");
      contentDiv.textContent = content;
      popup.appendChild(contentDiv);

      const closeBtn = document.createElement("button");
      closeBtn.className = "it-popup-close";
      closeBtn.innerHTML = "✕";
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        popup.remove();
      };
      popup.appendChild(closeBtn);

      popup.addEventListener("wheel", (e) => e.stopPropagation());
      wrapper.appendChild(popup);
    }
  }

  // ================= [5. 追加：设置与菜单逻辑] =================

  function openSettings() {
    logInfo("打开设置面板");
    const mask = document.createElement("div");
    mask.className = "it-set-mask comicread-ignore";
    const autoDefaultChecked = getComicReadAutoTranslateDefaultEnabled()
      ? "checked"
      : "";
    let modelProfiles = getModelProfiles();
    let selectedProfileId =
      (getActiveModelProfile() || modelProfiles[0])?.id || "";
    const buildProfileOptions = () =>
      modelProfiles
        .map(
          (profile) =>
            `<option value="${escapeHtml(profile.id)}" ${profile.id === selectedProfileId ? "selected" : ""}>${escapeHtml(profile.name)} · ${escapeHtml(profile.model)}</option>`,
        )
        .join("");
    const activeProfile =
      modelProfiles.find((profile) => profile.id === selectedProfileId) ||
      modelProfiles[0];
    mask.innerHTML = `<div class="it-set-box"><h3>图片翻译配置<button class="it-set-close" id="it-close">✕</button></h3><label>模型配置</label><select id="it-model-profile" style="width:100%;background:#2a2a2a;border:1px solid #444;color:#fff;padding:8px;border-radius:4px;box-sizing:border-box;outline:none;">${buildProfileOptions()}</select><label>配置名称</label><input type="text" id="it-model-name" value="${escapeHtml(activeProfile?.name || "")}"><label>API 接口</label><input type="text" id="it-url" value="${escapeHtml(activeProfile?.apiBaseUrl || CONFIG.apiBaseUrl)}"><label>模型 ID</label><input type="text" id="it-model-value" value="${escapeHtml(activeProfile?.model || CONFIG.model)}"><label>密钥</label><input type="password" id="it-key" value="${escapeHtml(activeProfile?.apiKey || CONFIG.apiKey)}"><label>额外参数 (JSON格式)</label><input type="text" id="it-extra" placeholder='{"enable_thinking": false}' value="${escapeHtml(activeProfile?.extraBody || CONFIG.extraBody)}"><div style="display:flex;gap:8px;margin-top:10px;"><button class="it-set-btn-sm" id="it-model-add" type="button" style="flex:1;">新增模型</button><button class="it-set-btn-sm" id="it-model-save" type="button" style="flex:1;">保存当前模型</button><button class="it-set-btn-sm" id="it-model-delete" type="button" style="flex:1;">删除当前</button></div><label style="display:flex;align-items:center;gap:8px;"><input type="checkbox" id="it-auto-default" ${autoDefaultChecked} style="width:auto;">新页面默认开启自动译</label><label>自动译并发数</label><input type="number" id="it-concurrency" min="1" step="1" value="${CONFIG.autoTranslateConcurrency}"><label>自动译最大重试次数</label><input type="number" id="it-retry" min="0" step="1" value="${CONFIG.maxAutoRetryCount}"><label>最多缓存多少本漫画</label><input type="number" id="it-cache-page-num" min="1" step="1" value="${CONFIG.maxTranslationPageNum}"><div style="font-size:12px;color:#bbb;line-height:1.5;margin-top:4px;">按漫画页面地址缓存，超出数量后自动删除最旧缓存。</div><div style="display:flex;gap:8px;margin-top:10px;"><button class="it-set-btn-sm" id="it-clear-cache" type="button" style="flex:1;">清理翻译缓存</button></div><button class="it-set-btn" id="it-save">保存并刷新</button></div>`;
    document.body.appendChild(mask);
    document.getElementById("it-close").onclick = () => mask.remove();

    const modelSelect = document.getElementById("it-model-profile");
    const modelNameInput = document.getElementById("it-model-name");
    const apiUrlInput = document.getElementById("it-url");
    const modelValueInput = document.getElementById("it-model-value");
    const apiKeyInput = document.getElementById("it-key");
    const extraBodyInput = document.getElementById("it-extra");

    const syncModelSelectOptions = () => {
      modelSelect.innerHTML = buildProfileOptions();
      modelSelect.value = selectedProfileId;
    };

    const getSelectedProfile = () =>
      modelProfiles.find((profile) => profile.id === selectedProfileId) ||
      modelProfiles[0];

    const collectProfileForm = (
      profileId = selectedProfileId || createModelProfileId(),
    ) => ({
      id: profileId,
      name: modelNameInput.value.trim() || modelValueInput.value.trim(),
      apiBaseUrl: apiUrlInput.value.trim(),
      apiKey: apiKeyInput.value.trim(),
      model: modelValueInput.value.trim(),
      extraBody: extraBodyInput.value.trim(),
    });

    const renderSelectedModel = () => {
      const selectedProfile = getSelectedProfile();
      if (!selectedProfile) return;
      modelNameInput.value = selectedProfile.name;
      apiUrlInput.value = selectedProfile.apiBaseUrl || "";
      modelValueInput.value = selectedProfile.model;
      apiKeyInput.value = selectedProfile.apiKey || "";
      extraBodyInput.value = selectedProfile.extraBody || "";
    };

    const validateProfile = (profile) => {
      if (!profile.model) {
        alert("模型 ID 不能为空");
        return false;
      }

      if (profile.extraBody) {
        try {
          JSON.parse(profile.extraBody);
        } catch (e) {
          alert("额外参数必须是有效的 JSON 格式！");
          return false;
        }
      }

      return true;
    };

    modelSelect.onchange = () => {
      selectedProfileId = modelSelect.value;
      logInfo("切换当前模型配置", { selectedProfileId });
      renderSelectedModel();
    };

    document.getElementById("it-model-add").onclick = () => {
      const nextProfile = collectProfileForm(createModelProfileId());
      if (!validateProfile(nextProfile)) return;

      modelProfiles = [...modelProfiles, nextProfile];
      saveModelProfiles(modelProfiles);
      selectedProfileId = nextProfile.id;
      setActiveModelProfile(nextProfile);
      logInfo("新增模型配置", {
        id: nextProfile.id,
        name: nextProfile.name,
        model: nextProfile.model,
        apiBaseUrl: nextProfile.apiBaseUrl,
      });
      syncModelSelectOptions();
      renderSelectedModel();
    };

    document.getElementById("it-model-save").onclick = () => {
      const nextProfile = collectProfileForm(
        modelSelect.value || createModelProfileId(),
      );
      if (!validateProfile(nextProfile)) return;

      modelProfiles = modelProfiles.map((profile) =>
        profile.id === nextProfile.id
          ? { ...profile, ...nextProfile }
          : profile,
      );
      if (!modelProfiles.some((profile) => profile.id === nextProfile.id)) {
        modelProfiles.push(nextProfile);
      }
      saveModelProfiles(modelProfiles);
      selectedProfileId = nextProfile.id;
      setActiveModelProfile(nextProfile);
      logInfo("保存模型配置", {
        id: nextProfile.id,
        name: nextProfile.name,
        model: nextProfile.model,
        apiBaseUrl: nextProfile.apiBaseUrl,
      });
      syncModelSelectOptions();
      renderSelectedModel();
    };

    document.getElementById("it-model-delete").onclick = () => {
      const nextProfiles = modelProfiles.filter(
        (profile) => profile.id !== selectedProfileId,
      );
      if (nextProfiles.length === 0) {
        alert("至少需要保留一个模型配置");
        return;
      }

      modelProfiles = nextProfiles;
      saveModelProfiles(nextProfiles);
      selectedProfileId = nextProfiles[0].id;
      setActiveModelProfile(nextProfiles[0]);
      logInfo("删除模型配置", {
        removedProfileId: modelSelect.value,
        nextActiveProfileId: selectedProfileId,
      });
      syncModelSelectOptions();
      renderSelectedModel();
    };

    document.getElementById("it-clear-cache").onclick = () => {
      if (
        !confirm(
          "确定要清理全部翻译缓存吗？此操作不会撤销当前页面已渲染的译图。",
        )
      ) {
        return;
      }
      clearTranslationCache();
      alert("翻译缓存已清理");
    };

    document.getElementById("it-save").onclick = () => {
      const autoDefaultEnabled =
        document.getElementById("it-auto-default").checked;
      const concurrencyValue = Math.max(
        1,
        Number.parseInt(document.getElementById("it-concurrency").value, 10) ||
          1,
      );
      const retryValue = Math.max(
        0,
        Number.parseInt(document.getElementById("it-retry").value, 10) || 0,
      );
      const cachePageNumValue = Math.max(
        1,
        Number.parseInt(
          document.getElementById("it-cache-page-num").value,
          10,
        ) || 1,
      );
      const selectedProfile = collectProfileForm(
        modelSelect.value || selectedProfileId,
      );
      if (selectedProfile.model) {
        if (!validateProfile(selectedProfile)) return;
        modelProfiles = modelProfiles.map((profile) =>
          profile.id === selectedProfile.id
            ? { ...profile, ...selectedProfile }
            : profile,
        );
        if (
          !modelProfiles.some((profile) => profile.id === selectedProfile.id)
        ) {
          modelProfiles.push(selectedProfile);
        }
        saveModelProfiles(modelProfiles);
        setActiveModelProfile(selectedProfile);
      }
      setComicReadAutoTranslateDefaultEnabled(autoDefaultEnabled);
      GM_setValue("autoTranslateConcurrency", concurrencyValue);
      GM_setValue("maxAutoRetryCount", retryValue);
      GM_setValue("maxTranslationPageNum", cachePageNumValue);
      trimTranslationCachePages(cachePageNumValue);
      logInfo("保存全局设置并刷新页面", {
        autoDefaultEnabled,
        concurrencyValue,
        retryValue,
        cachePageNumValue,
        activeProfileId: selectedProfile.id,
        model: selectedProfile.model,
      });
      location.reload();
    };
  }

  function setupImage(img) {
    if (!img || processedImages.has(img)) return;

    // 检查是否在当前网站隐藏图标
    if (isHideIcon()) return;
    if (!isQualifiedImage(img)) return;

    processedImages.add(img);
    const wrapper = document.createElement("div");
    wrapper.className = "it-wrapper comicread-ignore";
    const btn = document.createElement("div");
    btn.className = "it-btn";
    btn.innerHTML = "译";

    const menu = document.createElement("div");
    menu.className = "it-context-menu";

    const updateMenu = () => {
      const alwaysText = isAlwaysTextMode();
      const hideIcon = isHideIcon();
      menu.innerHTML = `
                <div class="it-menu-item" data-action="text">📝 文字翻译
                    <span class="it-menu-desc">直接点击翻译失败请使用</span>
                </div>
                <div class="it-menu-item" data-action="toggle_always">${alwaysText ? "🔓 解除一律文字翻译" : "🔒 一律文字翻译此网站"}</div>
                <div class="it-menu-item" data-action="toggle_hide_icon">${hideIcon ? "👁 在此网站显示图标" : "👁‍🗨 在此网站不显示图标"}
                    <span class="it-menu-desc">隐藏后可通过浏览器菜单启用</span>
                </div>
                <div class="it-menu-sep"></div>
                <div class="it-menu-item" data-action="config">⚙ 设置</div>
            `;
    };

    updateMenu();
    wrapper.append(btn, menu);
    document.body.appendChild(wrapper);
    const entry = { img, wrapper, menu, btn, hideTimer: null };
    imageUiEntries.add(entry);

    const show = () => {
      clearTimeout(entry.hideTimer);
      const r = img.getBoundingClientRect();
      wrapper.style.top = `${r.top + 5}px`;
      wrapper.style.left = `${r.right - 45}px`;
      wrapper.style.display = "flex";
    };
    const hide = () => {
      entry.hideTimer = setTimeout(() => {
        if (
          !btn.classList.contains("it-loading") &&
          menu.style.display !== "flex"
        )
          wrapper.style.display = "none";
      }, 300);
    };

    img.addEventListener("mouseenter", show);
    img.addEventListener("mouseleave", hide);
    wrapper.addEventListener("mouseenter", show);
    wrapper.addEventListener("mouseleave", hide);

    if (!isComicReadImage(img)) {
      void restoreTranslationFromCache(img, getTranslationCacheCandidate(img));
    }

    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      menu.style.display = "none";
      const info = getImageDebugInfo(img);
      logInfo("手动触发图片翻译", {
        mode: "auto",
        page: info.pageLabel,
        source: info.sourcePreview,
      });
      doTranslate(img, btn, wrapper, "auto");
    };
    btn.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      updateMenu();
      menu.style.display = menu.style.display === "flex" ? "none" : "flex";
    };

    // 图片右键菜单：记录最后右键点击的图片
    img.addEventListener("contextmenu", (e) => {
      lastRightClickedImage = img;
    });

    menu.onclick = (e) => {
      e.stopPropagation();
      const action = e.target.closest(".it-menu-item")?.dataset.action;
      const info = getImageDebugInfo(img);
      logInfo("图片菜单操作", {
        action,
        page: info.pageLabel,
        source: info.sourcePreview,
      });
      if (action === "text") doTranslate(img, btn, wrapper, "text_only");
      else if (action === "toggle_always") {
        GM_setValue("always_text_" + location.hostname, !isAlwaysTextMode());
        logInfo("切换当前站点一律文字翻译", {
          hostname: location.hostname,
          enabled: isAlwaysTextMode(),
        });
        updateMenu();
      } else if (action === "toggle_hide_icon") {
        GM_setValue("hide_icon_" + location.hostname, !isHideIcon());
        logInfo("切换当前站点图标显示", {
          hostname: location.hostname,
          hidden: isHideIcon(),
        });
        updateMenu();
        if (isHideIcon()) {
          wrapper.remove();
        }
      } else if (action === "config") openSettings();
      menu.style.display = "none";
    };

    if (
      !isComicReadImage(img) &&
      getComicReadAutoTranslateEnabled() &&
      isComicReadModeActive()
    ) {
      requestComicReadAutoTranslate();
    }
  }

  const io = new IntersectionObserver(
    (es) => {
      es.forEach((e) => {
        if (e.isIntersecting) {
          setupImage(e.target);
          handleComicReadVisibilityChange(e.target);
        }
      });
    },
    { rootMargin: "100px" },
  );
  observeRoot(document);
  attachComicReadAttributeObserver();
  updateComicReadAutoButton();
  syncComicReadAutoTranslate();

  const comicReadStateObserver = new MutationObserver((mutations) => {
    let shouldRefreshComicRead = false;

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.id === "comicRead" || node.querySelector?.("#comicRead")) {
          shouldRefreshComicRead = true;
          break;
        }
      }
      if (shouldRefreshComicRead) break;
    }

    if (shouldRefreshComicRead) attachComicReadAttributeObserver();
  });
  comicReadStateObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("scroll", scheduleHideAllWrappers, { passive: true });
  window.addEventListener("resize", scheduleHideAllWrappers, { passive: true });

  window.addEventListener("DOMContentLoaded", () => {
    attachComicReadAttributeObserver();
  });

  // ================= [6. 浏览器右键菜单注册] =================

  // 翻译图片（自动模式）
  GM_registerMenuCommand("📷 翻译图片", () => {
    const targetImg = pickTargetImage();
    const info = getImageDebugInfo(targetImg);
    logInfo("浏览器菜单触发图片翻译", {
      mode: "auto",
      hasTarget: Boolean(targetImg),
      page: info.pageLabel,
      source: info.sourcePreview,
    });

    if (targetImg) {
      doTranslate(targetImg, null, null, "auto", true);
    }
  });

  // 翻译图片（文字模式）
  GM_registerMenuCommand("📝 翻译图片（文字模式）", () => {
    const targetImg = pickTargetImage();
    const info = getImageDebugInfo(targetImg);
    logInfo("浏览器菜单触发图片翻译", {
      mode: "text_only",
      hasTarget: Boolean(targetImg),
      page: info.pageLabel,
      source: info.sourcePreview,
    });

    if (targetImg) {
      doTranslate(targetImg, null, null, "text_only", true);
    }
  });

  // 切换图标显示/隐藏
  GM_registerMenuCommand("👁‍🗨 切换图标显示/隐藏", () => {
    const hideIcon = isHideIcon();
    GM_setValue("hide_icon_" + location.hostname, !hideIcon);
    logInfo("浏览器菜单切换图标显示", {
      hostname: location.hostname,
      hidden: !hideIcon,
    });
    if (hideIcon) {
      alert("已启用图标显示，刷新页面后生效");
    } else {
      alert("已隐藏图标，刷新页面后生效。\n您可以通过浏览器菜单重新启用图标。");
    }
  });

  // 打开设置面板
  GM_registerMenuCommand("⚙ 打开设置面板", () => {
    openSettings();
  });
})();
