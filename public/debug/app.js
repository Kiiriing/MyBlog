/* =========================================================
   PERF LAB · 页面性能测试工具
   采集：FPS / 帧耗时 / 长任务 / CLS / 内存 / 事件循环延迟
       资源计时 / 导航时序 / 硬件信息
   压测：CPU 单核 / 渲染主线程 / 内存分配 / 网络请求
   ========================================================= */
(function () {
  'use strict';

  /* ---------------- 基础工具 ---------------- */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const pad = (n) => String(n).padStart(2, '0');
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const fmt = (v, digits) => {
    if (v == null || Number.isNaN(v)) return '—';
    return Number(v).toFixed(digits == null ? 1 : digits);
  };
  const clock = (ts) => {
    const d = new Date(ts || Date.now());
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };
  const escapeHtml = (str) =>
    String(str == null ? '—' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[c]));
  const bytes = (n) => {
    if (!n) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let v = n;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i += 1;
    }
    return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
  };

  const setText = (sel, text) => {
    const el = $(sel);
    if (el) el.textContent = text;
  };

  /* ---------------- 状态 ---------------- */

  const MAX_SAMPLES = 120; // 500ms/次 → 60 秒窗口

  const state = {
    running: false,
    startedAt: Date.now(),
    hz: 60,
    hzLocked: false,
    hzSamples: [],
    totalFrames: 0,
    jankFrames: 0,
    droppedFrames: 0,
    frameTimes: [],
    samples: [],
    longTaskCount: 0,
    tbt: 0,
    cls: 0,
    loopLag: 0,
    loopLagMax: 0,
    domNodes: 0,
    resources: [],
    env: {},
    stress: {},
  };

  const charts = {};
  let liveChart = null;
  let histChart = null;
  let memChart = null;
  let resChart = null;
  let pieChart = null;
  let navChart = null;
  let gaugeChart = null;
  let resourceTop = [];
  let pieUsesBytes = true;
  let histTotal = 1;
  let stressRunning = false;

  // 诊断目标：默认为当前页面，可切换为 iframe 中载入的博客页面
  const target = {
    win: window,
    doc: document,
    isFrame: false,
    crossOrigin: false,
    url: location.href,
  };
  let targetObservers = [];

  const targetMemory = () => {
    try {
      const perf = target.win ? target.win.performance : null;
      return perf ? perf.memory : null;
    } catch (err) {
      return null;
    }
  };

  const heapLimitMB = () => {
    const m = targetMemory();
    return m ? m.jsHeapSizeLimit / 1048576 : null;
  };
  const heapUsedMB = () => {
    const m = targetMemory();
    return m ? m.usedJSHeapSize / 1048576 : null;
  };
  const domNodes = () => {
    try {
      return target.doc ? target.doc.getElementsByTagName('*').length : null;
    } catch (err) {
      return null;
    }
  };

  /* ---------------- ECharts 通用配置 ---------------- */

  const COLORS = {
    accent: '#c8ff4d',
    cyan: '#4fd8ff',
    violet: '#a78bfa',
    warn: '#ffb454',
    bad: '#ff5d5d',
    muted: '#8a8f98',
  };

  const AXIS_LABEL = {
    color: COLORS.muted,
    fontSize: 10,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  };

  const TOOLTIP = {
    backgroundColor: 'rgba(10,12,16,.95)',
    borderColor: 'rgba(255,255,255,.12)',
    borderWidth: 1,
    textStyle: { color: '#e8eaed', fontSize: 11 },
    axisPointer: { lineStyle: { color: 'rgba(255,255,255,.16)' } },
  };

  const SPLIT_LINE = { lineStyle: { color: 'rgba(255,255,255,.05)' } };

  /* ---------------- 环境探测 ---------------- */

  function detectGPU() {
    const result = { renderer: '不可获取', vendor: '—', version: '—' };
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return result;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      result.renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      result.vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
      result.version = gl.getParameter(gl.VERSION);
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    } catch (err) {
      /* WebGL 不可用 */
    }
    return result;
  }

  function detectEngine() {
    const ua = navigator.userAgent;
    if (/Edg\//.test(ua)) return 'Edge · Chromium';
    if (/OPR\//.test(ua)) return 'Opera · Chromium';
    if (/Firefox\//.test(ua)) return 'Firefox · Gecko';
    if (/Chrome\//.test(ua)) return 'Chrome · Blink';
    if (/Safari\//.test(ua)) return 'Safari · WebKit';
    return '未知内核';
  }

  async function initEnv() {
    const gpu = detectGPU();
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;

    state.env = {
      userAgent: navigator.userAgent,
      platform: navigator.platform || (navigator.userAgentData && navigator.userAgentData.platform) || '未知',
      cores: navigator.hardwareConcurrency || null,
      deviceMemory: navigator.deviceMemory || null,
      gpu: gpu.renderer,
      gpuVendor: gpu.vendor,
      webglVersion: gpu.version,
      screen: `${screen.width}×${screen.height}`,
      viewport: `${window.innerWidth}×${window.innerHeight}`,
      dpr: window.devicePixelRatio || 1,
      hz: state.hz,
      heapLimitMB: heapLimitMB(),
      connection: conn
        ? {
            effectiveType: conn.effectiveType || 'unknown',
            downlink: conn.downlink || null,
            rtt: conn.rtt == null ? null : conn.rtt,
            saveData: !!conn.saveData,
          }
        : null,
      storageQuota: null,
      storageUsage: null,
      protocol: location.protocol,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      engine: detectEngine(),
    };

    renderEnvCards();

    setText('#modeBadge', location.protocol === 'file:' ? 'FILE 模式 · 资源计时受限' : 'HTTP 模式 · 完整计时');

    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        state.env.storageQuota = est.quota || null;
        state.env.storageUsage = est.usage || null;
        renderEnvCards();
      } catch (err) {
        /* 忽略 */
      }
    }
  }

  function renderEnvCards() {
    const e = state.env;
    const conn = e.connection;
    const cards = [
      {
        k: 'CPU 逻辑核心',
        v: e.cores ? `${e.cores} 线程` : '不可获取',
        s: 'navigator.hardwareConcurrency',
      },
      {
        k: '设备内存',
        v: e.deviceMemory ? `${e.deviceMemory} GB` : '不可获取',
        s: 'navigator.deviceMemory',
      },
      {
        k: 'GPU 渲染器',
        v: e.gpu,
        s: e.gpuVendor,
        wide: true,
        small: true,
        title: e.gpu,
      },
      {
        k: '屏幕 / 视口',
        v: e.screen,
        s: `视口 ${e.viewport} · DPR ${e.dpr}`,
      },
      {
        k: '刷新率',
        v: `${state.hz} Hz`,
        s: state.hzLocked ? 'requestAnimationFrame 估算' : '正在估算…',
      },
      {
        k: '网络',
        v: conn ? `${conn.effectiveType} · ${conn.downlink == null ? '—' : conn.downlink + ' Mbps'}` : '不可获取',
        s: conn ? `RTT ${conn.rtt == null ? '—' : conn.rtt}ms · ${conn.saveData ? '省流开启' : '标准模式'}` : 'Network Information API',
      },
      {
        k: 'JS 堆上限',
        v: e.heapLimitMB ? `${fmt(e.heapLimitMB, 0)} MB` : '不可获取',
        s: 'performance.memory.jsHeapSizeLimit',
      },
      {
        k: '存储配额',
        v: e.storageQuota ? bytes(e.storageQuota) : '检测中…',
        s: e.storageUsage != null ? `已用 ${bytes(e.storageUsage)}` : 'navigator.storage.estimate',
      },
      {
        k: '浏览器内核',
        v: e.engine,
        s: e.platform,
      },
      {
        k: '时区 / 语言',
        v: `${e.timezone}`,
        s: e.language,
      },
      {
        k: '页面协议',
        v: e.protocol === 'file:' ? 'file:// 本地文件' : location.host || 'http(s)',
        s: '采集环境',
      },
      {
        k: 'User Agent',
        v: e.userAgent,
        s: '浏览器标识',
        wide: true,
        small: true,
        title: e.userAgent,
      },
    ];

    const grid = $('#envGrid');
    if (!grid) return;
    grid.innerHTML = cards
      .map(
        (c) => `
        <div class="env-card${c.wide ? ' wide' : ''}"${c.title ? ` title="${escapeHtml(c.title)}"` : ''}>
          <div class="env-k">${escapeHtml(c.k)}</div>
          <div class="env-v${c.small ? ' small' : ''}">${escapeHtml(c.v)}</div>
          <div class="env-s">${escapeHtml(c.s)}</div>
        </div>`
      )
      .join('');
  }

  /* ---------------- 图表初始化 ---------------- */

  function initCharts() {
    if (!window.echarts) return;
    const echarts = window.echarts;

    /* 实时 FPS / 帧耗时 */
    liveChart = echarts.init($('#chartLive'), null, { renderer: 'canvas' });
    liveChart.setOption({
      animation: false,
      grid: { left: 46, right: 46, top: 32, bottom: 24 },
      tooltip: { ...TOOLTIP, trigger: 'axis' },
      legend: {
        top: 0,
        right: 4,
        itemWidth: 10,
        itemHeight: 8,
        itemGap: 14,
        icon: 'roundRect',
        textStyle: { color: COLORS.muted, fontSize: 10 },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: [],
        axisLine: { lineStyle: { color: 'rgba(255,255,255,.1)' } },
        axisTick: { show: false },
        axisLabel: { ...AXIS_LABEL, interval: 23 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'FPS',
          min: 0,
          max: 72,
          nameTextStyle: { color: COLORS.muted, fontSize: 10 },
          axisLabel: AXIS_LABEL,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: SPLIT_LINE,
        },
        {
          type: 'value',
          name: 'ms',
          min: 0,
          nameTextStyle: { color: COLORS.muted, fontSize: 10 },
          axisLabel: AXIS_LABEL,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'FPS',
          type: 'line',
          smooth: 0.25,
          showSymbol: false,
          data: [],
          lineStyle: { width: 2, color: COLORS.accent },
          itemStyle: { color: COLORS.accent },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(200,255,77,.24)' },
              { offset: 1, color: 'rgba(200,255,77,0)' },
            ]),
          },
        },
        {
          name: '帧耗时',
          type: 'line',
          yAxisIndex: 1,
          smooth: 0.25,
          showSymbol: false,
          data: [],
          lineStyle: { width: 1.5, color: COLORS.cyan },
          itemStyle: { color: COLORS.cyan },
        },
      ],
    });

    /* 帧耗时分布 */
    histChart = echarts.init($('#chartHist'), null, { renderer: 'canvas' });
    histChart.setOption({
      animationDuration: 240,
      grid: { left: 38, right: 12, top: 24, bottom: 26 },
      tooltip: {
        ...TOOLTIP,
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(255,255,255,.04)' } },
        formatter: (params) => {
          const p = params[0];
          const pct = histTotal ? ((p.value / histTotal) * 100).toFixed(1) : '0.0';
          return `${p.name} ms<br/><b>${p.value}</b> 帧 · ${pct}%`;
        },
      },
      xAxis: {
        type: 'category',
        data: ['0-8', '8-16', '16-24', '24-33', '33-50', '50-100', '>100'],
        axisLine: { lineStyle: { color: 'rgba(255,255,255,.1)' } },
        axisTick: { show: false },
        axisLabel: { ...AXIS_LABEL, fontSize: 9 },
      },
      yAxis: {
        type: 'value',
        axisLabel: AXIS_LABEL,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: SPLIT_LINE,
      },
      series: [
        {
          type: 'bar',
          data: [0, 0, 0, 0, 0, 0, 0],
          barWidth: '54%',
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: (p) =>
              ['#4fd8ff', '#4fd8ff', '#c8ff4d', '#ffd166', '#ffb454', '#ff8a5c', '#ff5d5d'][p.dataIndex] ||
              COLORS.cyan,
          },
          label: { show: false },
        },
      ],
    });

    /* 内存 / 延迟 */
    memChart = echarts.init($('#chartMem'), null, { renderer: 'canvas' });
    memChart.setOption({
      animation: false,
      grid: { left: 46, right: 46, top: 32, bottom: 24 },
      tooltip: { ...TOOLTIP, trigger: 'axis' },
      legend: {
        top: 0,
        right: 4,
        itemWidth: 10,
        itemHeight: 8,
        itemGap: 14,
        icon: 'roundRect',
        textStyle: { color: COLORS.muted, fontSize: 10 },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: [],
        axisLine: { lineStyle: { color: 'rgba(255,255,255,.1)' } },
        axisTick: { show: false },
        axisLabel: { ...AXIS_LABEL, interval: 23 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'MB',
          min: 0,
          nameTextStyle: { color: COLORS.muted, fontSize: 10 },
          axisLabel: AXIS_LABEL,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: SPLIT_LINE,
        },
        {
          type: 'value',
          name: 'ms',
          min: 0,
          nameTextStyle: { color: COLORS.muted, fontSize: 10 },
          axisLabel: AXIS_LABEL,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'JS 堆内存',
          type: 'line',
          smooth: 0.25,
          showSymbol: false,
          data: [],
          lineStyle: { width: 2, color: COLORS.violet },
          itemStyle: { color: COLORS.violet },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(167,139,250,.22)' },
              { offset: 1, color: 'rgba(167,139,250,0)' },
            ]),
          },
        },
        {
          name: '事件循环延迟',
          type: 'line',
          yAxisIndex: 1,
          smooth: 0.25,
          showSymbol: false,
          data: [],
          lineStyle: { width: 1.5, color: COLORS.warn },
          itemStyle: { color: COLORS.warn },
        },
      ],
    });

    /* 资源耗时 Top */
    resChart = echarts.init($('#chartRes'), null, { renderer: 'canvas' });
    resChart.setOption({
      animationDuration: 380,
      grid: { left: 8, right: 62, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        ...TOOLTIP,
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(255,255,255,.04)' } },
        formatter: (params) => {
          const p = params[0];
          const r = resourceTop[p.dataIndex] || {};
          return `${escapeHtml(p.name)}<br/>耗时 <b>${p.value} ms</b>${
            r.size ? `<br/>体积 ${bytes(r.size)}` : ''
          }${r.type ? `<br/>类型 ${escapeHtml(r.type)}` : ''}`;
        },
      },
      xAxis: {
        type: 'value',
        axisLabel: { ...AXIS_LABEL, formatter: '{value}ms' },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: SPLIT_LINE,
      },
      yAxis: {
        type: 'category',
        data: [],
        inverse: true,
        axisLabel: { color: '#c3c8d1', fontSize: 10, width: 148, overflow: 'truncate' },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: [],
          barWidth: 10,
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: 'rgba(79,216,255,.3)' },
              { offset: 1, color: COLORS.cyan },
            ]),
          },
          label: {
            show: true,
            position: 'right',
            color: '#9aa0aa',
            fontSize: 9,
            formatter: (p) => `${p.value} ms`,
          },
        },
      ],
    });

    /* 资源构成饼图 */
    pieChart = echarts.init($('#chartPie'), null, { renderer: 'canvas' });
    pieChart.setOption({
      animationDuration: 380,
      color: ['#c8ff4d', '#4fd8ff', '#a78bfa', '#ffb454', '#ff5d5d', '#7c8494'],
      tooltip: {
        ...TOOLTIP,
        trigger: 'item',
        formatter: (p) =>
          `${p.marker} ${escapeHtml(p.name)}<br/><b>${pieUsesBytes ? bytes(p.value) : p.value + ' 个'}</b> · ${p.percent}%`,
      },
      legend: {
        bottom: 0,
        left: 'center',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 12,
        textStyle: { color: COLORS.muted, fontSize: 10 },
      },
      series: [
        {
          type: 'pie',
          radius: ['46%', '68%'],
          center: ['50%', '44%'],
          padAngle: 2,
          itemStyle: { borderRadius: 4, borderColor: '#0a0b0e', borderWidth: 2 },
          label: { show: false },
          emphasis: { scale: true, scaleSize: 4 },
          data: [],
        },
      ],
    });

    /* 导航时序 */
    navChart = echarts.init($('#chartNav'), null, { renderer: 'canvas' });
    navChart.setOption({
      animationDuration: 480,
      grid: { left: 8, right: 72, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        ...TOOLTIP,
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(255,255,255,.04)' } },
        formatter: (params) => `${params[0].name}<br/><b>${params[0].value} ms</b>`,
      },
      xAxis: {
        type: 'value',
        axisLabel: { ...AXIS_LABEL, formatter: '{value}ms' },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: SPLIT_LINE,
      },
      yAxis: {
        type: 'category',
        data: [],
        inverse: true,
        axisLabel: { color: '#c3c8d1', fontSize: 10 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: [],
          barWidth: 12,
          itemStyle: {
            borderRadius: [0, 5, 5, 0],
            color: (p) => (p.dataIndex >= 5 ? COLORS.warn : COLORS.cyan),
          },
          label: {
            show: true,
            position: 'right',
            color: '#9aa0aa',
            fontSize: 9,
            formatter: '{c} ms',
          },
        },
      ],
    });

    /* 综合评分 */
    gaugeChart = echarts.init($('#chartGauge'), null, { renderer: 'canvas' });
    gaugeChart.setOption({
      animationDuration: 600,
      series: [
        {
          type: 'gauge',
          startAngle: 215,
          endAngle: -35,
          min: 0,
          max: 100,
          radius: '92%',
          center: ['50%', '58%'],
          progress: { show: true, width: 9, roundCap: true, itemStyle: { color: COLORS.accent } },
          axisLine: { lineStyle: { width: 9, color: [[1, 'rgba(255,255,255,.07)']] } },
          pointer: { show: false },
          anchor: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          detail: {
            valueAnimation: true,
            fontSize: 40,
            fontWeight: 600,
            color: '#f4f6f8',
            offsetCenter: [0, '-2%'],
            fontFamily: 'ui-monospace, Menlo, monospace',
          },
          title: {
            show: true,
            offsetCenter: [0, '34%'],
            color: COLORS.muted,
            fontSize: 10,
          },
          data: [{ value: 0, name: 'SCORE' }],
        },
      ],
    });

    charts.live = liveChart;
    charts.hist = histChart;
    charts.mem = memChart;
    charts.res = resChart;
    charts.pie = pieChart;
    charts.nav = navChart;
    charts.gauge = gaugeChart;
  }

  /* ---------------- 帧率采集 ---------------- */

  let rafId = 0;
  let lastFrameTs = 0;
  let winStart = 0;
  let winFrames = 0;
  let winFrameMs = 0;

  function frameLoop(ts) {
    rafId = requestAnimationFrame(frameLoop);

    if (!lastFrameTs) {
      lastFrameTs = ts;
      winStart = ts;
      return;
    }

    const dt = ts - lastFrameTs;
    lastFrameTs = ts;

    // 切后台 / 挂起会产生巨大间隔，不计入统计
    if (dt <= 0 || dt > 2000) {
      winStart = ts;
      winFrames = 0;
      winFrameMs = 0;
      return;
    }

    if (!state.hzLocked) {
      state.hzSamples.push(dt);
      if (state.hzSamples.length >= 90) lockRefreshRate();
    }

    if (!state.running) {
      winStart = ts;
      winFrames = 0;
      winFrameMs = 0;
      return;
    }

    state.totalFrames += 1;
    state.frameTimes.push(dt);
    if (state.frameTimes.length > 6000) state.frameTimes.splice(0, 2000);

    const budget = 1000 / state.hz;
    if (dt > 50) state.jankFrames += 1;
    if (dt > budget * 1.5) {
      state.droppedFrames += Math.max(1, Math.round(dt / budget) - 1);
    }

    winFrames += 1;
    winFrameMs += dt;

    if (ts - winStart >= 500) {
      const elapsed = ts - winStart;
      state.samples.push({
        t: Date.now(),
        fps: winFrames / (elapsed / 1000),
        frameMs: winFrameMs / winFrames,
        heap: heapUsedMB(),
        lag: state.loopLag,
      });
      if (state.samples.length > MAX_SAMPLES) state.samples.shift();
      winStart = ts;
      winFrames = 0;
      winFrameMs = 0;
      renderLive();
    }
  }

  function lockRefreshRate() {
    const sorted = state.hzSamples.slice().sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const raw = 1000 / median;
    const common = [60, 75, 90, 120, 144, 165, 180, 240, 360];
    const near = common.find((v) => Math.abs(v - raw) / v < 0.08);
    state.hz = near || Math.max(30, Math.round(raw));
    state.hzLocked = true;
    state.env.hz = state.hz;

    setText('#hzChip', `刷新率 ${state.hz} Hz`);
    renderEnvCards();
    if (liveChart) {
      liveChart.setOption({ yAxis: [{ max: Math.ceil(state.hz * 1.2) }] });
    }
  }

  function startLoopLagWatch() {
    let anchor = performance.now();
    setInterval(() => {
      const t = performance.now();
      const lag = Math.max(0, t - anchor - 100);
      anchor = t;
      if (document.hidden) return;
      state.loopLag = lag;
      state.loopLagMax = Math.max(state.loopLagMax, lag);
    }, 100);
  }

  /* ---------------- 面板渲染 ---------------- */

  function setTile(key, value, note) {
    const v = $(`[data-tile="${key}"]`);
    const n = $(`[data-note="${key}"]`);
    if (v) v.textContent = value;
    if (n && note != null) n.textContent = note;
  }

  function renderTiles() {
    const last = state.samples[state.samples.length - 1];
    const fpsList = state.samples.map((s) => s.fps);
    const avgFps = mean(fpsList);
    const minFps = fpsList.length ? Math.min.apply(null, fpsList) : 0;
    const jankRate = state.totalFrames ? (state.jankFrames / state.totalFrames) * 100 : 0;
    const budget = 1000 / state.hz;
    const heap = last && last.heap != null ? last.heap : heapUsedMB();
    const limit = heapLimitMB();

    setTile('fps', last ? fmt(last.fps, 0) : '—', `平均 ${fmt(avgFps, 0)} · 最低 ${fmt(minFps, 0)}`);
    setTile('frame', last ? `${fmt(last.frameMs, 1)} ms` : '—', `预算 ${fmt(budget, 1)} ms`);
    setTile('jank', `${fmt(jankRate, 2)}%`, `${state.jankFrames} / ${state.totalFrames} 帧卡顿`);
    setTile('long', `${state.longTaskCount}`, `TBT ${fmt(state.tbt, 0)} ms`);
    setTile('cls', fmt(state.cls, 3), state.cls > 0.1 ? '需要优化' : '布局稳定');
    setTile('lag', `${fmt(state.loopLag, 1)} ms`, `峰值 ${fmt(state.loopLagMax, 0)} ms`);
    setTile('heap', heap == null ? '不可用' : `${fmt(heap, 0)} MB`, limit ? `上限 ${fmt(limit, 0)} MB` : 'performance.memory 不可用');
    const nodes = domNodes();
    setTile('dom', nodes == null ? '跨域' : `${nodes}`, '节点数 · 文档规模');
  }

  function renderLive() {
    if (!liveChart) {
      renderTiles();
      return;
    }
    const xs = state.samples.map((s) => clock(s.t));
    liveChart.setOption({
      xAxis: { data: xs },
      series: [
        { data: state.samples.map((s) => +s.fps.toFixed(1)) },
        { data: state.samples.map((s) => +s.frameMs.toFixed(2)) },
      ],
    });
    if (memChart) {
      memChart.setOption({
        xAxis: { data: xs },
        series: [
          { data: state.samples.map((s) => (s.heap == null ? null : +s.heap.toFixed(1))) },
          { data: state.samples.map((s) => +s.lag.toFixed(1)) },
        ],
      });
    }
    renderTiles();
    updateClock();
  }

  function renderHistogram() {
    if (!histChart) return;
    const edges = [0, 8, 16, 24, 33, 50, 100, Infinity];
    const counts = new Array(7).fill(0);
    for (let i = 0; i < state.frameTimes.length; i += 1) {
      const dt = state.frameTimes[i];
      for (let b = 0; b < 7; b += 1) {
        if (dt >= edges[b] && dt < edges[b + 1]) {
          counts[b] += 1;
          break;
        }
      }
    }
    histTotal = state.frameTimes.length || 1;
    histChart.setOption({ series: [{ data: counts }] });
  }

  function computeScore() {
    if (!state.samples.length) return 0;
    const fpsList = state.samples.map((s) => s.fps);
    const avgFps = mean(fpsList);
    const elapsed = Math.max(1, (Date.now() - state.startedAt) / 1000);
    const fpsRatio = clamp(avgFps / state.hz, 0, 1);
    const jankRatio = state.totalFrames ? state.jankFrames / state.totalFrames : 0;
    const tbtPerSec = state.tbt / elapsed;

    const score =
      fpsRatio * 52 +
      (1 - clamp(jankRatio * 12, 0, 1)) * 20 +
      (1 - clamp(tbtPerSec / 180, 0, 1)) * 14 +
      (1 - clamp(state.cls / 0.25, 0, 1)) * 14;

    return Math.round(clamp(score, 0, 100));
  }

  function renderGauge() {
    if (!gaugeChart) return;
    const score = computeScore();
    const hasData = state.samples.length > 0;
    const color = score >= 85 ? COLORS.accent : score >= 65 ? COLORS.warn : COLORS.bad;
    const label = !hasData ? '等待数据' : score >= 85 ? '流畅' : score >= 65 ? '一般' : '压力较高';
    gaugeChart.setOption({
      series: [
        {
          progress: { itemStyle: { color } },
          data: [{ value: score, name: label }],
        },
      ],
    });
  }

  function updateClock() {
    if (!state.running) return;
    const sec = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));
    setText('#timeChip', `已采集 ${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`);
  }

  function updateBadge() {
    const el = $('#statusBadge');
    if (!el) return;
    el.classList.toggle('live', state.running);
    el.classList.toggle('paused', !state.running);
    el.textContent = state.running ? '采集中' : '已停止';
    if (!state.running) setText('#timeChip', '采集已停止');
  }

  /* ---------------- 原生性能观察器 ---------------- */

  function disconnectObservers() {
    targetObservers.forEach((po) => {
      try {
        po.disconnect();
      } catch (err) {
        /* 忽略 */
      }
    });
    targetObservers = [];
  }

  function observeTarget() {
    disconnectObservers();
    const W = target.win;
    if (!W || !('PerformanceObserver' in W)) return;

    try {
      const po = new W.PerformanceObserver((list) => {
        if (!state.running) return;
        for (const entry of list.getEntries()) {
          state.longTaskCount += 1;
          state.tbt += Math.max(0, entry.duration - 50);
        }
        renderTiles();
      });
      po.observe({ entryTypes: ['longtask'] });
      targetObservers.push(po);
    } catch (err) {
      /* 不支持 longtask */
    }

    try {
      const po = new W.PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) state.cls += entry.value;
        }
        renderTiles();
      });
      po.observe({ type: 'layout-shift', buffered: true });
      targetObservers.push(po);
    } catch (err) {
      /* 不支持 layout-shift */
    }

    try {
      let timer = 0;
      const po = new W.PerformanceObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => loadResources(false), 900);
      });
      po.observe({ type: 'resource', buffered: false });
      targetObservers.push(po);
    } catch (err) {
      /* 不支持 resource */
    }
  }

  /* ---------------- 资源加载 ---------------- */

  function shortName(url) {
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/').filter(Boolean);
      return parts.length ? parts[parts.length - 1] : u.hostname;
    } catch (err) {
      return String(url).slice(0, 48);
    }
  }

  function classifyResource(entry) {
    const path = String(entry.name).split('?')[0].split('#')[0].toLowerCase();
    const initiator = String(entry.initiatorType || '').toLowerCase();
    if (/\.(woff2?|ttf|otf|eot)$/.test(path)) return '字体';
    if (/\.(png|jpe?g|gif|webp|avif|svg|ico)$/.test(path)) return '图片';
    if (/\.css$/.test(path)) return '样式';
    if (/\.(m?js|cjs)$/.test(path)) return '脚本';
    if (/\.(mp4|webm|mp3|wav|ogg)$/.test(path)) return '媒体';
    if (initiator === 'fetch' || initiator === 'xmlhttprequest') return '请求';
    if (initiator === 'img' || initiator === 'image') return '图片';
    if (initiator === 'script') return '脚本';
    if (initiator === 'link' || initiator === 'css') return '样式';
    return '其他';
  }

  function loadResources(showToast) {
    if (!target.win) {
      state.resources = [];
      renderResourceCharts();
      setText('#resMeta', '跨域页面无法读取资源计时');
      if (showToast) toast('跨域页面无法读取资源数据');
      return;
    }

    const perf = target.win.performance;
    const entries = perf.getEntriesByType('resource') || [];
    state.resources = entries.map((e) => ({
      name: shortName(e.name),
      url: e.name,
      type: classifyResource(e),
      duration: +Number(e.duration || 0).toFixed(1),
      size: e.transferSize || e.encodedBodySize || 0,
      start: +Number(e.startTime || 0).toFixed(1),
    }));

    renderResourceCharts();

    if (state.resources.length) {
      const total = state.resources.reduce((sum, r) => sum + r.duration, 0);
      setText('#resMeta', `${state.resources.length} 项资源 · 累计耗时 ${total.toFixed(0)} ms`);
    } else {
      setText('#resMeta', '暂无资源计时数据');
    }

    if (showToast) toast('资源数据已刷新');
  }

  function renderResourceCharts() {
    const empty = !state.resources.length;
    const emptyNote = $('#resEmpty');
    if (emptyNote) emptyNote.hidden = !empty;

    if (!resChart || !pieChart) return;

    resourceTop = state.resources.slice().sort((a, b) => b.duration - a.duration).slice(0, 12);
    resChart.setOption({
      yAxis: { data: resourceTop.map((r) => r.name) },
      series: [{ data: resourceTop.map((r) => r.duration) }],
    });

    const byType = {};
    let totalSize = 0;
    state.resources.forEach((r) => {
      if (!byType[r.type]) byType[r.type] = { size: 0, count: 0 };
      byType[r.type].size += r.size;
      byType[r.type].count += 1;
      totalSize += r.size;
    });
    pieUsesBytes = totalSize > 0;

    const pieData = Object.keys(byType)
      .map((name) => ({
        name,
        value: pieUsesBytes ? byType[name].size : byType[name].count,
      }))
      .sort((a, b) => b.value - a.value);

    pieChart.setOption({
      series: [{ data: pieData }],
    });
  }

  /* ---------------- 导航时序 ---------------- */

  function getNavPhases() {
    if (!target.win) return null;
    const nav = target.win.performance.getEntriesByType('navigation')[0];
    if (!nav) return null;
    return {
      nav,
      phases: [
        ['重定向', nav.redirectEnd - nav.redirectStart],
        ['DNS 查询', nav.domainLookupEnd - nav.domainLookupStart],
        ['TCP 连接', nav.connectEnd - nav.connectStart],
        ['TTFB', nav.responseStart - nav.requestStart],
        ['响应下载', nav.responseEnd - nav.responseStart],
        ['DOM 解析', nav.domInteractive - nav.responseEnd],
        ['DOMContentLoaded', nav.domContentLoadedEventEnd - nav.domInteractive],
        ['Load 事件', nav.loadEventEnd - nav.domContentLoadedEventStart],
      ].map(([k, v]) => [k, +Math.max(0, v || 0).toFixed(1)]),
    };
  }

  function initNav() {
    if (!target.win) {
      if (navChart) navChart.setOption({ yAxis: { data: [] }, series: [{ data: [] }] }, false);
      setText('#navSummary', '跨域页面无法读取导航时序');
      return;
    }
    const data = getNavPhases();
    if (!data) {
      setText('#navSummary', '当前浏览器不支持 Navigation Timing');
      return;
    }
    const { nav, phases } = data;
    const total = Math.max(0, nav.loadEventEnd - nav.startTime);

    if (!total) {
      setText('#navSummary', 'file:// 模式下 Navigation Timing 数据不完整');
    } else {
      setText(
        '#navSummary',
        `总加载 ${fmt(total, 0)} ms · TTFB ${fmt(phases[3][1], 0)} ms · DCL ${fmt(
          Math.max(0, nav.domContentLoadedEventEnd - nav.startTime),
          0
        )} ms`
      );
    }

    if (navChart) {
      navChart.setOption({
        yAxis: { data: phases.map((p) => p[0]) },
        series: [{ data: phases.map((p) => p[1]) }],
      });
    }
  }

  /* ---------------- 压力测试 ---------------- */

  function cpuBenchmark(durationMs) {
    const t0 = performance.now();
    let ops = 0;
    let x = 12345.6789;
    while (performance.now() - t0 < durationMs) {
      for (let i = 0; i < 50000; i += 1) {
        x = Math.sin(x) * 1.0000001 + Math.sqrt(Math.abs(x) + i) * 0.000001;
      }
      ops += 50000;
    }
    const elapsed = performance.now() - t0;
    return { ops, ms: elapsed, opsPerSec: ops / (elapsed / 1000), checksum: x };
  }

  async function runRenderStress(count, durationMs) {
    let hostDoc;
    try {
      hostDoc = target.doc || document;
      void hostDoc.body;
    } catch (err) {
      hostDoc = document;
    }

    const layer = document.createElement('div');
    layer.style.cssText = 'position:fixed;inset:0;overflow:hidden;pointer-events:none;z-index:2147483647;';
    (hostDoc.body || hostDoc.documentElement).appendChild(layer);

    const view = target.win || window;
    const width = view.innerWidth;
    const height = view.innerHeight;
    const fragment = document.createDocumentFragment();
    const nodes = [];

    for (let i = 0; i < count; i += 1) {
      const el = document.createElement('div');
      const size = 3 + Math.random() * 9;
      el.style.cssText = `position:absolute;top:0;left:0;border-radius:50%;opacity:.65;will-change:transform;width:${size}px;height:${size}px;background:hsl(${Math.round(
        (i * 360) / count
      )} 92% 60%);`;
      fragment.appendChild(el);
      nodes.push({
        el,
        x: Math.random() * width,
        y: Math.random() * height,
        ax: 20 + Math.random() * 70,
        ay: 20 + Math.random() * 70,
        phase: Math.random() * Math.PI * 2,
      });
    }
    layer.appendChild(fragment);

    const t0 = performance.now();
    let last = t0;
    let frames = 0;
    let worst = 0;

    await new Promise((resolve) => {
      const tick = (t) => {
        const dt = t - last;
        last = t;
        if (dt > 0 && dt < 500) {
          frames += 1;
          worst = Math.max(worst, dt);
        }
        const k = t * 0.0012;
        for (let i = 0; i < nodes.length; i += 1) {
          const n = nodes[i];
          const cx = n.x + Math.sin(k * 1.7 + n.phase) * n.ax;
          const cy = n.y + Math.cos(k * 1.3 + n.phase) * n.ay;
          const x = ((cx % width) + width) % width;
          const y = ((cy % height) + height) % height;
          n.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
        }
        if (t - t0 < durationMs) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });

    const elapsed = performance.now() - t0;
    layer.remove();

    return {
      count,
      durationMs,
      frames,
      avgFps: frames / (elapsed / 1000),
      minFps: worst > 0 ? 1000 / worst : 0,
      worstFrame: worst,
    };
  }

  async function runMemoryStress(targetMB) {
    const mem = targetMemory();
    const before = mem ? mem.usedJSHeapSize / 1048576 : null;
    const limit = mem ? mem.jsHeapSizeLimit / 1048576 : 4096;
    const capTarget = Math.min(targetMB, Math.max(64, Math.floor(limit * 0.35)));
    const chunkMB = 8;
    const chunks = [];
    let allocated = 0;

    const t0 = performance.now();
    while (allocated + chunkMB <= capTarget) {
      const arr = new Float64Array(chunkMB * 131072); // 8 MiB
      for (let i = 0; i < arr.length; i += 256) arr[i] = i;
      chunks.push(arr);
      allocated += chunkMB;
      await sleep(0);
      if (performance.now() - t0 > 12000) break;
    }
    const allocMs = performance.now() - t0;

    let checksum = 0;
    const t1 = performance.now();
    for (let c = 0; c < chunks.length; c += 1) {
      const arr = chunks[c];
      for (let i = 0; i < arr.length; i += 256) checksum += arr[i];
    }
    const readMs = performance.now() - t1;
    const after = mem ? mem.usedJSHeapSize / 1048576 : null;

    const result = {
      allocatedMB: allocated,
      targetMB,
      allocMs: +allocMs.toFixed(1),
      readMs: +readMs.toFixed(1),
      writeThroughputMBps: +(allocated / (allocMs / 1000)).toFixed(1),
      readThroughputMBps: +(allocated / (readMs / 1000)).toFixed(1),
      heapBeforeMB: before == null ? null : +before.toFixed(1),
      heapAfterMB: after == null ? null : +after.toFixed(1),
      checksum,
    };

    chunks.length = 0;
    return result;
  }

  async function runNetworkStress(count) {
    if (location.protocol === 'file:') {
      throw new Error('file:// 模式无法发起网络请求，请通过 http 访问本页面');
    }
    const target = new URL('vendor/echarts.min.js', location.href).href;
    const times = [];
    let totalBytes = 0;

    for (let i = 0; i < count; i += 1) {
      const url = `${target}?bench=${i}-${Math.random().toString(36).slice(2)}`;
      const t0 = performance.now();
      const res = await fetch(url, { cache: 'no-store' });
      const buf = await res.arrayBuffer();
      times.push(performance.now() - t0);
      totalBytes += buf.byteLength;
    }

    const totalMs = times.reduce((a, b) => a + b, 0);
    return {
      count,
      target: shortName(target),
      avgMs: +(totalMs / count).toFixed(1),
      minMs: +Math.min.apply(null, times).toFixed(1),
      maxMs: +Math.max.apply(null, times).toFixed(1),
      totalMB: +(totalBytes / 1048576).toFixed(2),
      throughputMBps: +(totalBytes / 1048576 / (totalMs / 1000)).toFixed(2),
    };
  }

  function renderStressResult(type, rows, note) {
    const el = $(`#res-${type}`);
    if (!el) return;
    el.innerHTML =
      rows.map((row) => `<div class="res-row"><span>${escapeHtml(row[0])}</span><b>${escapeHtml(row[1])}</b></div>`).join('') +
      (note ? `<div class="res-note">${escapeHtml(note)}</div>` : '');
  }

  async function runStress(type, btn) {
    if (stressRunning) {
      toast('已有压测任务在运行');
      return;
    }
    stressRunning = true;
    const buttons = $$('[data-run]');
    buttons.forEach((b) => {
      b.disabled = true;
    });
    btn.textContent = '运行中…';
    const resEl = $(`#res-${type}`);
    if (resEl) resEl.innerHTML = '<div class="res-row"><span>状态</span><b>运行中</b></div>';

    try {
      if (type === 'cpu') {
        await sleep(80);
        const r = cpuBenchmark(1500);
        state.stress.cpu = {
          opsPerSec: Math.round(r.opsPerSec),
          ops: r.ops,
          durationMs: +r.ms.toFixed(0),
        };
        renderStressResult(
          'cpu',
          [
            ['吞吐量', `${(r.opsPerSec / 10000).toFixed(1)} 万 ops/s`],
            ['总运算', `${(r.ops / 10000).toFixed(1)} 万次`],
            ['采样时长', `${r.ms.toFixed(0)} ms`],
          ],
          '单核浮点循环，可对比不同设备或不同负载下的主线程算力。'
        );
      } else if (type === 'render') {
        const r = await runRenderStress(400, 3000);
        state.stress.render = {
          elements: r.count,
          durationMs: r.durationMs,
          avgFps: +r.avgFps.toFixed(1),
          minFps: +r.minFps.toFixed(1),
          worstFrameMs: +r.worstFrame.toFixed(1),
        };
        renderStressResult(
          'render',
          [
            ['平均 FPS', fmt(r.avgFps, 0)],
            ['最低 FPS', fmt(r.minFps, 0)],
            ['最差帧', `${fmt(r.worstFrame, 0)} ms`],
            ['动画帧数', `${r.frames}`],
          ],
          '每帧对 400 个元素写入 transform，帧率下降幅度反映主线程与合成压力。'
        );
      } else if (type === 'memory') {
        const r = await runMemoryStress(256);
        state.stress.memory = r;
        renderStressResult(
          'memory',
          [
            ['分配量', `${r.allocatedMB} MB`],
            ['分配耗时', `${fmt(r.allocMs, 0)} ms`],
            ['写入吞吐', `${fmt(r.writeThroughputMBps, 0)} MB/s`],
            ['读取耗时', `${fmt(r.readMs, 0)} ms`],
          ],
          `已释放 ${r.allocatedMB} MB，堆统计由浏览器 GC 异步更新，延迟回收属正常现象。`
        );
      } else if (type === 'network') {
        const r = await runNetworkStress(10);
        state.stress.network = r;
        renderStressResult(
          'network',
          [
            ['平均延迟', `${fmt(r.avgMs, 1)} ms`],
            ['最快 / 最慢', `${fmt(r.minMs, 1)} / ${fmt(r.maxMs, 1)} ms`],
            ['吞吐', `${fmt(r.throughputMBps, 2)} MB/s`],
            ['传输量', `${fmt(r.totalMB, 2)} MB`],
          ],
          `目标资源 ${r.target}，顺序 ${r.count} 次请求（禁用缓存）。`
        );
      }
      toast('压测完成');
    } catch (err) {
      if (resEl) resEl.innerHTML = `<div class="res-error">${escapeHtml(err && err.message ? err.message : err)}</div>`;
      toast('压测失败');
    } finally {
      stressRunning = false;
      buttons.forEach((b) => {
        b.disabled = false;
        b.textContent = '运行';
      });
    }
  }

  /* ---------------- 报告导出 ---------------- */

  function buildReport() {
    const fpsList = state.samples.map((s) => s.fps);
    const navData = getNavPhases();

    return {
      tool: 'PERF LAB',
      generatedAt: new Date().toISOString(),
      page: {
        url: location.href,
        protocol: location.protocol,
        title: document.title,
        language: navigator.language,
      },
      target: {
        url: target.url,
        isFrame: target.isFrame,
        crossOrigin: target.crossOrigin,
      },
      score: computeScore(),
      environment: state.env,
      live: {
        refreshRateHz: state.hz,
        durationSec: +Math.max(0, (Date.now() - state.startedAt) / 1000).toFixed(1),
        totalFrames: state.totalFrames,
        avgFps: +mean(fpsList).toFixed(2),
        minFps: fpsList.length ? +Math.min.apply(null, fpsList).toFixed(2) : null,
        jankFrames: state.jankFrames,
        droppedFrames: state.droppedFrames,
        longTaskCount: state.longTaskCount,
        totalBlockingTimeMs: +state.tbt.toFixed(1),
        cls: +state.cls.toFixed(4),
        loopLagMs: +state.loopLag.toFixed(2),
        loopLagMaxMs: +state.loopLagMax.toFixed(2),
        heapUsedMB: heapUsedMB() == null ? null : +heapUsedMB().toFixed(1),
        heapLimitMB: heapLimitMB() == null ? null : +heapLimitMB().toFixed(0),
        domNodes: domNodes(),
        samples: state.samples,
      },
      navigation: navData
        ? {
            totalMs: +Math.max(0, navData.nav.loadEventEnd - navData.nav.startTime).toFixed(1),
            phases: navData.phases,
          }
        : null,
      resources: state.resources,
      stress: state.stress,
    };
  }

  function exportReport() {
    const data = buildReport();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `perf-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    toast('报告已导出');
  }

  /* ---------------- 诊断目标切换 ---------------- */

  function targetLabel(url) {
    try {
      const u = new URL(url);
      return u.host || u.protocol;
    } catch (err) {
      return url;
    }
  }

  function switchToSelf() {
    target.win = window;
    target.doc = document;
    target.isFrame = false;
    target.crossOrigin = false;
    target.url = location.href;

    const stage = $('#targetStage');
    if (stage) {
      stage.hidden = true;
      stage.classList.remove('fullscreen');
    }
    document.body.classList.remove('stage-lock');
    setText('#btnFullscreen', '全屏预览');
    setText('#targetHint', '默认诊断当前页面 · 载入同源页面可读取其资源与 DOM 数据');
    setText('#modeBadge', location.protocol === 'file:' ? 'FILE 模式 · 资源计时受限' : 'HTTP 模式 · 完整计时');

    observeTarget();
    loadResources(false);
    initNav();
    startCollect();
    toast('已切换为诊断本页');
  }

  function loadTarget() {
    const input = $('#targetUrl');
    const frame = $('#targetFrame');
    const stage = $('#targetStage');
    if (!input || !frame || !stage) return;

    const raw = input.value.trim();
    if (!raw) {
      toast('请输入目标页面地址');
      return;
    }

    let url;
    try {
      url = new URL(raw, location.href).href;
    } catch (err) {
      toast('地址无效');
      return;
    }

    stage.hidden = false;
    stage.classList.remove('fullscreen');
    document.body.classList.remove('stage-lock');
    setText('#btnFullscreen', '全屏预览');
    setText('#targetHint', `正在载入 ${url}`);
    frame.src = url;
    stage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    toast('正在载入目标页面');
  }

  function onTargetFrameLoad() {
    const frame = $('#targetFrame');
    const stage = $('#targetStage');
    if (!frame || !stage || stage.hidden) return;
    const src = frame.src;
    if (!src || src === 'about:blank') return;

    let win = null;
    let doc = null;
    try {
      win = frame.contentWindow;
      doc = win.document;
      void doc.title;
      doc.getElementsByTagName('*').length;
    } catch (err) {
      win = null;
      doc = null;
    }

    if (!win || !doc) {
      target.win = null;
      target.doc = null;
      target.isFrame = true;
      target.crossOrigin = true;
      target.url = src;

      disconnectObservers();
      setText('#targetHint', '跨域页面：仅统计窗口帧率，资源 / DOM / 导航数据不可读取');
      setText('#modeBadge', `跨域预览 · ${targetLabel(src)}`);
      state.resources = [];
      renderResourceCharts();
      setText('#resMeta', '跨域页面无法读取资源计时');
      setText('#navSummary', '跨域页面无法读取导航时序');
      startCollect();
      toast('目标跨域，只能采集窗口帧率');
      return;
    }

    target.win = win;
    target.doc = doc;
    target.isFrame = true;
    target.crossOrigin = false;
    target.url = src;

    setText('#targetHint', `正在诊断 ${targetLabel(src)} · 同源接入`);
    setText('#modeBadge', `诊断目标 · ${targetLabel(src)}`);

    observeTarget();
    loadResources(false);
    initNav();
    startCollect();
    toast('目标页面已接入');
  }

  function toggleFullscreen() {
    const stage = $('#targetStage');
    if (!stage || stage.hidden) {
      toast('请先载入目标页面');
      return;
    }
    const on = stage.classList.toggle('fullscreen');
    document.body.classList.toggle('stage-lock', on);
    setText('#btnFullscreen', on ? '退出全屏' : '全屏预览');
  }

  /* ---------------- 采集控制 ---------------- */

  function resetStats() {
    state.totalFrames = 0;
    state.jankFrames = 0;
    state.droppedFrames = 0;
    state.frameTimes = [];
    state.samples = [];
    state.longTaskCount = 0;
    state.tbt = 0;
    state.cls = 0;
    state.loopLag = 0;
    state.loopLagMax = 0;
    state.startedAt = Date.now();

    if (liveChart) {
      liveChart.setOption({ xAxis: { data: [] }, series: [{ data: [] }, { data: [] }] }, false);
    }
    if (memChart) {
      memChart.setOption({ xAxis: { data: [] }, series: [{ data: [] }, { data: [] }] }, false);
    }
    if (histChart) {
      histChart.setOption({ series: [{ data: [0, 0, 0, 0, 0, 0, 0] }] }, false);
    }
    renderTiles();
  }

  function startCollect() {
    resetStats();
    state.running = true;
    updateBadge();
    renderGauge();
  }

  function stopCollect() {
    state.running = false;
    updateBadge();
  }

  function resetAll() {
    state.running = false;
    resetStats();
    state.stress = {};
    $$('.stress-result').forEach((el) => {
      el.textContent = '未运行';
    });
    loadResources(false);
    initNav();
    updateBadge();
    setText('#timeChip', '未开始采集');
    renderGauge();
    renderHistogram();
  }

  /* ---------------- 交互绑定 ---------------- */

  function toast(message) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  function bindUI() {
    const start = $('#btnStart');
    const stop = $('#btnStop');
    const reset = $('#btnReset');
    const exportBtn = $('#btnExport');
    const refreshRes = $('#btnRefreshRes');

    if (start) start.addEventListener('click', () => {
      startCollect();
      toast('开始采集');
    });
    if (stop) stop.addEventListener('click', () => {
      stopCollect();
      toast('采集已停止');
    });
    if (reset) reset.addEventListener('click', () => {
      resetAll();
      toast('数据已重置');
    });
    if (exportBtn) exportBtn.addEventListener('click', exportReport);
    if (refreshRes) refreshRes.addEventListener('click', () => loadResources(true));

    const loadTargetBtn = $('#btnLoadTarget');
    const selfBtn = $('#btnSelf');
    const fullBtn = $('#btnFullscreen');
    const exitFullBtn = $('#btnExitFull');
    const targetInput = $('#targetUrl');
    const frame = $('#targetFrame');

    if (loadTargetBtn) loadTargetBtn.addEventListener('click', loadTarget);
    if (selfBtn) selfBtn.addEventListener('click', switchToSelf);
    if (fullBtn) fullBtn.addEventListener('click', toggleFullscreen);
    if (exitFullBtn) exitFullBtn.addEventListener('click', toggleFullscreen);
    if (targetInput) {
      targetInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') loadTarget();
      });
    }
    if (frame) frame.addEventListener('load', onTargetFrameLoad);

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const stage = $('#targetStage');
      if (stage && stage.classList.contains('fullscreen')) toggleFullscreen();
    });

    $$('[data-run]').forEach((btn) => {
      btn.addEventListener('click', () => runStress(btn.dataset.run, btn));
    });
  }

  function bindResize() {
    let raf = 0;
    const resize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        Object.keys(charts).forEach((key) => {
          if (charts[key]) charts[key].resize();
        });
      });
    };
    window.addEventListener('resize', resize);
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(resize);
      $$('.chart').forEach((el) => ro.observe(el));
    }
  }

  /* ---------------- 启动 ---------------- */

  function init() {
    if (!window.echarts) {
      const grid = $('#envGrid');
      if (grid) {
        grid.innerHTML =
          '<div class="empty-note">ECharts 未能加载，请确认 debug/vendor/echarts.min.js 存在。</div>';
      }
    }

    const targetInput = $('#targetUrl');
    if (targetInput && !targetInput.value) {
      targetInput.value = location.protocol === 'file:' ? 'http://localhost:5173/' : `${location.origin}/`;
    }

    initEnv();
    initCharts();
    observeTarget();

    // loadEventEnd 在脚本执行时可能仍为 0，等到 load 后再取一次导航时序
    const initSelfNav = () => {
      if (!target.isFrame) initNav();
    };
    if (document.readyState === 'complete') initSelfNav();
    else window.addEventListener('load', initSelfNav, { once: true });
    setTimeout(initSelfNav, 2500);

    bindUI();
    bindResize();

    requestAnimationFrame(frameLoop);
    startLoopLagWatch();

    setTimeout(() => {
      loadResources(false);
      startCollect();
    }, 120);

    setInterval(updateClock, 1000);
    setInterval(renderHistogram, 1000);
    setInterval(renderGauge, 1000);
    setInterval(() => loadResources(false), 15000);
  }

  init();
})();
