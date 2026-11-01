/* 黑胶播放器的音频引擎。
   仓库里没有音频素材，所以曲目用 Web Audio 程序化合成：
   每首是一段循环的琶音 + 一层黑胶底噪（针脚声 + 低通噪声），
   换曲时新旧总线交叉淡入淡出，暂停只是把总线淡到 0，不销毁上下文，
   这样再次播放不会重新走一遍授权与设备初始化。

   进度：程序化音源本身没有「长度」，所以每首曲子自带一个虚拟 duration（秒），
   进度只记录「从歌头开始播了多久」，拖动进度就是按目标秒数换算回琶音的第几步重新起步。
   到结尾后由组件调用 setTrack 切下一首。

   想换成真实歌曲：把 mp3 放进 public/audio，把曲目改成读取 src 的 HTMLAudioElement，
   播放/暂停/换曲/音量/进度五件事的对外接口保持不变即可。 */

export type VinylTrack = {
  title: string
  cn: string
  side: string
  /** 这首歌的「长度」（秒）：驱动进度条、时间显示与自动切下一首 */
  duration: number
  /** 每个音符的间隔（秒） */
  step: number
  wave: OscillatorType
  /** 根音频率（Hz） */
  root: number
  /** 相对根音的半音序列，循环播放 */
  scale: number[]
  /** 每个音符的滤波截止频率 */
  cutoff: number
  amp: number
}

export const vinylTracks: VinylTrack[] = [
  {
    title: 'Night Transit',
    cn: '夜间通勤',
    side: 'SIDE A · 01',
    duration: 96,
    step: 0.62,
    wave: 'triangle',
    root: 220,
    scale: [0, 3, 7, 10, 15, 10, 7, 3],
    cutoff: 1900,
    amp: 0.2
  },
  {
    title: 'Paper Static',
    cn: '纸面杂音',
    side: 'SIDE A · 02',
    duration: 78,
    step: 0.5,
    wave: 'sine',
    root: 261.63,
    scale: [0, 2, 5, 9, 12, 9, 5, 2],
    cutoff: 2400,
    amp: 0.19
  },
  {
    title: 'Late Reply',
    cn: '迟到的回信',
    side: 'SIDE B · 03',
    duration: 112,
    step: 0.72,
    wave: 'triangle',
    root: 174.61,
    scale: [0, 4, 7, 11, 7, 4, 2, 0],
    cutoff: 1100,
    amp: 0.17
  },
  {
    title: 'Accent Drift',
    cn: '强调色漂移',
    side: 'SIDE B · 04',
    duration: 72,
    step: 0.44,
    wave: 'sine',
    root: 196,
    scale: [0, 5, 7, 12, 19, 12, 7, 5],
    cutoff: 1500,
    amp: 0.15
  }
]

const LOOKAHEAD = 0.4

