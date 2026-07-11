import Image from 'next/image'

export default function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <Image
      src="/logo-512.png"
      alt="PasaBoost"
      width={size}
      height={size}
      className="shrink-0"
      style={{ width: size, height: size, objectFit: 'contain' }}
      priority
    />
  )
}
