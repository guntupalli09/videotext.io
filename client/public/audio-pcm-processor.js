/**
 * Audio Worklet Processor — off-main-thread PCM capture for live transcription.
 *
 * Runs on the dedicated audio rendering thread (not the main/UI thread), which means:
 *  - Zero UI jank even under heavy load
 *  - Tighter timing guarantees for audio streaming
 *  - No impact from garbage collection pauses
 *
 * Buffers 128-sample audio rendering quanta into a larger chunk before posting
 * to the main thread via a zero-copy Transferable ArrayBuffer.
 *
 * Default targetSize = 2048 samples ≈ 46ms at 44.1kHz / 128ms at 16kHz.
 * Tune via processorOptions.targetSize when creating the AudioWorkletNode.
 */
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options)
    this._targetSize = (options && options.processorOptions && options.processorOptions.targetSize) || 2048
    this._buffer = new Float32Array(this._targetSize)
    this._writePos = 0
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0]
    if (!channel) return true

    let i = 0
    while (i < channel.length) {
      const space = this._targetSize - this._writePos
      const toCopy = Math.min(space, channel.length - i)

      this._buffer.set(channel.subarray(i, i + toCopy), this._writePos)
      this._writePos += toCopy
      i += toCopy

      if (this._writePos >= this._targetSize) {
        // Zero-copy transfer: main thread receives the ArrayBuffer, we allocate fresh one
        this.port.postMessage(this._buffer.buffer, [this._buffer.buffer])
        this._buffer = new Float32Array(this._targetSize)
        this._writePos = 0
      }
    }

    return true // keep processor alive
  }
}

registerProcessor('pcm-capture', PcmCaptureProcessor)
