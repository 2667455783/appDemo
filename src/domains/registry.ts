import { englishManifest } from '@/domains/english/manifest'
import { exploreManifest } from '@/domains/explore/manifest'
import { medicalManifest } from '@/domains/medical/manifest'
import { programmingManifest } from '@/domains/programming/manifest'
import type { DomainId, DomainManifest } from '@/domains/types'

const DOMAINS: Record<DomainId, DomainManifest> = {
  english: englishManifest,
  programming: programmingManifest,
  medical: medicalManifest,
  explore: exploreManifest,
}

const ORDER: DomainId[] = ['english', 'programming', 'medical', 'explore']

export function listDomains(): DomainManifest[] {
  return ORDER.map((id) => DOMAINS[id])
}

export function listEnabledDomains(): DomainManifest[] {
  return listDomains().filter((d) => d.enabled)
}

export function getDomain(id: DomainId): DomainManifest {
  return DOMAINS[id] ?? DOMAINS.english
}

export function isDomainId(value: string): value is DomainId {
  return value in DOMAINS
}

export { DOMAINS }
