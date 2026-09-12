import { Audio } from 'expo-av';
import { effectUri, SfxName } from './synth';

/**
 * Tiny chiptune player backed by `expo-av`. Pure data-URI WAVs, pre-loaded
 * lazily. Written defensively so it works across expo-av versions and
 * degrades to silence if the module is unavailable.
 */
class SoundFX {
  private pool = new Map<SfxName, any>();
  private ready = false;

  constructor(public muted = false) {}

  async ensure(): Promise<void> {
    if (this.ready) return;
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    } catch {
      // continue silently
    }
    this.ready = true;
  }

  async play(name: SfxName): Promise<void> {
    if (this.muted) return;
    try {
      await this.ensure();
      let obj = this.pool.get(name);
      if (!obj) {
        const created: any = await Audio.Sound.createAsync({ uri: effectUri(name) });
        const inner = created?.sound ?? created;
        // expo-av >= 15 nests another SoundObject under `sound`
        obj = inner?.sound ?? inner;
        this.pool.set(name, obj);
      }
      if (obj?.replayAsync) {
        await obj.replayAsync();
      } else if (obj?.playAsync) {
        await obj.playAsync();
      }
    } catch {
      // audio is best-effort; never crash the game
    }
  }
}

export const sfx = new SoundFX();