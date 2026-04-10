import { describe, it, expect } from 'vitest'
import { TEST_MEDIA } from '@/data/testMedia'

describe('testMedia', () => {
  it('has 13 items', () => {
    expect(TEST_MEDIA).toHaveLength(13)
  })

  it('has 10 image items', () => {
    const images = TEST_MEDIA.filter((m) => m.type === 'image')
    expect(images).toHaveLength(10)
  })

  it('has 3 video items', () => {
    const videos = TEST_MEDIA.filter((m) => m.type === 'video')
    expect(videos).toHaveLength(3)
  })

  it('each item has required fields', () => {
    for (const item of TEST_MEDIA) {
      expect(item).toHaveProperty('file')
      expect(item).toHaveProperty('label')
      expect(item).toHaveProperty('type')
      expect(['image', 'video']).toContain(item.type)
      expect(item.file).toBeTruthy()
      expect(item.label).toBeTruthy()
    }
  })

  it('image files start with /test/ and end with .jpg', () => {
    const images = TEST_MEDIA.filter((m) => m.type === 'image')
    for (const item of images) {
      expect(item.file).toMatch(/^\/test\/.+\.jpg$/)
    }
  })

  it('video files start with /test/ and end with .mp4', () => {
    const videos = TEST_MEDIA.filter((m) => m.type === 'video')
    for (const item of videos) {
      expect(item.file).toMatch(/^\/test\/.+\.mp4$/)
    }
  })

  it('descriptive labels are provided for all items', () => {
    for (const item of TEST_MEDIA) {
      expect(item.label.length).toBeGreaterThan(0)
    }
  })
})
