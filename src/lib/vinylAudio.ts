/* 黑胶播放器的音频引擎。
   仓库里没有音频素材，所以曲目用 Web Audio 程序化合成：
   每首是一段循环的琶音 + 一层黑胶底噪（针脚声 + 低通噪声），
   换曲时新旧总线交叉淡入淡出，暂停只是把总线淡到 0，不销毁上下文，
   这样再次播放不会重新走一遍授权与设备初始化。

   想换成真实歌曲：把 mp3 放进 public/audio，把曲目改成读取 src 的 HTMLAudioElement，
   播放/暂停/换曲/音量四件事的对外接口保持不变即可。 */

export type VinylTrack = {
  title: string
  cn: string
  side: string
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

  get isPlaying() {
    return this.playing
  }

  get trackIndex() {
    return this.index
  }

  /** 换曲：在播放中会做一次 0.7s 的交叉淡入淡出 */
  setTrack(index: number) {
    const next = Math.max(0, Math.min(vinylTracks.length - 1, index))
    if (next === this.index) return
    this.index = next
    if (!this.playing) return
    this.closeBus(0.7)
    this.openBus()
    this.startLoop()
  }

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value))
    if (!this.ctx || !this.master) return
    this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.12)
  }

  play() {
    const ctx = this.ensure()
    if (!ctx || !this.master) return

    this.playing = true
    if (ctx.state === 'suspended') void ctx.resume()

    this.master.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.18)
    this.openBus()
    this.startNoise()
    this.startLoop()
  }

  pause() {
    if (!this.ctx || !this.playing) {
      this.playing = false
      return
    }
    this.playing = false
    this.stopLoop()
    this.closeBus(0.55)
    if (this.noise) this.noise.gain.setTargetAtTime(0, this.ctx.currentTime, 0.18)
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

  /** 交叉淡入：每首曲子一条总线，换曲时旧总线淡出后断开 */
  private openBus() {
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master) return

    const bus = ctx.createGain()
    bus.gain.value = 0
    bus.connect(master)
    bus.gain.setTargetAtTime(1, ctx.currentTime, 0.22)
    this.bus = bus
    this.step = 0
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
