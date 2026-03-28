import { act, renderHook, waitFor } from '@testing-library/react'
import * as annotationsApi from '../api/annotations'
import * as liveApi from '../api/live'
import * as photosApi from '../api/photos'
import { useGeminiLiveSession } from '../hooks/useGeminiLiveSession'

const connectSpy = vi.fn()
const closeSpy = vi.fn()

vi.mock('../live/geminiLiveClient', () => ({
  LIVE_FORM_CORRECTION_TOOL: { name: 'request_form_correction' },
  GeminiLiveClient: class {
    isReady = true
    connect = connectSpy
    close = closeSpy
    sendAudioPcmBase64 = vi.fn()
    sendVideoJpegBase64 = vi.fn()
    sendToolResponse = vi.fn()
  },
}))

vi.mock('../live/pcmPlayback', () => ({
  PcmPlaybackScheduler: class {
    resume = vi.fn().mockResolvedValue(undefined)
    playFloat32 = vi.fn()
    interrupt = vi.fn()
    close = vi.fn().mockResolvedValue(undefined)
  },
}))

vi.mock('../live/micPcmStreamer', () => ({
  MicPcmStreamer: class {
    start = vi.fn().mockResolvedValue(undefined)
    stop = vi.fn().mockResolvedValue(undefined)
  },
}))

vi.mock('../live/captureVideoFrame', () => ({
  captureVideoFrameAsJpegBase64: vi.fn(() => 'captured-frame'),
}))

describe('useGeminiLiveSession', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    connectSpy.mockReset()
    closeSpy.mockReset()
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('passes backend systemInstruction into the live client connection', async () => {
    vi.spyOn(liveApi, 'fetchLiveEphemeralToken').mockResolvedValue({
      accessToken: 'token-1',
      liveModel: 'live-model-1',
      systemInstruction: 'server-side system instruction',
      liveContextVersion: 'v1',
      sourceResearchId: null,
      sourceProgressEventIds: [],
      truncated: false,
    })

    const videoRef = { current: null }
    const { result } = renderHook(() =>
      useGeminiLiveSession(videoRef, { skillId: 'skill-1', skillTitle: 'Skill 1' }),
    )

    await act(async () => {
      await result.current.connectCoach({} as MediaStream, null, {
        skillId: 'skill-1',
        skillTitle: 'Skill 1',
      })
    })

    expect(liveApi.fetchLiveEphemeralToken).toHaveBeenCalledWith('skill-1')
    expect(connectSpy).toHaveBeenCalledWith(
      'token-1',
      'live-model-1',
      'server-side system instruction',
      expect.any(Object),
      expect.any(Object),
    )
  })

  it('uploads annotation stills without blocking success when photo upload fails', async () => {
    vi.spyOn(annotationsApi, 'requestFormCorrection').mockResolvedValue({
      imageBase64: 'annotated-image',
      mimeType: 'image/png',
      notes: 'Keep your elbow higher.',
    })
    const uploadSpy = vi
      .spyOn(photosApi, 'uploadPhotoToGooglePhotos')
      .mockRejectedValue(new Error('photos unavailable'))

    const videoRef = { current: {} as HTMLVideoElement }
    const { result } = renderHook(() =>
      useGeminiLiveSession(videoRef, { skillId: 'skill-9', skillTitle: 'Snatch' }),
    )

    await act(async () => {
      await result.current.runManualFormCorrection('elbow')
    })

    await waitFor(() => {
      expect(result.current.correctionImageUrl).toBe('data:image/png;base64,annotated-image')
      expect(result.current.correctionNotes).toBe('Keep your elbow higher.')
    })
    expect(uploadSpy).toHaveBeenCalledWith({
      skillId: 'skill-9',
      imageBase64: 'annotated-image',
      mimeType: 'image/png',
      label: 'Snatch manual form check',
      kind: 'annotation',
      description: 'Keep your elbow higher.',
    })
    expect(warnSpy).toHaveBeenCalledWith(
      'Google Photos upload skipped:',
      expect.any(Error),
    )
    expect(result.current.coachError).toBeNull()
  })
})
