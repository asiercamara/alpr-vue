export interface TestMediaItem {
  file: string
  label: string
  type: 'image' | 'video'
}

export const TEST_MEDIA: TestMediaItem[] = [
  { file: '/test/uk-license-plate.jpg', label: 'Porsche 918', type: 'image' },
  { file: '/test/coches-segunda-mano-stinger.jpg', label: 'Kia Stinger', type: 'image' },
  { file: '/test/coches-segunda-mano-skoda-octavia.jpg', label: 'Skoda Octavia', type: 'image' },
  { file: '/test/coches-segunda-mano-picasso.jpg', label: 'Citroën Picasso', type: 'image' },
  { file: '/test/coches-segunda-mano-opirus.jpg', label: 'Kia Opirus', type: 'image' },
  { file: '/test/coches-segunda-mano-octavia.jpg', label: 'Skoda Octavia', type: 'image' },
  { file: '/test/coches-segunda-mano-mazda.jpg', label: 'Mazda MX-5', type: 'image' },
  { file: '/test/coches-segunda-mano-logan.jpg', label: 'Dacia Logan', type: 'image' },
  { file: '/test/coches-segunda-mano-golf.jpg', label: 'Volkswagen Golf', type: 'image' },
  { file: '/test/600.jpg', label: 'SEAT 600', type: 'image' },
  { file: '/test/sample.mp4', label: 'Tráfico urbano', type: 'video' },
  { file: '/test/peaje.mp4', label: 'Peaje autopista', type: 'video' },
  { file: '/test/test.mp4', label: 'Tráfico Madrid', type: 'video' },
]