export class VinylEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private analyser: AnalyserNode | null = null
  private noise: GainNode | null = null
  private bus: GainNode | null = null

  private timer = 0
  private nextAt = 0
  private step = 0
  private index = 0
  private volume = 0.7
  private playing = false
  private bins: Uint8Array | null = null

  /** 歌曲时间：posBase 是上一次暂停/换曲时的秒数，posAt 是那次之后开始走的时刻 */
  private posBase = 0
  private posAt = 0
  private unlock: (() => void) | null = null

  get isPlaying() {
    return this.playing
  }

  get trackIndex() {
    return this.index
  }

  /** 当前曲子的虚拟长度（秒） */
  get duration() {
    return vinylTracks[this.index].duration
  }

  /** 浏览器自动播放策略会让 AudioContext 停在 suspended；true 表示声音真的在出 */
  get audible() {
    return Boolean(this.ctx && this.ctx.state === 'running')
  }

  /** 当前播放到的秒数（暂停时停在暂停点） */
  position() {
    const raw = this.playing ? this.posBase + (performance.now() - this.posAt) / 1000 : this.posBase
    return Math.max(0, Math.min(this.duration, raw))
  }

  /** 换曲：在播放中会做一次 0.7s 的交叉淡入淡出，进度回到歌头 */
  setTrack(index: number) {
    const next = Math.max(0, Math.min(vinylTracks.length - 1, index))
    if (next === this.index) return
    this.index = next
    this.posBase = 0
    this.posAt = performance.now()
    if (!this.playing) return
    this.closeBus(0.7)
    this.openBus(0)
    this.startLoop()
  }

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value))
    if (!this.ctx || !this.master) return
    this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.12)
  }

  /** 拖动进度条：按目标秒数换算成琶音的第几步重新起步 */
  seek(value: number) {
    const track = vinylTracks[this.index]
    const target = Math.max(0, Math.min(track.duration, value))
    this.posBase = target
    this.posAt = performance.now()
    if (!this.playing) return
    const ctx = this.ctx
    if (!ctx) return
    const fromStep = Math.floor(target / track.step)
    this.closeBus(0.26)
    this.openBus(fromStep)
    this.startLoop()
  }

  play() {
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    if (this.playing) return

    this.playing = true
    if (this.posBase >= this.duration) this.posBase = 0
    this.posAt = performance.now()

    /* 没有用户手势时浏览器只允许建上下文、不放声：录一次手势，之后自动接上 */
    if (ctx.state === 'suspended') {
      void ctx.resume()
      this.armUnlock(ctx)
    }

    this.master.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.18)
    const track = vinylTracks[this.index]
    this.openBus(Math.floor(this.posBase / track.step))
    this.startNoise()
    this.startLoop()
  }

  pause() {
    if (!this.playing) return
    this.posBase = this.position()
    this.playing = false
    this.stopLoop()
    this.closeBus(0.55)
    const ctx = this.ctx
    if (ctx && this.noise) this.noise.gain.setTargetAtTime(0, ctx.currentTime, 0.18)
  }

  /* 频谱：供组件画柱状图。返回的数组是复用的，调用方只读不存。 */
  levels() {
    const analyser = this.analyser
    if (!analyser) return null
    if (!this.bins || this.bins.length !== analyser.frequencyBinCount) {
      this.bins = new Uint8Array(analyser.frequencyBinCount)
    }
    analyser.getByteFrequencyData(this.bins as unknown as Uint8Array<ArrayBuffer>)
    return this.bins
  }

  dispose() {
    this.stopLoop()
    this.dropUnlock()
    this.bus?.disconnect()
    this.noise?.disconnect()
    this.bus = null
    this.noise = null
    const ctx = this.ctx
    this.ctx = null
    this.master = null
    this.analyser = null
    this.playing = false
    void ctx?.close()
  }

  /* Internals ------------------------------------------------------------- */

  private ensure() {
    if (this.ctx) return this.ctx
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null

    const ctx = new Ctor()
    const master = ctx.createGain()
    master.gain.value = 0

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.82

    master.connect(analyser)
    analyser.connect(ctx.destination)

    this.ctx = ctx
    this.master = master
    this.analyser = analyser
    return ctx
  }

  /** 浏览器要求先有一次用户手势才允许出声，这里等第一次点击 / 按键 */
  private armUnlock(ctx: AudioContext) {
    if (this.unlock) return
    const unlock = () => {
      this.dropUnlock()
      if (ctx.state === 'suspended') void ctx.resume()
    }
    this.unlock = unlock
    window.addEventListener('pointerdown', unlock, { passive: true })
    window.addEventListener('keydown', unlock)
    window.addEventListener('touchstart', unlock, { passive: true })
  }

  private dropUnlock() {
    const unlock = this.unlock
    if (!unlock) return
    this.unlock = null
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
    window.removeEventListener('touchstart', unlock)
  }

  /** 交叉淡入：每首曲子一条总线，换曲时旧总线淡出后断开 */
  private openBus(fromStep = 0) {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return

    const bus = ctx.createGain()
    bus.gain.value = 0
    bus.connect(master)
    bus.gain.setTargetAtTime(1, ctx.currentTime, 0.22)
    this.bus = bus
    this.step = fromStep
  }

  private closeBus(seconds: number) {
    const ctx = this.ctx
    const bus = this.bus
    if (!ctx || !bus) return
    bus.gain.setTargetAtTime(0, ctx.currentTime, seconds / 3)
    this.bus = null
    window.setTimeout(() => bus.disconnect(), Math.max(400, seconds * 1200))
  }

  private startNoise() {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return

    if (!this.noise) {
      const source = ctx.createBufferSource()
      source.buffer = this.noiseBuffer(ctx)
      source.loop = true

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 2400
      filter.Q.value = 0.4

      const gain = ctx.createGain()
      gain.gain.value = 0

      source.connect(filter)
      filter.connect(gain)
      gain.connect(master)
      source.start()

      this.noise = gain
    }

    this.noise.gain.setTargetAtTime(0.85, ctx.currentTime, 0.3)
  }

  /** 黑胶底噪：连续的低幅噪声 + 稀疏的针脚噼啪 */
  private noiseBuffer(ctx: AudioContext) {
    const length = Math.floor(ctx.sampleRate * 1.8)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.012
    }

    for (let i = 0; i < 40; i += 1) {
      const at = Math.floor(Math.random() * length)
      const amp = 0.06 + Math.random() * 0.18
      for (let j = 0; j < 36; j += 1) {
        const k = at + j
        if (k >= length) break
        data[k] += amp * Math.exp(-j / 8) * (Math.random() * 2 - 1)
      }
    }

    return buffer
  }

  private startLoop() {
    const ctx = this.ctx
    if (!ctx) return
    this.stopLoop()
    this.nextAt = ctx.currentTime + 0.08
    this.tick()
    this.timer = window.setInterval(() => this.tick(), 160)
  }

  private stopLoop() {
    if (this.timer) window.clearInterval(this.timer)
    this.timer = 0
  }

  private tick() {
    const ctx = this.ctx
    const bus = this.bus
    if (!ctx || !bus) return

    const track = vinylTracks[this.index]
    const horizon = ctx.currentTime + LOOKAHEAD
    while (this.nextAt < horizon) {
      this.note(this.nextAt, this.step, bus)
      this.nextAt += track.step
      this.step += 1
    }
  }

  private note(at: number, step: number, bus: GainNode) {
    const ctx = this.ctx
    if (!ctx) return

    const track = vinylTracks[this.index]
    const semitones = track.scale[step % track.scale.length]
    const frequency = track.root * Math.pow(2, semitones / 12)
    const length = track.step * 1.7

    this.voice(at, frequency, length, track.wave, track.cutoff, track.amp, bus)

    /* 每八步垫一个低八度长音，让循环听起来有底 */
    if (step % 8 === 0) {
      this.voice(at, track.root / 2, track.step * 5.2, 'sine', 620, track.amp * 0.55, bus)
    }
  }

  private voice(
    at: number,
    frequency: number,
    length: number,
    wave: OscillatorType,
    cutoff: number,
    amp: number,
    bus: GainNode
  ) {
    const ctx = this.ctx
    if (!ctx) return

    const osc = ctx.createOscillator()
    osc.type = wave
    osc.frequency.value = frequency

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = cutoff
    filter.Q.value = 0.7

    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, at)
    env.gain.exponentialRampToValueAtTime(amp, at + 0.09)
    env.gain.exponentialRampToValueAtTime(0.0001, at + length)

    osc.connect(filter)
    filter.connect(env)
    env.connect(bus)

    /* 播完即断开，长时间循环也不会在音频图里堆着成千上万个废节点 */
    osc.onended = () => {
      osc.disconnect()
      filter.disconnect()
      env.disconnect()
    }

    osc.start(at)
    osc.stop(at + length + 0.05)
  }
}
