const sources = {
  ink: '/isso-logo-ink.png',
  white: '/isso-logo-white.png',
  orange: '/isso-logo-orange.png',
} as const

type IssoLogoProps = {
  variant?: keyof typeof sources
  className?: string
}

export default function IssoLogo({ variant = 'ink', className = '' }: IssoLogoProps) {
  return <img src={sources[variant]} alt="ISSO" className={className} />
}
