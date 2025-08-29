import { HeroSection } from '@/components/HeroSection';
import { FeaturesSection } from '@/components/FeaturesSection';
import { ComparisonSection } from '@/components/ComparisonSection';
import { DemoSection } from '@/components/DemoSection';

export default function Home() {
  return (
    <div className="bg-black text-white">
      <HeroSection />
      <FeaturesSection />
      <ComparisonSection />
      <DemoSection />
    </div>
  );
}
