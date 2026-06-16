import { ClosingCta } from "./ClosingCta"
import { FeatureSection } from "./FeatureSection"
import { LandingHero } from "./Hero"
import styles from "./Landing.module.css"
import { LandingFooter } from "./LandingFooter"
import { LandingNav } from "./LandingNav"
import { ProvenRoi } from "./ProvenRoi"

export function LandingPage() {
  return (
    <main className={styles.page} data-testid="landing-redesign" id="top">
      <LandingNav />
      <LandingHero />
      <FeatureSection />
      <ProvenRoi />
      <ClosingCta />
      <LandingFooter />
    </main>
  )
}
