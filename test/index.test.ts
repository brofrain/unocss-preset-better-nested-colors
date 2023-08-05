import { uno, unoAttributify } from './helpers'

describe('index', () => {
  it('should generate style without variants', async () => {
    const { css } = await uno.generate(
      '<div class="text-primary" />' + '<div class="bg-secondary" />',
    )

    expect(css).toContain(
      '.text-primary{--un-text-opacity:1;color:rgba(245,245,245,var(--un-text-opacity));}',
    )
    expect(css).toContain(
      '.bg-secondary{--un-bg-opacity:.8;background-color:rgba(40,40,40,var(--un-bg-opacity));}',
    )
  })

  it('should generate nested style without variants', async () => {
    const { css } = await uno.generate(
      '<div class="text-secondary-interactive" />' +
        '<div class="bg-accent-interactive text-accent-interactive-contrast" />',
    )

    expect(css).toContain(
      '.text-secondary-interactive{--un-text-opacity:.8;color:rgba(40,40,40,var(--un-text-opacity));}',
    )
    expect(css).toContain(
      '.bg-accent-interactive{--un-bg-opacity:1;background-color:rgba(66,184,131,var(--un-bg-opacity));}',
    )
    expect(css).toContain(
      '.text-accent-interactive-contrast{--un-text-opacity:1;color:rgba(255,255,255,var(--un-text-opacity));}',
    )
  })

  it('should generate style with variants', async () => {
    const { css } = await uno.generate(
      '<div class="border-primary" />' +
        '<span class="text-secondary"> abc </span>' +
        '<div class="bg-accent" />',
    )

    expect(css).toContain(
      '.border-primary{--un-border-opacity:1;border-color:rgba(245,245,245,var(--un-border-opacity));}',
    )
    expect(css).toContain(
      '.dark .border-primary{--un-border-opacity:1;border-color:rgba(26,26,26,var(--un-border-opacity));}',
    )

    expect(css).toContain(
      '.text-secondary{--un-text-opacity:.8;color:rgba(40,40,40,var(--un-text-opacity));}',
    )
    expect(css).toContain(
      '.dark .text-secondary{--un-text-opacity:.9;color:rgba(250,250,250,var(--un-text-opacity));}',
    )

    expect(css).toContain(
      '.bg-accent{--un-bg-opacity:1;background-color:rgba(66,184,131,var(--un-bg-opacity));}',
    )
  })

  it('should generate nested style with variants', async () => {
    const { css } = await uno.generate(
      '<div class="text-secondary-interactive" />' +
        '<div class="bg-accent-interactive text-accent-interactive-contrast" />',
    )

    expect(css).toContain(
      '.text-secondary-interactive:hover{--un-text-opacity:1;color:rgba(66,184,131,var(--un-text-opacity));}',
    )
    expect(css).toContain(
      '.dark .text-secondary-interactive{--un-text-opacity:.9;color:rgba(250,250,250,var(--un-text-opacity));}',
    )
    expect(css).toContain(
      '.text-secondary-interactive:hover{--un-text-opacity:1;color:rgba(66,184,131,var(--un-text-opacity));}',
    )

    expect(css).toContain(
      '.bg-accent-interactive:hover{--un-bg-opacity:1;background-color:rgba(51,160,111,var(--un-bg-opacity));}',
    )
    expect(css).toContain(
      '.dark .bg-accent-interactive:hover{--un-bg-opacity:1;background-color:rgba(66,211,146,var(--un-bg-opacity));}',
    )

    expect(css).toContain(
      '.text-accent-interactive-contrast:disabled{--un-text-opacity:1;color:rgba(241,241,241,var(--un-text-opacity));}',
    )
    expect(css).toContain(
      '.dark .text-accent-interactive-contrast{--un-text-opacity:1;color:rgba(51,51,51,var(--un-text-opacity));}',
    )
    expect(css).toContain(
      '.dark .text-accent-interactive-contrast:disabled{--un-text-opacity:1;color:rgba(136,136,136,var(--un-text-opacity));}',
    )
  })

  it('should NOT generate style for incorrect syntax', async () => {
    const primaryColorRgb = '245,245,245'

    {
      // making sure that `.toContain(primaryColorRgb)` can detect the generated style
      const { css } = await uno.generate('<div class="bg-primary" />')
      expect(css).toContain(primaryColorRgb)
    }

    const { css } = await uno.generate(
      '<div class="primary" />' +
        '<div class="bgprimary" />' +
        '<div class="bg--primary" />' +
        '<div class="bg-[primary]" />' +
        '<div class="bg primary" />' +
        '<div class="hover:bg--primary" />' +
        '<div class="hover:bg primary" />' +
        '<div class="primary-bg" />' +
        '<div class="bg-primary-" />' +
        '<div class="bg-primary-abc" />',
    )

    expect(css).not.toContain(primaryColorRgb)
  })

  describe('Attributify Mode', () => {
    it('should generate style for attributes, if Attributify Mode is enabled', async () => {
      const { css } = await unoAttributify.generate(
        '<div attributify:text-primary />',
      )

      expect(css).toContain(
        '[attributify\\:text-primary=""]{--un-text-opacity:1;color:rgba(245,245,245,var(--un-text-opacity));}',
      )
      expect(css).toContain(
        '.dark [attributify\\:text-primary=""]{--un-text-opacity:1;color:rgba(26,26,26,var(--un-text-opacity));}',
      )
    })

    it('should NOT generate style for attributes, if Attributify Mode is disabled', async () => {
      const { css } = await uno.generate('<div attributify:text-primary />')
      expect(css).not.toContain('text-primary')
    })
  })
})
