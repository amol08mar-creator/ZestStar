import Navbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import ReorderSuggestions from '@/components/landing/ReorderSuggestions';
import TrustStrip from '@/components/landing/TrustStrip';
import PromoCarousel from '@/components/landing/PromoCarousel';
import FeaturedProducts from '@/components/landing/FeaturedProducts';
import RecipesSection from '@/components/landing/RecipesSection';
import FrequentlyBought from '@/components/landing/FrequentlyBought';
import CategoriesGrid from '@/components/landing/CategoriesGrid';
import TrendingProducts from '@/components/landing/TrendingProducts';
import HowItWorks from '@/components/landing/HowItWorks';
import WhyChooseUs from '@/components/landing/WhyChooseUs';
import Testimonials from '@/components/landing/Testimonials';
import EmailSignup from '@/components/landing/EmailSignup';
import AppDownload from '@/components/landing/AppDownload';
import Footer from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <main>
        <HeroSection />
        <ReorderSuggestions />
        <TrustStrip />
        <PromoCarousel />
        <CategoriesGrid />
        <FeaturedProducts />
        <RecipesSection />
        <FrequentlyBought />
        <TrendingProducts />
        <WhyChooseUs />
        <HowItWorks />
        <Testimonials />
        <EmailSignup />
        <AppDownload />
      </main>
      <Footer />
      {/* Bottom nav spacer on mobile */}
      <div className="md:hidden h-16" />
    </div>
  );
}
