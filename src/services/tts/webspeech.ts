// Web Speech fallback — ALWAYS female. Enforced via strict voice picking.
// Runs only if BOTH OpenAI and ElevenLabs fail.

export type WebSpeakOptions = {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: Error) => void;
};

export class WebSpeechTTS {
  private voice: SpeechSynthesisVoice | null = null;

  available(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  private pickVoice(): SpeechSynthesisVoice | null {
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null;

    // Strict female preference — skip any obvious male voices.
    const maleTokens = /(David|Mark|Guy|James|Ryan|George|Daniel|Brian|Tony|Paul|Matthew|Andrew|Richard)/i;

    const rankedFemale = [
      /Sonia.*Online/i,  /Libby.*Online/i,  /Aria.*Online/i,  /Jenny.*Online/i,
      /Emma.*Online/i,   /Ava.*Online/i,
      /Google UK English Female/i, /Google US English.*Female/i,
      /Samantha/i, /Karen/i, /Serena/i, /Moira/i,
      /Microsoft Zira/i, /Microsoft Hazel/i,
      /Female/i,
    ];

    // Tier 1: explicit female patterns
    for (const re of rankedFemale) {
      const v = voices.find((x) => re.test(x.name) || re.test(`${x.lang} ${x.name}`));
      if (v) return v;
    }
    // Tier 2: any English voice that is NOT obviously male
    const notMale = voices.filter((v) => v.lang.startsWith('en') && !maleTokens.test(v.name));
    if (notMale.length) return notMale[0];
    // Last resort
    return voices.find((v) => v.lang.startsWith('en')) ?? voices[0];
  }

  async speak(text: string, opts: WebSpeakOptions = {}): Promise<void> {
    if (!this.available()) throw new Error('Web Speech not available');
    if (!this.voice) this.voice = this.pickVoice();
    // Dynamic import to avoid circular
    const { publishAmp, setActive } = await import('../audio/ampBus');
    return new Promise<void>((resolve, reject) => {
      const utter = new SpeechSynthesisUtterance(text);
      if (this.voice) utter.voice = this.voice;
      utter.rate = 1.15;
      utter.pitch = 1.05;
      utter.volume = 1.0;

      // Fake amp envelope from boundary events + synthetic speech-rate oscillation.
      let fakeAmpRaf = 0;
      const t0 = performance.now();
      const fakeTick = () => {
        const t = (performance.now() - t0) / 1000;
        // 4-5Hz syllable oscillation + slower word envelope
        const syllable = Math.abs(Math.sin(t * 14)) * 0.7;
        const word = (Math.sin(t * 1.8) * 0.5 + 0.5) * 0.5;
        publishAmp(Math.min(1, syllable * word + 0.15));
        fakeAmpRaf = requestAnimationFrame(fakeTick);
      };

      utter.onstart = () => { setActive(true); fakeTick(); opts.onStart?.(); };
      utter.onend = () => {
        cancelAnimationFrame(fakeAmpRaf);
        setActive(false);
        opts.onEnd?.();
        resolve();
      };
      utter.onerror = (e) => {
        cancelAnimationFrame(fakeAmpRaf);
        setActive(false);
        const err = new Error(`WebSpeech: ${e.error}`);
        opts.onError?.(err);
        reject(err);
      };
      speechSynthesis.speak(utter);
    });
  }

  stop() { speechSynthesis.cancel(); }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  speechSynthesis.getVoices();
  speechSynthesis.addEventListener?.('voiceschanged', () => speechSynthesis.getVoices());
}
