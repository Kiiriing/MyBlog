declare module 'gsap/SplitText' {
  export class SplitText {
    constructor(target: any, vars?: any)
    chars: HTMLElement[]
    words: HTMLElement[]
    lines: HTMLElement[]
    masks: HTMLElement[]
    revert(): void
  }
}

declare module 'gsap/ScrollTrigger' {
  export const ScrollTrigger: any
}
